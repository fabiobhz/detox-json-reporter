// detox-json-reporter/index.js
const fs = require('fs');
const path = require('path');
const os = require('os');

class DetoxJsonReporter {
    constructor(globalConfig, options) {
        this._results = [];
        this._options = options || {};
    }

    onTestResult(test, testResult) {
        const startedAt = new Date(testResult.perfStats.start).toISOString();
        const endedAt = new Date(testResult.perfStats.end).toISOString();

        const detoxPlatform = global.device?.getPlatform?.() || 'unknown';

        testResult.testResults.forEach((result) => {
            const retries = result.invocations || 1;
            const isFlaky = result.status === 'passed' && retries > 1;

            this._results.push({
                testName: result.fullName,
                status: result.status,
                duration: result.duration,
                file: testResult.testFilePath,
                startedAt,
                endedAt,
                failureMessages: result.failureMessages,
                retries,
                flaky: isFlaky,
                environment: {
                    platform: detoxPlatform,
                    hostPlatform: os.platform(),
                    hostname: os.hostname(),
                    osVersion: os.release(),
                    cpuArch: os.arch(),
                }
            });
        });
    }

    onRunComplete() {
        const reportPath = path.resolve(process.cwd(), 'reports');
        const reportFile = path.join(reportPath, 'detox-results.json');

        if (!fs.existsSync(reportPath)) {
            fs.mkdirSync(reportPath, { recursive: true });
        }

        fs.writeFileSync(reportFile, JSON.stringify(this._results, null, 2));
        console.log(`📄 Detox JSON report saved to ${reportFile}`);
    }
}

module.exports = DetoxJsonReporter;
