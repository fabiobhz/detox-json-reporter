const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DetoxJsonReporter = require('../dist/index.js').default;

function fakeTestResult() {
  return {
    perfStats: { start: 1000, end: 2000 },
    testFilePath: 'e2e/Sample.test.ts',
    testResults: [
      {
        fullName: 'Sample flow should succeed',
        status: 'passed',
        duration: 123,
        failureMessages: [],
        invocations: 1,
      },
    ],
  };
}

function fakeAggregatedResult() {
  return {
    numTotalTestSuites: 2,
    numPassedTestSuites: 1,
    numFailedTestSuites: 1,
    numPendingTestSuites: 0,
    numTotalTests: 5,
    numPassedTests: 3,
    numFailedTests: 1,
    numPendingTests: 1,
    startTime: Date.now() - 500,
  };
}

function withTmpCwd(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detox-json-reporter-test-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    return fn(tmpDir);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('writes to outputDir/filename when provided, not to the default path', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, { outputDir: 'custom-output', filename: 'report-shard-1.json' });
    reporter.onTestResult({}, fakeTestResult());
    reporter.onRunComplete();

    const expectedFile = path.join(tmpDir, 'custom-output', 'report-shard-1.json');
    const defaultFile = path.join(tmpDir, 'reports', 'detox-results.json');

    assert.ok(fs.existsSync(expectedFile), `expected report at ${expectedFile}`);
    assert.ok(!fs.existsSync(defaultFile), `default report should not be written to ${defaultFile}`);
  });
});

test('falls back to reports/detox-results.json when no options are given', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, {});
    reporter.onTestResult({}, fakeTestResult());
    reporter.onRunComplete();

    const defaultFile = path.join(tmpDir, 'reports', 'detox-results.json');
    assert.ok(fs.existsSync(defaultFile), `expected default report at ${defaultFile}`);
  });
});

test('preserves the per-test entry schema under results', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, { outputDir: 'out', filename: 'results.json' });
    reporter.onTestResult({}, fakeTestResult());
    reporter.onRunComplete(new Set(), fakeAggregatedResult());

    const contents = JSON.parse(fs.readFileSync(path.join(tmpDir, 'out', 'results.json'), 'utf8'));

    assert.deepEqual(Object.keys(contents).sort(), ['results', 'summary']);
    assert.equal(contents.results.length, 1);
    const entry = contents.results[0];
    assert.equal(entry.testName, 'Sample flow should succeed');
    assert.equal(entry.status, 'passed');
    assert.equal(entry.duration, 123);
    assert.equal(entry.file, 'e2e/Sample.test.ts');
    assert.equal(typeof entry.startedAt, 'string');
    assert.equal(typeof entry.endedAt, 'string');
    assert.deepEqual(entry.failureMessages, []);
    assert.equal(entry.retries, 1);
    assert.equal(entry.flaky, false);
    assert.deepEqual(Object.keys(entry).sort(), [
      'duration',
      'endedAt',
      'environment',
      'failureMessages',
      'file',
      'flaky',
      'retries',
      'startedAt',
      'status',
      'testName',
    ]);
    assert.deepEqual(Object.keys(entry.environment).sort(), [
      'cpuArch',
      'hostPlatform',
      'hostname',
      'osVersion',
      'platform',
    ]);
  });
});

test('emits a jest summary from the aggregated result', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, { outputDir: 'out', filename: 'results.json' });
    reporter.onTestResult({}, fakeTestResult());
    reporter.onRunComplete(new Set(), fakeAggregatedResult());

    const { summary } = JSON.parse(fs.readFileSync(path.join(tmpDir, 'out', 'results.json'), 'utf8'));

    assert.equal(summary.numTotalTestSuites, 2);
    assert.equal(summary.numFailedTestSuites, 1);
    assert.equal(summary.numTotalTests, 5);
    assert.equal(summary.numFailedTests, 1);
    assert.equal(summary.numPassedTests, 3);
    assert.equal(summary.numPendingTests, 1);
    assert.ok(summary.duration >= 0);
  });
});

test('derives the summary from entries when no aggregated result is passed', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, { outputDir: 'out', filename: 'results.json' });
    reporter.onTestResult({}, {
      perfStats: { start: 1000, end: 2000 },
      testFilePath: 'e2e/A.test.ts',
      testResults: [
        { fullName: 'A one', status: 'passed', duration: 1, failureMessages: [], invocations: 1 },
        { fullName: 'A two', status: 'failed', duration: 1, failureMessages: ['x'], invocations: 1 },
      ],
    });
    reporter.onTestResult({}, {
      perfStats: { start: 1000, end: 2000 },
      testFilePath: 'e2e/B.test.ts',
      testResults: [
        { fullName: 'B one', status: 'passed', duration: 1, failureMessages: [], invocations: 1 },
      ],
    });
    reporter.onRunComplete(new Set(), undefined);

    const { summary } = JSON.parse(fs.readFileSync(path.join(tmpDir, 'out', 'results.json'), 'utf8'));

    assert.equal(summary.numTotalTests, 3);
    assert.equal(summary.numFailedTests, 1);
    assert.equal(summary.numTotalTestSuites, 2);
    assert.equal(summary.numFailedTestSuites, 1);
  });
});

test('concurrent shards write distinct files without clobbering', () => {
  withTmpCwd((tmpDir) => {
    ['0', '1', '2'].forEach((id) => {
      const reporter = new DetoxJsonReporter({}, { outputDir: 'out', filename: `report-shard-${id}.json` });
      reporter.onTestResult({}, {
        perfStats: { start: 1000, end: 2000 },
        testFilePath: `e2e/Shard${id}.test.ts`,
        testResults: [
          { fullName: `shard ${id} test`, status: 'passed', duration: 1, failureMessages: [], invocations: 1 },
        ],
      });
      reporter.onRunComplete(new Set(), fakeAggregatedResult());
    });

    ['0', '1', '2'].forEach((id) => {
      const contents = JSON.parse(fs.readFileSync(path.join(tmpDir, 'out', `report-shard-${id}.json`), 'utf8'));
      assert.equal(contents.results.length, 1);
      assert.equal(contents.results[0].testName, `shard ${id} test`);
    });
  });
});
