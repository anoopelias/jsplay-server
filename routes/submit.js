const fs = require('mz/fs');
const Jasmine = require('jasmine');
const ReadWriteLock = require('rwlock');
const {
  performance
} = require('perf_hooks');

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

module.exports = async function(req, res) {
  const name = req.query.name || '<Unknown>';
  const fileString = {};
  for (let i=0; i<config.questions.length; i++) {
    let question = config.questions[i];
    fileString[question.name] = req.body[question.name];
  }

  // Run one at a time
  lock.writeLock(async function(release) {
    const response = await process(fileString, name);
    release();
    res.send(response);
  });

};

async function process(files, name) {
  try {
    console.log('Submitting for', name);
    let report = '\nSubmission report for ' + name + ' generated at ' + new Date() + '\n\n';

    for (let i=0; i<config.questions.length; i++) {
      let question = config.questions[i];
      let fileString = files[question.name];

      if (fileString) {
        report += question.description + ':\n\n';

        const file = Buffer.from(fileString, 'base64').toString('utf8');
        await fs.writeFile('web/' + question.name + '.js', file);

        const specReport = await runSpec(question);
        report += specReport.strReport;

        if (specReport.status === 'passed') {
          const perfReport = await runPerf(question);
          report += perfReport.strReport;
        }
      }
    }

    return report;
  } catch (err) {
    if (err.message) {
      return 'Error: ' + err.message;
    } else {
      return 'Unknown Error';
    }
  }
}

function cfl(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function strAccurateReport(report) {
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

async function readCollinearInput(filename) {
  const input = await fs.readFile(filename, 'utf8');
  const lines = input.split('\n');
  const length = parseInt(lines.shift());
  console.log('length', length);
  let points = [];

  for (let i = 0; i < length; i++) {
    let line = lines[i];
    let values = line.split(',').map(val => val.trim());
    points.push({
      x: parseFloat(values[0]),
      y: parseFloat(values[1]),
    })
  }
  return {
    points: points,
    length: length,
  };
}

async function readInput(filename) {
  const input = await fs.readFile(filename, 'utf8');
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
}

function time(command) {
  const collinear = require('../web/collinear');

  const startTime = +new Date();
  const output = command();
  const simpleTime = new Date() - startTime;

  return simpleTime;
}

function timeAccurate(command, expected) {
  let success = false;
  performance.clearEntries('measure');
  performance.clearMarks();

  performance.mark('A');
  const output = command();
  performance.mark('B');
  performance.measure('A to B', 'A', 'B');

  const measure = performance.getEntriesByName('A to B')[0];

  console.log('output len', output.length);
  if (output && output.length === expected) {
    success = true;
  }

  return {
    time: measure.duration,
    success: success,
  }
}

function timeAccurateBest(command, expected) {
  const times = [];
  let success = true;
  let timeout = false;

  // Find best of 10
  for (let i = 0; i < 10; i++) {
    let result = timeAccurate(command, expected);

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

async function runPerf(question) {
  switch(question.name) {
    case 'collinear' :
      return await runPerfCollinear();
    case 'puzzle8' :
      return await runPerf8Puzzle();
  }
}

async function runPerf8Puzzle() {
  const report = {};
  const input = await readInput('web/input8Puzzle20.txt');
  const puzzle8 = require('../web/puzzle8');

  input.board = input.data;
  report.time20 = timeAccurateBest(puzzle8.bind(null, input), 10);

  let strReport = 'Performance Tests:\n';
  strReport += 'Tests with 20 size board\n';
  strReport += '     Time: ' + strAccurateReport(report.time20) + '\n';
  report.strReport = strReport;
  return report;
}

function strPerfReportCollinear(perfReport) {
  let report = 'Performance Tests:\n';
  report += 'Tests with 150 points\n';
  report += '     Time: ' + perfReport.time150 + ' milliseconds\n';
  report += '     Accurate Time: ' + strAccurateReport(perfReport.time150Accurate) + '\n';
  report += 'Tests with 300 points\n';
  report += '     Accurate Time: ' + strAccurateReport(perfReport.time300);

  return report + '\n';
}

async function runPerfCollinear() {
  const input = await readCollinearInput('web/inputGenerated.txt');
  const collinear = require('../web/collinear');
  const report = {};

  report.time150 = time(collinear.bind(null, input));
  report.time150Accurate = timeAccurateBest(collinear.bind(null, input), 0);

  if (report.time150 < 500) {
    const input300 = await readCollinearInput('web/inputGenerated300.txt');
    report.time300 = timeAccurateBest(collinear.bind(null, input300), 30);
  }

  report.strReport = strPerfReportCollinear(report);

  return report;
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
};

function strSpecReport(specReport) {
  let str = 'Functional Tests:\n';

  for (let spec of specReport.report) {
    str += cfl(spec.status) + ' : ' + spec.name + '\n';
  }
  str += 'Functional Tests ' + cfl(specReport.status) + '\n\n';

  return str;
}

async function runSpec(question) {
  return new Promise(function(resolve, reject) {
    // Clear npm cache to enable running again
    delete require.cache[require.resolve('./../web/' + question.name + '.test.js')];
    delete require.cache[require.resolve('./../web/' + question.name + '.js')];

    const jasmine = new Jasmine();
    const reporter = new JasmineReporter();
    jasmine.randomizeTests(false);

    reporter.onDone = function() {
      let report = {
        report: reporter.report,
        status: reporter.overallStatus,
      };

      report.strReport = strSpecReport(report);
      resolve(report);
    };

    jasmine.completionReporter.onComplete(function() {});
    jasmine.addReporter(reporter);
    jasmine.execute(['web/' + question.name + '.test.js']);
  });
}
