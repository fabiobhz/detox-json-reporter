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

  onRunComplete(): void {
    const reportPath = path.resolve(process.cwd(), 'reports');
    const reportFile = path.join(reportPath, 'detox-results.json');

    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(this._results, null, 2));
    console.log(`📄 Detox JSON report saved to ${reportFile}`);
  }
}

export default DetoxJsonReporter;
