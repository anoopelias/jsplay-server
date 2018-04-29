const functions = require('firebase-functions');

const fs = require('mz/fs');
const Jasmine = require('jasmine');
const ReadWriteLock = require('rwlock');
const tempy = require('tempy');

const lock = new ReadWriteLock();
const config = {
  questions: [{
    name: 'collinear',
    description: 'Collinear points',
  }, {
    name: 'puzzle8',
    description: '8 Puzzle',
  }]

};

exports.ping = functions.https.onRequest((req, res) => {
  const name = req.query.name || '<Unknown>';

  console.log('Responding to ping from', name);
  return res.send('Response to ping for ' + name + ' at ' + new Date());
});

exports.submit = functions.https.onRequest((req, res) => {
  const name = req.query.name || '<Unknown>';
  const fileString = {};
  for (let i=0; i<config.questions.length; i++) {
    let question = config.questions[i];
    fileString[question.name] = req.body[question.name];
  }

  // Run one at a time
  lock.writeLock(release => {
    process(fileString, name).then((response) => {
      release();
      return res.send(response);
    }).catch(() => {
      return release();
    });
  });

});

function process(files, name) {
  let report = '\nSubmission report for ' + name + ' generated at ' + new Date() + '\n\n';
  console.log('Processing for', name);

  let chain = Promise.resolve();

  for (let i=0; i<config.questions.length; i++) {
    let question = config.questions[i];
    let fileString = files[question.name];

    if (fileString) {
      const temp = tempy.directory();
      const specFileName = question.name + '.test.js';
      const libFileName = question.name + '.lib.js';
      const tempFile = temp + '/' + question.name + '.js';
      const tempSpecFile = temp + '/' + specFileName;
      const tempLibFile = temp + '/' + libFileName;

      chain = chain.then(() => {
        report += question.description + ':\n\n';

        const file = Buffer.from(fileString, 'base64').toString('utf8');
        console.log('Writing file', tempFile);
        return fs.writeFile(tempFile, file);
      }).then(() => {
        console.log('Copying spec', specFileName);
        return copyFile(specFileName, tempSpecFile);
      }).then(() => {
        console.log('Copying lib', specFileName);
        return copyFile(libFileName, tempLibFile);
      }).then(() => {
        return runSpec(question, tempSpecFile);

      }).then((specReport) => {

        report += specReport.strReport;
        if (specReport.status === 'passed') {
          // return runPerf(question);
        }
        return;
      }).then((perfReport) => {
        if (perfReport) {
          report += perfReport.strReport;
        }
        return;
      });
    }
  }

  return chain.then(() => {
    return report;
  }).catch((err) => {
    if (err.message) {
      return 'Error: ' + err.message;
    } else {
      return 'Unknown Error';
    }
  });
}

function copyFile(source, target) {
  var rd = fs.createReadStream(source);
  var wr = fs.createWriteStream(target);
  return new Promise(function(resolve, reject) {
    rd.on('error', reject);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  }).catch(function(error) {
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
  return new Promise(function(resolve, reject) {

    const jasmine = new Jasmine();
    const reporter = new JasmineReporter();
    jasmine.randomizeTests(false);

    reporter.onDone = function() {
      console.log('Jasmine report done');
      let report = {
        report: reporter.report,
        status: reporter.overallStatus,
      };

      report.strReport = strSpecReport(report);
      console.log('Resolving runSpec');
      resolve(report);
    };

    jasmine.completionReporter.onComplete(function() {});
    jasmine.addReporter(reporter);
    console.log('Running spec', specFile);
    jasmine.execute([specFile]);
  });
}

function cfl(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
