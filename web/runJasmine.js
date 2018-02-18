const Jasmine = require('jasmine');

function JsPlayReporter() {
    this.result = '';
    this.overallStatus;

    this.specDone = function(spec) {
        this.result += spec.fullName + ' : ' + spec.status;
    };

    this.jasmineDone = function(result) {
        this.overallStatus = result.overallStatus;
        if (this.onDone) {
            this.onDone();
        }
    };
};

const jasmine = new Jasmine();
const reporter = new JsPlayReporter();
jasmine.addReporter(reporter);

reporter.onDone = () => {
    const jasmine2 = new Jasmine();
    const reporter2 = new JsPlayReporter();
    jasmine2.addReporter(reporter2);
    jasmine2.execute(['web/collinear.test.js']);
};

jasmine.execute(['web/collinear.test.js']);


