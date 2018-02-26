const fs = require('mz/fs');
const Jasmine = require('jasmine');
const ReadWriteLock = require('rwlock');
const { performance } = require('perf_hooks');

const lock = new ReadWriteLock();

module.exports = async function(req, res) {
    const fileString = req.body.collinear;
    const name = req.query.name || '<Unknown>';

    // Run one at a time
    lock.writeLock(async function(release) {
        const response = await process(fileString, name);
        release();
        res.send(response);
    });

};

async function process(fileString, name) {
    try {
        const file = Buffer.from(fileString, 'base64').toString('utf8');

        await fs.writeFile('web/collinear.js', file);

        console.log('Submitting for', name);
        let report = '\nSubmission report for ' + name + ' generated at ' + new Date() + '\n\n';
        const specReport = await runSpec();
        report += strSpecReport(specReport);

        if (specReport.status === 'passed') {
            const perfReport = await runPerf();
            report += strPerfReport(perfReport);
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

function strPerfReport(perfReport) {
    let report = 'Performance Tests:\n';
    report += 'Tests with 150 points\n';
    report += '     Time: ' + perfReport.time150 + ' milliseconds\n';
    report += '     Accurate Time: ' + strAccurateReport(perfReport.time150Accurate) + '\n';
    report += 'Tests with 300 points\n';
    report += '     Accurate Time: ' + strAccurateReport(perfReport.time300);

    return report + '\n';
}

function strSpecReport(specReport) {
    let str = 'Functional Tests:\n';

    for (let spec of specReport.report) {
        str += cfl(spec.status) + ' : ' + spec.name + '\n';
    }
    str += 'Functional Tests ' + cfl(specReport.status) + '\n\n';

    return str;
}

async function readInput(filename) {
    const input = await fs.readFile(filename, 'utf8');
    const lines = input.split('\n');
    const length = parseInt(lines.shift());
    console.log('length', length);
    let points = [];

    for (let i=0; i<length; i++) {
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
    for (let i=0; i<10; i++) {
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

async function runPerf() {
    const input = await readInput('web/inputGenerated.txt');
    const collinear = require('../web/collinear');
    const report = {};

    report.time150 = time(collinear.bind(null, input));
    report.time150Accurate = timeAccurateBest(collinear.bind(null, input), 0);

    if (report.time150 < 500) {
        const input300 = await readInput('web/inputGenerated300.txt');
        report.time300 = timeAccurateBest(collinear.bind(null, input300), 30);
    }

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

async function runSpec() {
    return new Promise(function(resolve, reject) {
        // Clear npm cache to enable running again
        delete require.cache[require.resolve('./../web/collinear.test.js')];
        delete require.cache[require.resolve('./../web/collinear.js')];

        const jasmine = new Jasmine();
        const reporter = new JasmineReporter();
        jasmine.randomizeTests(false);

        reporter.onDone = function() {
            resolve({
                report: reporter.report,
                status: reporter.overallStatus,
            });
        };

        jasmine.completionReporter.onComplete(function() {});
        jasmine.addReporter(reporter);
        jasmine.execute(['web/collinear.test.js']);
    });
}
