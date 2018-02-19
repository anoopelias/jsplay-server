const fs = require('mz/fs');
const Jasmine = require('jasmine');

module.exports = async function(req, res) {
    try {
        const fileString = req.body.collinear;
        const name = req.query.name || '<Unknown>';
        const file = Buffer.from(fileString, 'base64').toString('utf8');

        await fs.writeFile('web/collinear.js', file);

        console.log('Submitting for', name);
        let report = '\nSubmission report for ' + name + ' generated at ' + new Date() + '\n\n';
        const specReport = await runSpec();
        report += strSpecReport(specReport);

        if (specReport.status === 'passed') {
            const perfReport = await runPerf();
            report += 'Performance Tests:\n';
            report += 'Tests with 150 points\n';
            report += '     Time: ' + perfReport.time + ' milliseconds\n\n';
        }
        res.send(report);
    } catch (err) {
        if (err.message) {
            res.send('Error: ' + err.message);
        } else {
            res.send('Unknown Error');
        }
    }
};

function cfl(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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

async function runPerf() {
    const input = await readInput('web/inputGenerated.txt');
    const collinear = require('../web/collinear');
    const startTime = +new Date();
    const output = collinear(input);
    const executionTime = new Date() - startTime;

    return { time: executionTime };
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
