import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AggregatedResult, TestResult, Reporter, Test } from '@jest/reporters';

declare global {
  var device: {
    getPlatform?: () => string;
  };
}

interface DetoxJsonReportEntry {
  testName: string;
  status: string;
  duration: number;
  file: string;
  startedAt: string;
  endedAt: string;
  failureMessages: string[];
  retries: number;
  flaky: boolean;
  environment: {
    platform: string;
    hostPlatform: string;
    hostname: string;
    osVersion: string;
    cpuArch: string;
  };
}

interface DetoxJsonReportSummary {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  duration: number;
}

interface DetoxJsonReport {
  summary: DetoxJsonReportSummary;
  results: DetoxJsonReportEntry[];
}

class DetoxJsonReporter implements Reporter {
  private _results: DetoxJsonReportEntry[] = [];
  private _options: { [key: string]: any };

  constructor(globalConfig: any, options: { [key: string]: any } = {}) {
    this._options = options;
  }

  onTestResult(test: Test, testResult: TestResult): void {
    const startedAt = new Date(testResult.perfStats.start).toISOString();
    const endedAt = new Date(testResult.perfStats.end).toISOString();

    const detoxPlatform =
        typeof global !== 'undefined' &&
        (global as any).device?.getPlatform?.()
            ? (global as any).device.getPlatform()
            : 'unknown';

    testResult.testResults.forEach((result) => {
      const retries = (result as any).invocations || 1;
      const isFlaky = result.status === 'passed' && retries > 1;

      this._results.push({
        testName: result.fullName,
        status: result.status,
        duration: result.duration ?? 0,
        file: testResult.testFilePath,
        startedAt,
        endedAt,
        failureMessages: result.failureMessages ?? [],
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

  onRunComplete(_contexts: unknown, results?: AggregatedResult): void {
    const outputDir = this._options.outputDir ?? 'reports';
    const filename = this._options.filename ?? 'detox-results.json';

    const reportPath = path.resolve(process.cwd(), outputDir);
    const reportFile = path.join(reportPath, filename);

    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    const report: DetoxJsonReport = {
      summary: this.buildSummary(results),
      results: this._results,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detox JSON report saved to ${reportFile}`);
  }

  private buildSummary(results?: AggregatedResult): DetoxJsonReportSummary {
    if (results) {
      return {
        numTotalTestSuites: results.numTotalTestSuites,
        numPassedTestSuites: results.numPassedTestSuites,
        numFailedTestSuites: results.numFailedTestSuites,
        numPendingTestSuites: results.numPendingTestSuites,
        numTotalTests: results.numTotalTests,
        numPassedTests: results.numPassedTests,
        numFailedTests: results.numFailedTests,
        numPendingTests: results.numPendingTests,
        duration: results.startTime ? Date.now() - results.startTime : 0,
      };
    }
    return this.buildSummaryFromResults();
  }

  private buildSummaryFromResults(): DetoxJsonReportSummary {
    const files = new Set<string>();
    const failedFiles = new Set<string>();
    let numPassedTests = 0;
    let numFailedTests = 0;
    let numPendingTests = 0;

    this._results.forEach((entry) => {
      files.add(entry.file);
      if (entry.status === 'failed') {
        numFailedTests += 1;
        failedFiles.add(entry.file);
      } else if (entry.status === 'pending' || entry.status === 'skipped') {
        numPendingTests += 1;
      } else if (entry.status === 'passed') {
        numPassedTests += 1;
      }
    });

    return {
      numTotalTestSuites: files.size,
      numPassedTestSuites: files.size - failedFiles.size,
      numFailedTestSuites: failedFiles.size,
      numPendingTestSuites: 0,
      numTotalTests: this._results.length,
      numPassedTests,
      numFailedTests,
      numPendingTests,
      duration: 0,
    };
  }
}

export default DetoxJsonReporter;
