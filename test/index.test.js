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

test('written content preserves the existing result schema', () => {
  withTmpCwd((tmpDir) => {
    const reporter = new DetoxJsonReporter({}, { outputDir: 'out', filename: 'results.json' });
    reporter.onTestResult({}, fakeTestResult());
    reporter.onRunComplete();

    const contents = JSON.parse(fs.readFileSync(path.join(tmpDir, 'out', 'results.json'), 'utf8'));

    assert.equal(contents.length, 1);
    const entry = contents[0];
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
