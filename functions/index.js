
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
  file: 'input8Puzzle3_20.txt',
  maxTime: 300,
  outputLen: 6,
}, {
  file: 'input8Puzzle4_20.txt',
  maxTime: 300,
  outputLen: 20,
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
          return runPerf(filenames.source);
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
    console.log('Saving report', JSON.stringify(report, null, 2));
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

function runPerf(file) {
  const report = {};
  report.data = {};
  return readInput('puzzle8/input8Puzzle3_20.txt').then(input => {
    const puzzle8 = require(file);

    input.board = input.data;
    report.data.time20_4 = timeBest(puzzle8.bind(null, input), 6);
    report.data.time20_4.status = strPerfReport(report.data.time20_4);

    let strReport = 'Performance Tests:\n';
    strReport += 'Tests with size 3 board with 20 shuffles\n';
    strReport += '     Time: ' + report.data.time20_4.status + '\n';
    report.strReport = strReport;
    return report;
  });
}

function strPerfReport(report) {
  if (!report) {
    return "Not run";
  }

  if (!report.success) {
    return "Failed";
  }

  if (report.timeout) {
    return "Timeout (>1 sec)";
  }

  return report.time + ' milliseconds';
}

function timeBest(command, expected) {
  const times = [];
  let success = true;
  let timeout = false;

  // Find best of 5
  for (let i = 0; i < 5; i++) {
    let result = time(command, expected);

    if (!result.success) {
      success = false;
      break;
    }

    if (result.time > 1000) {
      timeout = true;
      break;
    }

    times.push(result.time);
  }

  console.log('times', times);

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

  console.log('output len', output.length);
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
