# Test Suites — Indigo ERP

This directory contains automated end-to-end, browser, and integration test suites for the Indigo ERP platform.

## Test Scripts

| Script | Framework | Description |
|---|---|---|
| `full_system_test.cjs` | Playwright (Node.js) | Full system regression suite covering 30+ routes, HR/Finance workflows, dark mode, and API health checks. |
| `deep_live_test.cjs` | Playwright (Node.js) | In-depth live audit testing authentication, state persistence, document uploads, and reports. |
| `comprehensive_browser_test.js` | Playwright (Node.js) | Multi-viewport and responsive browser testing across desktop and tablet resolutions. |
| `e2e_tests.js` | Playwright (Node.js) | Core end-to-end user workflows (attendance check-out, leave requests, role permissions). |
| `test_suite.py` | Python (unittest / requests) | Backend REST API contract and health verification. |

## Running Tests

From the project root:

```bash
# Run full system suite
npm run test:full

# Run E2E test suite
npm run test:e2e

# Run backend API test suite
npm run test:suite
```

Test output artifacts and screenshots are captured in `tests/results/`.
