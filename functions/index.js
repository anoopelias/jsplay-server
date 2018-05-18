
const fs = require('mz/fs');
const path = require('path');
const Jasmine = require('jasmine');
const ReadWriteLock = require('rwlock');
const tempy = require('tempy');
const rimraf = require('rimraf');
const Perf = require('performance-node');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const lock = new ReadWriteLock();
const config = {
  questions: [{
    name: 'puzzle8',
    description: '8 Puzzle',
    files: ['puzzle8.lib.js'],
  }]

};

const perfConfig = [{
  number: 1,
  file: 'input8Puzzle3_20.txt',
  description: 'size 3 board',
  maxTime: 10,
  outputLen: 6,
}, {
  number: 2,
  file: 'input8Puzzle4_20.txt',
  description: 'size 4 board',
  maxTime: 300,
  outputLen: 10,
}];

exports.ping = functions.https.onRequest((req, res) => {
  const name = req.query.name || '<Unknown>';
  const time = new Date();

  console.log('Responding to ping from', name);
  return db.collection('pings').add({
    name: name,
    time: time,
  }).then((doc) => {
    return res.send('Response to ping for ' + name + ' at ' + time);
  });
});

exports.submit = functions.https.onRequest((req, res) => {
  const name = req.query.name || '<Unknown>';
  const fileString = {};
  for (let i=0; i<config.questions.length; i++) {
    let question = config.questions[i];
    fileString[question.name] = Buffer.from(req.body[question.name], 'base64')
      .toString('utf8');
  }

  return db.collection('submissions').add({
    name: name,
    time: new Date(),
    fileString: fileString,
  }).then(submissionDoc => {
    // Run one at a time
    return lock.writeLock(release => {
      process(fileString, name, submissionDoc.id).then((response) => {
        release();
        return res.send(response);
      }).catch(() => {
        return release();
      });
    });
  });


});

exports.leaderboard = functions.https.onRequest((req, res) => {
  return db.collection('reports')
    .get().then((reports) => {
      let leaders = [];
      let topLeaders = [];
      perfConfig.forEach(() => {
        leaders.push([])
        topLeaders.push([])
      });

      reports.forEach(reportDoc => {
        let reportData = reportDoc.data();
        let report = reportData.report;

        if (report.puzzle8.spec.status === 'passed') {
          report.puzzle8.perf.forEach((levelReport, index) => {
            if (levelReport.status) {
              levelReport.name = reportData.name;
              leaders[index].push(levelReport);
            }
          });
        }
      });


      leaders.forEach((level, levelIndex) => {
        level.sort((levelReportA, levelReportB) => {
          return levelReportA.time.time - levelReportB.time.time;
        });

        console.log('level ' + levelIndex + ':' + JSON.stringify(level, null, 2));
        let topLeaderNames = [];
        for (let i=0; i<level.length; i++) {
          let levelReport = level[i];
          if (topLeaderNames.indexOf(levelReport.name) === -1) {
            topLeaderNames.push(levelReport.name);
            topLeaders[levelIndex].push(levelReport.name + " Time:" +
              round(levelReport.time.time, 3) + ' milliseconds');

            if (topLeaderNames.length >= 5) {
              break;
            }
          }
        }
      });

      console.log('topLeaders' + JSON.stringify(topLeaders, null, 2));
      let response = topLeaders.map((level, index) => {
        return 'Level ' + (index + 1) + '\n' + level.join('\n');
      }).join('\n\n');
      return res.send('puzzle8\n\n' + response);
    });
});

function createWorkspace(fileString, question) {
  const temp = tempy.directory();

  const sourceFile = path.join(temp, question.name + '.js');
  const specFileName = question.name + '.test.js';
  const specFile = path.join(temp, specFileName);
  const specFileSource = path.join(question.name, specFileName);
  const proms = [];
  const files = [sourceFile, specFile];

  proms.push(fs.writeFile(sourceFile, fileString));
  proms.push(copyFile(specFileSource, specFile));

  for (let file of question.files) {
    let source = path.join(question.name, file);
    let target = path.join(temp, file);
    proms.push(copyFile(source, target));

    files.push(target);
  }

  return Promise.all(proms).then(() => {
    return {
      temp: temp,
      spec: specFile,
      source: sourceFile,
      files: files,
    };
  });
}

function cleanup(filenames) {
  return new Promise((resolve, reject) => {
    if (filenames) {
      // Unload them from memory
      for (let file of filenames.files) {
        delete require.cache[require.resolve(file)];
      }

      rimraf(filenames.temp, resolve);
    } else {
      resolve();
    }
  });
}

function process(files, name, id) {
  let reportStr = '\nSubmission report for ' + name + ' generated at ' + new Date() + '\n\n';
  let report = {};
  console.log('Processing for', name);

  let chain = Promise.resolve();
  let filenames;

  for (let i=0; i<config.questions.length; i++) {
    let question = config.questions[i];
    let fileString = files[question.name];

    if (fileString) {

      chain = chain.then(() => {
        report[question.name] = {};
        reportStr += question.description + ':\n\n';

        return createWorkspace(fileString, question);
      }).then((files) => {
        filenames = files;
        return runSpec(question, filenames.spec);
      }).then((specReport) => {
        reportStr += specReport.strReport;
        report[question.name].spec = specReport.data;

        if (specReport.data.status === 'passed') {
          return runPerf(question, filenames.source);
        }
        return 0;
      }).then((perfReport) => {
        if (perfReport) {
          report[question.name].perf = perfReport.data;
          reportStr += perfReport.strReport;
        }
        return;
      }).then(() => {
        return cleanup(filenames);
      });
    }
  }

  return chain.then(() => {
    return db.collection('reports').add({
      name: name,
      submissionId: id,
      report: report
    });
  }).then(() => reportStr)
  .catch((err) => {

    console.log(err);
    let message = 'Unknown Error';
    if (err.message) {
      message = 'Error: ' + err.message;
    }

    return db.collection('reports').add({
      name: name,
      submissionId: id,
      errMessage: message,
    }).then(() => message);
  });
}

function readInput(filename) {
  return fs.readFile(filename, 'utf8').then(input => {
    const lines = input.split('\n');
    const length = parseInt(lines.shift());
    let data = [];

    for (let i = 0; i < length; i++) {
      let line = lines[i];
      data.push(line.split(' ')
        .map(val => parseInt(val.trim()))
        .filter(val => !isNaN(val)));
    }
    return {
      data: data,
      length: length,
    };
  });
}

function runPerf(question, file) {
  const report = {};

  const func = require(file);
  report.strReport = 'Performance Tests:\n';
  report.data = [];

  let chain = Promise.resolve(true);

  for (let i=0; i<perfConfig.length; i++) {
    chain = chain.then(continued => {
      if (continued) {
        return runPerfLevel(question, perfConfig[i], func).then(levelReport => {
          report.data.push(levelReport);
          report.strReport += levelReport.strReport;
          return levelReport.status;
        });
      }

      return false;
    });
  }

  return chain.then(() => report);
}

function runPerfLevel(question, level, func) {
  return readInput(question.name + '/' + level.file).then(input => {
    input.board = input.data;
    let levelReport = {};

    levelReport.number = level.number;
    levelReport.time = timeBest(func.bind(null, input), level);
    levelReport.status = levelReport.time.success && !levelReport.time.timeout;

    levelReport.strReport = 'Level ' + level.number +
      ': Tests with ' + level.description + '\n' +
      '     Time: ' + strTimeReport(levelReport.time, level.maxTime) + '\n';

    return levelReport;
  });
}

function strTimeReport(report, maxTime) {
  if (!report) {
    return "Not run";
  }

  if (!report.success) {
    return "Failed";
  }

  if (report.timeout) {
    return "Timeout (>" + maxTime + " ms)";
  }

  return report.time + ' milliseconds';
}

function timeBest(command, level) {
  const times = [];
  let success = true;
  let timeout = false;

  // Find best of 5
  for (let i = 0; i < 5; i++) {
    let result = time(command, level.outputLen);
    times.push(result.time);

    if (!result.success) {
      success = false;
      break;
    }

    if (result.time > level.maxTime) {
      timeout = true;
      break;
    }

  }

  return {
    time: Math.min.apply(null, times),
    success: success,
    timeout: timeout,
  };
}

function time(command, expected) {
  let success = false;
  const timeline = new Perf();

  timeline.mark('A');
  const output = command();
  timeline.mark('B');
  timeline.measure('A to B', 'A', 'B');
  const measure = timeline.getEntriesByName('A to B')[0];

  if (output && output.length === expected) {
    success = true;
  }

  return {
    time: measure.duration,
    success: success,
  }
}

function copyFile(source, target) {

  let rd = fs.createReadStream(source);
  let wr = fs.createWriteStream(target);
  return new Promise((resolve, reject) => {
    rd.on('error', reject);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  }).catch((error) => {
    rd.destroy();
    wr.end();
    throw error;
  });
}

function JasmineReporter() {
  this.report = [];

  this.specDone = function(spec) {
    this.report.push({
      name: spec.fullName,
      status: spec.status,
    });
  };

  this.jasmineDone = function(result) {
    this.overallStatus = result.overallStatus;
    if (this.onDone) {
      this.onDone();
    }
  };
}

function strSpecReport(specReport) {
  let str = 'Functional Tests:\n';

  for (let spec of specReport.report) {
    str += cfl(spec.status) + ' : ' + spec.name + '\n';
  }
  str += 'Functional Tests ' + cfl(specReport.status) + '\n\n';

  return str;
}

function runSpec(question, specFile) {
  return new Promise((resolve, reject) => {

    const jasmine = new Jasmine();
    const reporter = new JasmineReporter();
    jasmine.randomizeTests(false);

    reporter.onDone = function() {
      let report = {};
      report.data = {
        report: reporter.report,
        status: reporter.overallStatus,
      };

      report.strReport = strSpecReport(report.data);
      resolve(report);
    };

    jasmine.completionReporter.onComplete(() => {});
    jasmine.addReporter(reporter);
    jasmine.execute([specFile]);
  });
}

function cfl(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function round(value, places) {
  let num = Math.pow(10, places);
  return Math.round(value * num) / num;
}
