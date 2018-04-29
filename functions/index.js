const functions = require('firebase-functions');

const fs = require('mz/fs');
const Jasmine = require('jasmine');
const ReadWriteLock = require('rwlock');

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

      chain = chain.then(() => {
        report += question.description + ':\n\n';

        const file = Buffer.from(fileString, 'base64').toString('utf8');
        return fs.writeFile('web/' + question.name + '.js', file);

      }).then(() => {
        return runSpec(question);

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

function runSpec(question) {
  return new Promise(function(resolve, reject) {
    // Clear npm cache to enable running again
    delete require.cache[require.resolve('./web/' + question.name + '.test.js')];
    delete require.cache[require.resolve('./web/' + question.name + '.js')];

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
    jasmine.execute(['./web/' + question.name + '.test.js']);
  });
}

function cfl(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
