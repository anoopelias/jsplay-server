const fs = require('mz/fs');
const puppeteer = require('puppeteer');
const options = { args: ['--enable-precise-memory-info'] };

module.exports = async function(req, res) {
    try {
        const fileString = req.body.collinear;
        const file = Buffer.from(fileString, 'base64').toString('utf8');
        console.log('File', file);

        await fs.writeFile('web/collinear.js', file);
        const report = await perf();
        res.send('Submitted successfully ' + JSON.stringify(report));
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
