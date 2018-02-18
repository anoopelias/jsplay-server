const fs = require('mz/fs');
const puppeteer = require('puppeteer');
const options = { args: ['--enable-precise-memory-info'] };
const Jasmine = require('jasmine');

module.exports = async function(req, res) {
    try {
        const fileString = req.body.collinear;
        const file = Buffer.from(fileString, 'base64').toString('utf8');

        await fs.writeFile('web/collinear.js', file);

        let report = '';
        const specReport = await runSpec();
        res.send('Submitted successfully ' + JSON.stringify(specReport));

        // const report = await perf();
        // res.send('Submitted successfully ' + JSON.stringify(report));
    } catch (err) {
        if (err.message) {
            res.send('Error: ' + err.message);
        } else {
            res.send('Unknown Error');
        }
    }
};

async function getReport(page) {
    const report = {};

    return new Promise(function(resolve, reject) {
        page.on('console', consoleMessage => {
            const message = consoleMessage.text();
            console.log(message);

            if (consoleMessage.type() === 'info' &&
                message.startsWith('::::TIME::::')) {
                report.time = parseFloat(message.substring(12));
            }
            if (consoleMessage.type() === 'info' &&
                message.startsWith('::::MEMORY::::')) {

                report.mem = parseFloat(message.substring(14));
            }

            if (consoleMessage.type() === 'info' &&
                message.startsWith('::::ERROR::::')) {
                report.error = message.substring(13);
            }

            if (consoleMessage.type() === 'info' &&
                message.startsWith('::::END::::')) {
                resolve(report);
            }

        });
    });
}

async function perf() {
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    await page.goto('http://localhost:8080');
    const report = await getReport(page);
    await browser.close();

    return report;
}

function JasmineReporter() {
    this.report = '';

    this.specDone = function(spec) {
        this.report += spec.fullName + ' : ' + spec.status;
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
        console.log('Running spec using jasmine');
        const jasmine = new Jasmine();
        const reporter = new JasmineReporter();

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
