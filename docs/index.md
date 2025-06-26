![npm](https://img.shields.io/npm/v/detox-json-reporter)
![license](https://img.shields.io/npm/l/detox-json-reporter)
![build](https://img.shields.io/github/actions/workflow/status/fabiobhz/detox-json-reporter/publish.yml)

📘 [View Documentation on GitHub Pages](https://fabiobhz.github.io/detox-json-reporter/)

# detox-json-reporter

📊 A lightweight, TypeScript-powered JSON reporter for [Detox](https://github.com/wix/Detox) end-to-end testing with Jest.

Generates structured `detox-results.json` files for analysis, dashboards (Grafana, Prometheus), or custom test pipelines.

---

## ✨ Features

- Generates rich JSON reports per test case
- Includes timestamps, durations, retries, platform & environment info
- Flaky test detection
- Works with Detox + Jest seamlessly

---

## 🚀 Installation

```bash
yarn add -D detox-json-reporter
# or
npm install --save-dev detox-json-reporter
```
---

## 🛠 Usage

#### ➤ Option 1: Use in jest.config.js

Add the reporter to your Jest configuration:

```bash
module.exports = {
  reporters: [
    'default',
    ['detox-json-reporter', {
      outputFile: './reports/detox-results.json' // optional path
    }]
  ]
};
```

This will generate a file at ./reports/detox-results.json after running your Detox tests.



#### ➤ Option 2: Use via Detox config (.detoxrc.js or package.json)

```bash
{
  "detox": {
    "testRunner": "jest",
    "runnerConfig": "e2e/config.json",
    "reportSpecs": true,
    "reporter": "detox-json-reporter"
  }
}
```
This will instruct Detox to use the reporter automatically.

---

## 📄 Output Format Example

```json
[
  {
    "testName": "Login flow should succeed",
    "status": "passed",
    "duration": 1325,
    "file": "e2e/Login.test.ts",
    "startedAt": "2025-06-26T10:25:00.123Z",
    "endedAt": "2025-06-26T10:25:01.448Z",
    "failureMessages": [],
    "retries": 1,
    "flaky": false,
    "environment": {
      "platform": "ios",
      "hostPlatform": "darwin",
      "hostname": "MacBook-Pro.local",
      "osVersion": "24.1.0",
      "cpuArch": "arm64"
    }
  }
]
```

---

## 📊 Use Cases

- 📈 Grafana dashboards (via JSON to Prometheus/Loki)

-  CI pipeline debugging

- Flaky test monitoring

- Metrics analysis across test suites

---

### 👤 Author

Fábio Gomes - [@fabiobhz](https://github.com/fabiobhz)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://mit-license.org/) for details.
