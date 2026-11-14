const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB_BASE = process.env.TEST_WEB_BASE || 'http://localhost:5173';
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:5250/api';
const OUTPUT_DIR = path.resolve('test_full_system_results');
const onlyCheck = process.env.FULL_TEST_ONLY?.trim().toLowerCase();

const routes = [
  ['/dashboard', 'Good morning'],
  ['/hr/employees', 'Employees'],
  ['/hr/departments', 'Departments'],
  ['/hr/positions', 'Positions'],
  ['/hr/attendance', 'Attendance'],
  ['/hr/leave', 'Leave'],
  ['/hr/payroll', 'Payroll'],
  ['/hr/recruitment', 'Recruitment'],
  ['/hr/performance', 'Performance'],
  ['/hr/benefits', 'Benefits'],
  ['/hr/documents', 'Documents'],
  ['/finance/dashboard', 'Good morning'],
  ['/finance/accounts', 'Chart of Accounts'],
  ['/finance/ledger', 'General Ledger'],
  ['/finance/journal', 'Journal'],
  ['/finance/invoices', 'Invoices'],
  ['/finance/receivables', 'Customers'],
  ['/finance/payables', 'Vendors'],
  ['/finance/expenses', 'Expenses'],
  ['/finance/payments', 'Payments'],
  ['/finance/budgets', 'Budgets'],
  ['/finance/tax', 'Tax'],
  ['/reports', 'Reports'],
  ['/admin/users', 'User Accounts'],
  ['/admin/roles', 'Roles'],
  ['/admin/audit-logs', 'Audit Logs'],
  ['/admin/settings', 'Settings'],
];

const readEndpoints = [
  '/auth/me', '/auth/permissions', '/dashboard/hr', '/dashboard/finance',
  '/employees?pageSize=100', '/departments?pageSize=100', '/positions?pageSize=100',
  '/attendance?pageSize=100', '/leave?pageSize=100', '/leave/types?pageSize=100',
  '/payroll/periods', '/recruitment/job-openings', '/performance/reviews',
  '/benefits', '/documents', '/accounts?pageSize=100', '/journal-entries?pageSize=100',
  '/invoices?pageSize=100', '/customers?pageSize=100', '/vendors?pageSize=100',
  '/expenses?pageSize=100', '/payments?pageSize=100', '/budgets?pageSize=100',
  '/admin/roles', '/admin/permissions', '/admin/users?pageSize=100',
  '/admin/users/roles', '/audit-logs?pageSize=100', '/admin/settings', '/finance/tax',
  '/reports/trial-balance', '/reports/income-statement', '/reports/balance-sheet',
  '/reports/payroll-summary', '/reports/hr-summary',
];

const result = { passed: [], failed: [], skipped: [], routePages: [], apiEndpoints: [] };
const pageErrors = [];
const apiErrors = [];
const consoleErrors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCheck(name, callback) {
  if (onlyCheck && !name.toLowerCase().includes(onlyCheck)) {
    result.skipped.push(name);
    return;
  }
  try {
    const detail = await callback();
    result.passed.push({ name, detail: detail || '' });
    console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    result.failed.push({ name, error: error.message || String(error) });
    console.error(`[FAIL] ${name} — ${error.message || error}`);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { /* keep non-JSON body for diagnostics */ }
  return { response, data, body };
}

function assertExcelWorkbook(buffer, context) {
  assert(buffer.length > 500 && buffer.readUInt32LE(0) === 0x04034b50, `${context} is not a valid XLSX ZIP package.`);
  const endOffset = buffer.length - 22;
  assert(buffer.readUInt32LE(endOffset) === 0x06054b50, `${context} is missing the XLSX package directory.`);
  let centralOffset = buffer.readUInt32LE(endOffset + 16);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralEnd = centralOffset + centralSize;
  const files = new Map();
  while (centralOffset < centralEnd) {
    assert(buffer.readUInt32LE(centralOffset) === 0x02014b50, `${context} contains a malformed package entry.`);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.toString('utf8', centralOffset + 46, centralOffset + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    files.set(name, buffer.toString('utf8', dataStart, dataStart + compressedSize));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  for (const required of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml'])
    assert(files.has(required), `${context} is missing ${required}.`);
  assert(files.get('xl/worksheets/sheet1.xml').includes('<sheetData>'), `${context} does not contain a worksheet.`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await runCheck('Frontend is reachable', async () => {
    const { response } = await fetchJson(WEB_BASE);
    assert(response.ok, `Frontend responded ${response.status}`);
    return `HTTP ${response.status}`;
  });

  const loginResult = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@indigo.co', password: 'Admin@123456' }),
  });
  assert(loginResult.response.ok, `Admin login returned ${loginResult.response.status}`);
  const token = loginResult.data?.accessToken;
  assert(token, 'Login response did not include an access token.');
  const authHeaders = { Authorization: `Bearer ${token}` };

  await runCheck('Public login account directory', async () => {
    const { response, data } = await fetchJson(`${API_BASE}/auth/login-accounts`);
    assert(response.ok, `Directory returned ${response.status}`);
    assert(Array.isArray(data) && data.length >= 1, 'No login accounts were returned.');
    assert(data.every(user => user.fullName && user.email && Array.isArray(user.roles)), 'A login profile is missing required fields.');
    return `${data.length} live account profiles`;
  });

  for (const endpoint of readEndpoints) {
    await runCheck(`API GET ${endpoint}`, async () => {
      const { response, data, body } = await fetchJson(`${API_BASE}${endpoint}`, { headers: authHeaders });
      assert(response.ok, `HTTP ${response.status}: ${(data?.error || body || '').slice(0, 180)}`);
      result.apiEndpoints.push({ endpoint, status: response.status });
      return `HTTP ${response.status}`;
    });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => {
    window.__testPrintCount = 0;
    window.print = () => { window.__testPrintCount += 1; };
  });
  const page = await context.newPage();
  let isLoggedIn = false;
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (isLoggedIn && message.type() === 'error') consoleErrors.push(message.text());
  });
  const failedRequests = [];
  page.on('requestfailed', request => failedRequests.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`));
  page.on('response', response => {
    if (isLoggedIn && response.url().includes('/api/') && response.status() >= 400)
      apiErrors.push(`${response.status()} ${response.url()}`);
  });

  try {
    await page.goto(WEB_BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('#input-login-email').fill('admin@indigo.co');
    await page.locator('#input-login-password').fill('Admin@123456');
    await page.locator('#btn-submit-login').click();
    await page.waitForTimeout(1200);
    if (new URL(page.url()).pathname !== '/dashboard') {
      const errorText = await page.locator('body').innerText();
      throw new Error(`Browser login failed at ${page.url()}: ${errorText.slice(0, 500)}; failed requests: ${failedRequests.join(' | ')}`);
    }
    isLoggedIn = true;

    await runCheck('Authenticated shell and account name', async () => {
      const sidebar = await page.locator('.sidebar-bottom .workspace').innerText();
      assert(sidebar.includes(loginResult.data.user.fullName), 'Sidebar account name differs from live login data.');
      assert(sidebar.includes(loginResult.data.user.roles[0]), 'Sidebar role differs from live login data.');
      return sidebar.replace(/\s+/g, ' ').trim();
    });

    await runCheck('All 27 application pages load and render their module heading', async () => {
      const routeFailures = [];
      for (const [route, expectedHeading] of routes) {
        await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await page.locator('.page-content h1').first().waitFor({ state: 'visible', timeout: 12000 });
        await page.waitForTimeout(180);
        const heading = (await page.locator('.page-content h1').first().innerText()).trim();
        const underConstruction = await page.getByText('Module under construction.', { exact: true }).count();
        const routeOk = heading.toLowerCase().includes(expectedHeading.toLowerCase()) && underConstruction === 0;
        result.routePages.push({ route, expectedHeading, heading, routeOk });
        if (!routeOk) routeFailures.push(`${route}: expected heading containing "${expectedHeading}", got "${heading}"`);

        const sortButtons = page.locator('.page-content .sort-button');
        for (let index = 0; index < await sortButtons.count(); index += 1) {
          const sortButton = sortButtons.nth(index);
          const icon = sortButton.locator('i');
          const before = await icon.getAttribute('class');
          await sortButton.click();
          const after = await icon.getAttribute('class');
          if (before === after) routeFailures.push(`${route}: sort button ${index + 1} did not change sorting state`);
        }

        const statusButtons = page.locator('.page-content button.status');
        for (let index = 0; index < await statusButtons.count(); index += 1) {
          const statusButton = statusButtons.nth(index);
          await statusButton.click();
          const statusMenu = page.locator('.page-content .column-menu').last();
          if (!await statusMenu.locator('button').count()) routeFailures.push(`${route}: status action ${index + 1} did not open its menu`);
          else await statusMenu.evaluate(menu => menu.previousElementSibling?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        }

        const refreshButtons = page.locator('.page-header button').filter({ hasText: /Refresh|Reload/i });
        for (let index = 0; index < await refreshButtons.count(); index += 1) {
          const refreshButton = refreshButtons.nth(index);
          const responsePromise = page.waitForResponse(response => response.url().includes('/api/') && response.request().method() === 'GET', { timeout: 8000 });
          await refreshButton.click();
          const refreshResponse = await responsePromise;
          if (!refreshResponse.ok()) routeFailures.push(`${route}: refresh returned HTTP ${refreshResponse.status()}`);
        }
      }
      assert(routeFailures.length === 0, routeFailures.join('\n'));
      return `${routes.length} routes rendered`;
    });

    await runCheck('Root, compatibility aliases and not-found route resolve correctly', async () => {
      const aliases = [
        ['/', 'Good morning'],
        ['/finance/customers', 'Customers'],
        ['/finance/vendors', 'Vendors'],
        ['/finance/reports', 'Executive reports'],
      ];
      for (const [route, headingText] of aliases) {
        await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
        const heading = page.locator('.page-content h1').first();
        await heading.waitFor({ state: 'visible', timeout: 10000 });
        assert((await heading.innerText()).toLowerCase().includes(headingText.toLowerCase()), `${route} did not resolve to ${headingText}.`);
      }
      await page.goto(`${WEB_BASE}/full-system-test-unknown-route`, { waitUntil: 'domcontentloaded' });
      await page.getByText('Module under construction.', { exact: true }).waitFor({ state: 'visible', timeout: 8000 });
      return `${aliases.length} aliases plus wildcard route verified`;
    });

    await runCheck('Global sidebar navigation reaches every unique page route', async () => {
      const failures = [];
      for (const [route] of routes) {
        const link = page.locator(`.sidebar a[href="${route}"]`).first();
        if (!await link.count()) { failures.push(`${route}: no sidebar link`); continue; }
        await link.click();
        await page.waitForURL(`**${route}`, { timeout: 6000 }).catch(() => {});
        if (new URL(page.url()).pathname !== route) failures.push(`${route}: navigation did not reach the route`);
      }
      assert(failures.length === 0, failures.join('\n'));
      return `${routes.length} navigation targets`;
    });

    await runCheck('Shell controls: collapse, theme, search, quick actions, notifications', async () => {
      await page.goto(`${WEB_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.locator('#btn-toggle-sidebar').click();
      assert(await page.locator('.app-shell').evaluate(node => node.classList.contains('sidebar-collapsed')), 'Sidebar did not collapse.');
      await page.locator('#btn-toggle-sidebar').click();
      assert(!await page.locator('.app-shell').evaluate(node => node.classList.contains('sidebar-collapsed')), 'Sidebar did not expand.');

      await page.locator('#btn-theme-toggle').click();
      assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'Dark theme was not enabled.');
      assert(await page.evaluate(() => localStorage.getItem('indigo-theme')) === 'dark', 'Dark theme preference was not persisted.');
      assert(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor) === 'rgb(12, 16, 32)', 'Dark theme background palette was not applied.');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#btn-theme-toggle').waitFor({ state: 'visible' });
      assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'Dark theme preference was not restored after reload.');
      await page.locator('#btn-theme-toggle').click();
      assert(await page.locator('html').getAttribute('data-theme') !== 'dark', 'Light theme was not restored.');

      await page.locator('#btn-open-search').click();
      await page.locator('.search-dialog input').fill('Maya');
      assert(await page.getByText('Maya Khalil — Employee').count(), 'Global search did not filter visible results.');
      await page.keyboard.press('Escape');
      assert(await page.locator('.search-modal').count() === 0, 'Escape did not close global search.');

      await page.locator('#btn-quick-new').click();
      for (const [label, route] of [['New Customer Invoice', '/finance/invoices'], ['Add New Employee', '/hr/employees'], ['Record Journal Entry', '/finance/journal'], ['Record Operational Expense', '/finance/expenses'], ['Submit Leave Request', '/hr/leave']]) {
        await page.getByRole('button', { name: new RegExp(label) }).click();
        await page.waitForTimeout(100);
        assert(new URL(page.url()).pathname === route, `Quick action "${label}" navigated to the wrong route.`);
        if (label !== 'Submit Leave Request') await page.locator('#btn-quick-new').click();
      }
      await page.locator('#btn-notifications').click();
      assert(await page.getByText(/Notifications \(/).count(), 'Notification panel did not open.');
      await page.getByRole('button', { name: /Clear all/ }).click();
      await page.locator('.top-actions .search-modal').waitFor({ state: 'detached', timeout: 4000 });
      await page.locator('#btn-notifications').click();
      assert(await page.getByText(/Notifications \(0\)/).count(), 'Clear all did not clear the notification list.');
      await page.locator('.top-actions .search-dialog .icon-button').click();
      return 'Shell state changes, search, quick links, and notification clearing verified';
    });

    await runCheck('Executive dashboard print layout and Excel download', async () => {
      await page.goto(`${WEB_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.locator('.stats-grid .stat-card').first().waitFor({ state: 'visible', timeout: 10000 });
      const printPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Print / PDF' }).click();
      const printWindow = await printPromise;
      await printWindow.locator('h1').waitFor({ state: 'visible' });
      assert((await printWindow.locator('h1').innerText()).includes('Executive dashboard'), 'Dashboard print report title was missing.');
      await printWindow.close();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Excel' }).click();
      const download = await downloadPromise;
      assertExcelWorkbook(fs.readFileSync(await download.path()), 'Dashboard Excel export');
      return 'Executive dashboard print/PDF and structured XLSX verified';
    });

    await runCheck('Shared table controls: search, sort, column visibility, selection, export', async () => {
      await page.goto(`${WEB_BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
      await page.locator('.table-panel').waitFor({ state: 'visible', timeout: 12000 });
      await page.waitForTimeout(250);

      const search = page.getByRole('textbox', { name: 'Search records' });
      await search.fill('NO_MATCH_FULL_SYSTEM_CHECK');
      assert(await page.getByText('No records found.').count(), 'Table search did not show the empty state.');
      await search.fill('');

      const sortButton = page.locator('.sort-button').first();
      const sortIcon = sortButton.locator('i');
      const beforeSort = await sortIcon.getAttribute('class');
      await sortButton.click();
      const afterSort = await sortIcon.getAttribute('class');
      assert(beforeSort !== afterSort, 'Clicking a column heading did not change its sort state.');

      await page.getByRole('button', { name: 'Columns' }).click();
      const firstColumn = page.locator('.column-menu label').first();
      const columnName = (await firstColumn.innerText()).trim();
      await firstColumn.locator('input').uncheck();
      assert(await page.locator(`thead th button`).filter({ hasText: columnName }).count() === 0, `Column "${columnName}" remained visible after hiding it.`);
      await firstColumn.locator('input').check();
      assert(await page.locator('thead th button').filter({ hasText: columnName }).count() > 0, `Column "${columnName}" did not return after showing it.`);

      const rowCheckbox = page.locator('tbody input[type="checkbox"]').first();
      if (await rowCheckbox.count()) {
        await rowCheckbox.check();
        assert(await page.getByRole('button', { name: /Clear 1/ }).count(), 'Selecting a row did not expose the clear-selection control.');
        await page.getByRole('button', { name: /Clear 1/ }).click();
        assert(!await rowCheckbox.isChecked(), 'Clear selection left a row selected.');
      }

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Print / PDF' }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const popupHeading = await popup.locator('h1').textContent().catch(() => '');
      assert((popupHeading || '').includes('Employees'), 'Print export did not open the styled employee report.');
      await popup.close();

      const excelPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Excel' }).click();
      const excel = await excelPromise;
      assert(/\.xlsx$/i.test(excel.suggestedFilename()), `Table export produced unexpected file ${excel.suggestedFilename()}.`);
      const excelBytes = fs.readFileSync(await excel.path());
      assertExcelWorkbook(excelBytes, 'Table export');
      await excel.saveAs(path.join(OUTPUT_DIR, '_xlsx_validation.xlsx'));
      return 'Search, sort, column picker, row selection, styled print/PDF, and XLSX download verified';
    });

    await runCheck('Report tabs load each live report and export/print controls work', async () => {
      await page.goto(`${WEB_BASE}/reports`, { waitUntil: 'domcontentloaded' });
      const reports = [
        ['Trial balance', 'Total Debit Balance'],
        ['Income statement (P&L)', 'Gross Revenues'],
        ['Balance sheet', 'ASSETS'],
        ['Payroll register', 'Total Gross Payroll'],
        ['Workforce analytics', 'Total Headcount'],
      ];
      const reportTabs = page.locator('.profile-tabs button');
      await reportTabs.first().waitFor({ state: 'visible', timeout: 10000 });
      const renderedTabCount = await reportTabs.count();
      if (renderedTabCount < reports.length) throw new Error(`Expected at least ${reports.length} report tabs; found ${renderedTabCount}.`);
      for (let index = 0; index < reports.length; index += 1) {
        const [tab, proof] = reports[index];
        const tabButton = reportTabs.nth(index);
        const visibleLabel = (await tabButton.innerText()).trim();
        await tabButton.click({ timeout: 5000 });
        await page.getByText(proof, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
        assert(await page.locator('.profile-tabs button.active').innerText().then(text => text.includes(tab.split(' ')[0])), `Report tab ${tab} (${visibleLabel}) did not become active.`);
      }
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Print' }).click();
      const printWindow = await popupPromise;
      await printWindow.locator('h1').waitFor({ state: 'visible', timeout: 8000 });
      const printHeading = await printWindow.locator('h1').innerText();
      assert(printHeading.includes('Workforce analytics'), `Report print window rendered unexpected heading "${printHeading}".`);
      await printWindow.close();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Excel' }).click();
      const download = await downloadPromise;
      assert(/\.xlsx$/i.test(download.suggestedFilename()), `Report export produced unexpected file ${download.suggestedFilename()}.`);
      const workbook = fs.readFileSync(await download.path());
      assertExcelWorkbook(workbook, 'Report export');
      return 'Five live reports plus styled print/PDF and formatted XLSX export verified';
    });

    await runCheck('General ledger print and Excel buttons are live', async () => {
      await page.goto(`${WEB_BASE}/finance/ledger`, { waitUntil: 'domcontentloaded' });
      await page.locator('.table-panel').waitFor({ state: 'visible', timeout: 10000 });
      const printPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Print' }).click();
      const printWindow = await printPromise;
      await printWindow.locator('h1').waitFor({ state: 'visible' });
      assert((await printWindow.locator('h1').innerText()).includes('General ledger'), 'Ledger print report did not render its title.');
      await printWindow.close();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Excel' }).click();
      const download = await downloadPromise;
      assertExcelWorkbook(fs.readFileSync(await download.path()), 'Ledger Excel export');
      return 'Ledger print/PDF and journal-line XLSX verified';
    });

    await runCheck('Role selection and audit filter controls work across their full lists', async () => {
      await page.goto(`${WEB_BASE}/admin/roles`, { waitUntil: 'domcontentloaded' });
      await page.locator('.roles-page').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('.roles-page h3').waitFor({ state: 'visible', timeout: 10000 });
      const roleButtons = page.locator('.roles-page .panel button');
      const roleCount = await roleButtons.count();
      assert(roleCount > 0, 'No role selection buttons were rendered.');
      for (let index = 0; index < roleCount; index += 1) {
        const roleButton = roleButtons.nth(index);
        const roleName = (await roleButton.locator('b').first().innerText()).trim();
        await roleButton.click();
        assert((await page.locator('.roles-page h3').innerText()).includes(roleName), `Selecting role ${roleName} did not update its permission matrix.`);
      }

      await page.goto(`${WEB_BASE}/admin/audit-logs`, { waitUntil: 'domcontentloaded' });
      const filter = page.locator('.page-header select');
      await filter.waitFor({ state: 'visible', timeout: 8000 });
      await page.waitForFunction(() => {
        const select = document.querySelector('.page-header select');
        return select instanceof HTMLSelectElement && select.options.length > 1;
      }, { timeout: 10000 });
      const optionCount = await filter.locator('option').count();
      assert(optionCount > 1, 'Audit log filter has no modules to select.');
      await filter.selectOption({ index: 1 });
      const selectedModule = await filter.inputValue();
      assert(selectedModule, 'Audit module filter did not retain its selection.');
      const displayedFilter = (await page.locator('.compact-stats').innerText()).toLowerCase();
      assert(displayedFilter.includes(selectedModule.toLowerCase()), 'Audit summary did not reflect the selected module.');
      await filter.selectOption('');
      return `${roleCount} roles and ${optionCount - 1} audit modules selectable`;
    });

    await runCheck('Employee profile tabs, edit modal, attendance link and payslip preview work', async () => {
      await page.goto(`${WEB_BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
      await page.locator('tbody tr').first().locator('button[aria-label="Record actions"]').click();
      await page.locator('.column-menu button').filter({ hasText: 'View Profile' }).click();
      await page.locator('.profile-hero').waitFor({ state: 'visible', timeout: 8000 });
      const tabs = page.locator('.profile-tabs button');
      const tabCount = await tabs.count();
      for (let index = 0; index < tabCount; index += 1) {
        const tab = tabs.nth(index);
        const name = (await tab.innerText()).trim();
        await tab.click();
        assert((await page.locator('.profile-tabs button.active').innerText()).trim() === name, `Employee profile tab ${name} did not activate.`);
        if (name !== 'Overview') assert((await page.locator('.tab-placeholder h2').innerText()).trim() === name, `Employee profile did not show ${name} details.`);
      }
      await page.getByRole('button', { name: 'Edit profile' }).click();
      const editDialog = page.getByRole('dialog').last();
      await editDialog.waitFor({ state: 'visible' });
      await editDialog.getByRole('button', { name: 'Cancel' }).click();
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Payslip PDF' }).click();
      const payslip = await popupPromise;
      await payslip.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
      assert((await payslip.locator('h1').innerText()).includes('salary statement'), 'Payslip preview did not render.');
      await payslip.close();
      const salaryDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Payslip Excel' }).click();
      const salaryDownload = await salaryDownloadPromise;
      assertExcelWorkbook(fs.readFileSync(await salaryDownload.path()), 'Employee payslip Excel export');
      await page.locator('.profile-quick button').filter({ hasText: 'Attendance' }).click();
      assert(new URL(page.url()).pathname === '/hr/attendance', 'Employee attendance shortcut did not navigate to Attendance.');
      return `${tabCount} profile tabs, edit cancel, payslip PDF/XLSX and attendance shortcut verified`;
    });

    await runCheck('Invoice detail navigation, print action and payment validation work', async () => {
      const invoicesResponse = await fetchJson(`${API_BASE}/invoices?pageSize=100`, { headers: authHeaders });
      assert(invoicesResponse.response.ok, `Could not load invoice test candidates: ${invoicesResponse.response.status}`);
      const invoices = invoicesResponse.data.items || invoicesResponse.data;
      const invoice = invoices.find(item => !['Paid', 'Cancelled'].includes(item.status));
      assert(invoice, 'No unpaid invoice is available for a safe payment-dialog test.');

      await page.goto(`${WEB_BASE}/finance/invoices`, { waitUntil: 'domcontentloaded' });
      const invoiceRow = page.locator('tbody tr').filter({ hasText: invoice.invoiceNumber }).first();
      await invoiceRow.waitFor({ state: 'visible', timeout: 10000 });
      await invoiceRow.locator('button[aria-label="Record actions"]').click();
      await page.locator('.column-menu button').filter({ hasText: 'View details' }).click();
      await page.waitForURL(`**/finance/invoices/${invoice.id}`, { timeout: 8000 });
      await page.locator('.invoice-document').waitFor({ state: 'visible', timeout: 8000 });
      const printBefore = await page.evaluate(() => window.__testPrintCount);
      await page.getByRole('button', { name: 'Print' }).click();
      assert(await page.evaluate(() => window.__testPrintCount) > printBefore, 'Invoice print did not invoke the browser print flow.');

      const invoiceExportPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Excel' }).click();
      const invoiceDownload = await invoiceExportPromise;
      assertExcelWorkbook(fs.readFileSync(await invoiceDownload.path()), 'Invoice Excel export');

      const paymentButton = page.getByRole('button', { name: 'Record payment' });
      assert(await paymentButton.isEnabled(), 'Payment action should be available for an unpaid invoice.');
      await paymentButton.click();
      const paymentDialog = page.getByRole('dialog').last();
      await paymentDialog.waitFor({ state: 'visible' });
      const writes = [];
      const onRequest = request => { if (['POST', 'PUT', 'DELETE'].includes(request.method()) && request.url().includes('/api/')) writes.push(request.url()); };
      page.on('request', onRequest);
      await paymentDialog.getByRole('button', { name: 'Save changes' }).click();
      assert(await paymentDialog.locator('.field-error').count() >= 3, 'Payment required fields did not validate.');
      assert(writes.length === 0, 'Invalid payment form wrote to the API.');
      await paymentDialog.getByRole('button', { name: 'Cancel' }).click();
      page.off('request', onRequest);
      return 'Invoice list → detail → print/XLSX → payment validation without changing accounting data';
    });

    await runCheck('Payroll register, period print/export, and payslip workbook', async () => {
      const periodsResult = await fetchJson(`${API_BASE}/payroll/periods`, { headers: authHeaders });
      assert(periodsResult.response.ok, `Could not load payroll periods: ${periodsResult.response.status}`);
      const periods = periodsResult.data?.items || periodsResult.data || [];
      let candidate;
      for (const period of periods.filter(item => item.employeeCount > 0)) {
        const payrollResult = await fetchJson(`${API_BASE}/payroll/periods/${period.id}/payrolls`, { headers: authHeaders });
        if (payrollResult.response.ok && payrollResult.data?.length) { candidate = { period, payrolls: payrollResult.data }; break; }
      }
      assert(candidate, 'No payroll period with existing payslips is available for read-only export tests.');

      await page.goto(`${WEB_BASE}/hr/payroll`, { waitUntil: 'domcontentloaded' });
      const periodRow = page.locator('tbody tr').filter({ hasText: candidate.period.name }).first();
      await periodRow.waitFor({ state: 'visible', timeout: 10000 });
      await periodRow.locator('button[aria-label="Record actions"]').click();
      await page.locator('.column-menu button').filter({ hasText: 'View Employee Payslips' }).click();
      const periodDialog = page.locator('.search-modal').first();
      await periodDialog.getByText(candidate.period.name, { exact: false }).first().waitFor({ state: 'visible' });
      await periodDialog.locator('.responsive-table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });

      const periodDownloadPromise = page.waitForEvent('download');
      await periodDialog.getByRole('button', { name: 'Export Excel' }).click();
      const periodDownload = await periodDownloadPromise;
      assertExcelWorkbook(fs.readFileSync(await periodDownload.path()), 'Payroll register Excel export');

      const printPromise = page.waitForEvent('popup');
      await periodDialog.getByRole('button', { name: 'Print / PDF' }).click();
      const printWindow = await printPromise;
      await printWindow.locator('h1').waitFor({ state: 'visible' });
      assert((await printWindow.locator('h1').innerText()).includes(candidate.period.name), 'Payroll print output did not identify its period.');
      await printWindow.close();

      await periodDialog.getByRole('button', { name: 'View Payslip' }).first().click();
      const payslipDialog = page.locator('#payroll-payslip-dialog');
      await payslipDialog.waitFor({ state: 'visible' });
      const payslipDownloadPromise = page.waitForEvent('download');
      await payslipDialog.getByRole('button', { name: 'Export Excel' }).click();
      const payslipDownload = await payslipDownloadPromise;
      assertExcelWorkbook(fs.readFileSync(await payslipDownload.path()), 'Payroll payslip Excel export');
      return `${candidate.payrolls.length} payroll records exported and print-previewed without posting or changing payroll data`;
    });

    await runCheck('Create dialogs open, required fields validate, and cancel without writing', async () => {
      const pagesWithCreate = [
        ['/hr/employees', /Add employee/i], ['/hr/departments', /Add department/i],
        ['/hr/positions', /Add position/i], ['/hr/attendance', /Check In/i],
        ['/hr/leave', /Request leave/i], ['/hr/payroll', /Create Period/i],
        ['/hr/recruitment', /New Opening/i], ['/hr/performance', /New Review/i],
        ['/hr/benefits', /New Plan/i], ['/hr/documents', /Upload document/i],
        ['/finance/accounts', /New Account/i], ['/finance/invoices', /New invoice/i],
        ['/finance/receivables', /New Customer/i], ['/finance/payables', /New Vendor/i],
        ['/finance/expenses', /Record Expense/i], ['/finance/payments', /Record Payment/i],
        ['/finance/budgets', /New Budget/i], ['/finance/tax', /Add Tax Rate/i],
        ['/admin/users', /Provision User/i],
      ];
      const failures = [];
      for (const [route, buttonName] of pagesWithCreate) {
        await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(120);
        const button = page.getByRole('button', { name: buttonName }).first();
        if (!await button.count()) { failures.push(`${route}: create action is missing`); continue; }
        const writes = [];
        const onRequest = request => { if (['POST', 'PUT', 'DELETE'].includes(request.method()) && request.url().includes('/api/')) writes.push(request.url()); };
        page.on('request', onRequest);
        await button.click();
        const dialog = page.getByRole('dialog').last();
        await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!await dialog.count()) failures.push(`${route}: create action did not open a dialog`);
        else {
          const requiredFields = dialog.locator('.form-field > span b');
          const requiredCount = await requiredFields.count();
          if (requiredCount > 0) {
            await dialog.getByRole('button', { name: 'Save changes' }).click().catch(() => {});
            if (await dialog.locator('.field-error').count() < requiredCount) failures.push(`${route}: required fields did not show validation errors`);
            if (writes.length) failures.push(`${route}: empty required form unexpectedly wrote to the API`);
          }
          await dialog.getByRole('button', { name: 'Cancel' }).click().catch(async () => {
            await dialog.getByRole('button', { name: /Close/i }).click().catch(() => {});
          });
        }
        page.off('request', onRequest);
      }
      assert(failures.length === 0, failures.join('\n'));
      return `${pagesWithCreate.length} create flows opened and safely dismissed`;
    });

    await runCheck('Document upload requires a real file and checkout is visible for open attendance rows', async () => {
      await page.goto(`${WEB_BASE}/hr/documents`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Upload document/i }).click();
      const dialog = page.getByRole('dialog').last();
      const fileInput = dialog.locator('input[type="file"]');
      assert(await fileInput.count() === 1, 'Upload dialog does not contain a file picker.');
      assert((await fileInput.getAttribute('accept') || '').includes('.pdf'), 'File picker does not advertise supported file types.');
      const writes = [];
      const onRequest = request => { if (['POST', 'PUT', 'DELETE'].includes(request.method()) && request.url().includes('/api/documents')) writes.push(request.url()); };
      page.on('request', onRequest);
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      assert(await dialog.locator('.field-error').filter({ hasText: 'File is required' }).count() === 1, 'Missing file did not show an inline validation message.');
      assert(writes.length === 0, 'An empty upload form wrote to the API.');
      page.off('request', onRequest);
      await dialog.getByRole('button', { name: 'Cancel' }).click();

      await page.goto(`${WEB_BASE}/hr/attendance`, { waitUntil: 'domcontentloaded' });
      const checkoutButtons = page.locator('.attendance-checkout');
      const count = await checkoutButtons.count();
      if (count > 0) {
        assert(await checkoutButtons.first().isVisible(), 'Open attendance row has no visible Check Out action.');
        return `file selection is required; ${count} open attendance row(s) expose Check Out; no attendance mutation performed`;
      }
      return 'file selection is required; no open attendance rows exist to verify the conditional Check Out action without changing data';
    });

    await runCheck('Live create → list/API read → UI delete → API absence for reversible modules', async () => {
      const marker = `E2E-${Date.now()}`;
      const departmentResponse = await fetchJson(`${API_BASE}/departments?pageSize=100`, { headers: authHeaders });
      const departments = departmentResponse.data?.items || departmentResponse.data || [];
      const employeeResponse = await fetchJson(`${API_BASE}/employees?pageSize=100`, { headers: authHeaders });
      const employees = employeeResponse.data?.items || employeeResponse.data || [];
      assert(departments.length > 0, 'A department is required for the position create flow.');
      assert(employees.length > 0, 'An employee is required for the performance review create flow.');

      const flows = [
        {
          route: '/finance/receivables', button: /New Customer/i, endpoint: '/customers',
          label: 'Name', values: { Name: `${marker}-Customer` }, rowText: `${marker}-Customer`,
          deleteLabel: 'Delete',
        },
        {
          route: '/finance/payables', button: /New Vendor/i, endpoint: '/vendors',
          label: 'Name', values: { Name: `${marker}-Vendor` }, rowText: `${marker}-Vendor`,
          deleteLabel: 'Delete',
        },
        {
          route: '/finance/accounts', button: /New Account/i, endpoint: '/accounts',
          label: 'Code', values: { Code: `E${Date.now().toString().slice(-7)}`, Name: `${marker}-Account`, Type: 'Expense', Category: 'Test' },
          rowText: `${marker}-Account`, deleteLabel: 'Delete',
        },
        {
          route: '/hr/benefits', button: /New Plan/i, endpoint: '/benefits',
          label: 'Plan Name', values: { 'Plan Name': `${marker}-Benefit`, Provider: 'E2E Test', 'Employer Cost / mo': '1', 'Employee Cost / mo': '1' },
          rowText: `${marker}-Benefit`, deleteLabel: 'Delete',
        },
        {
          route: '/finance/tax', button: /Add Tax Rate/i, endpoint: '/finance/tax',
          label: 'Rule Name', values: { 'Rule Name': `${marker}-Tax`, 'Tax Rate (%)': '1', Category: 'Services' },
          rowText: `${marker}-Tax`, deleteLabel: 'Delete Rule', confirm: true,
        },
        {
          route: '/hr/departments', button: /Add department/i, endpoint: '/departments',
          label: 'Name', values: { Name: `${marker}-Department`, 'Annual Budget': '1' },
          rowText: `${marker}-Department`, deleteLabel: 'Delete',
        },
        {
          route: '/hr/positions', button: /Add position/i, endpoint: '/positions',
          label: 'Job Title', values: { 'Job Title': `${marker}-Position`, Department: departments[0].name, 'Min Salary': '1', 'Max Salary': '2' },
          rowText: `${marker}-Position`, deleteLabel: 'Delete',
        },
        {
          route: '/hr/performance', button: /New Review/i, endpoint: '/performance/reviews',
          label: 'Review Period', values: { Employee: `${employees[0].firstName} ${employees[0].lastName}`, 'Review Period': `${marker}`, Score: '1', 'Goals Complete %': '1' },
          rowText: `${marker}`, deleteLabel: 'Delete',
        },
      ];

      const completed = [];
      const cleanupFailures = [];
      for (const flow of flows) {
        let createdId = null;
        let created = false;
        try {
          await page.goto(`${WEB_BASE}${flow.route}`, { waitUntil: 'domcontentloaded' });
          await page.locator('.table-panel').waitFor({ state: 'visible', timeout: 10000 });
          await page.getByRole('button', { name: flow.button }).click();
          const dialog = page.getByRole('dialog').last();
          await dialog.waitFor({ state: 'visible' });
          for (const [label, value] of Object.entries(flow.values)) {
            const field = dialog.locator('.form-field').filter({ hasText: label });
            const input = field.locator('input, select').first();
            if (await input.count()) {
              if (await input.evaluate(node => node.tagName === 'SELECT')) await input.selectOption({ label: value });
              else await input.fill(value);
            }
          }
          const expectedPath = `${API_BASE}${flow.endpoint}`;
          const createResponsePromise = page.waitForResponse(response => response.url().split('?')[0] === expectedPath && response.request().method() === 'POST', { timeout: 10000 });
          await dialog.getByRole('button', { name: 'Save changes' }).click();
          const createResponse = await createResponsePromise;
          const createBody = await createResponse.json().catch(() => null);
          assert(createResponse.ok, `${flow.route} create returned HTTP ${createResponse.status()}: ${JSON.stringify(createBody)}`);
          createdId = createBody?.id;
          assert(createdId, `${flow.route} create response did not include the created record id.`);
          created = true;

          const liveList = await fetchJson(`${API_BASE}${flow.endpoint}${flow.endpoint.includes('?') ? '&' : '?'}pageSize=100`, { headers: authHeaders });
          assert(liveList.response.ok, `${flow.route} list API returned HTTP ${liveList.response.status}.`);
          const records = Array.isArray(liveList.data) ? liveList.data : liveList.data?.items || [];
          assert(records.some(item => item.id === createdId), `${flow.route} created record was not readable from the live API.`);

          // Remount the screen to verify persisted data, not just optimistic/local form state.
          await page.goto(`${WEB_BASE}${flow.route}`, { waitUntil: 'domcontentloaded' });
          await page.locator('.table-panel').waitFor({ state: 'visible', timeout: 10000 });
          await page.getByRole('textbox', { name: 'Search records' }).fill(flow.rowText);
          const createdRow = page.locator('tbody tr').filter({ hasText: flow.rowText }).first();
          await createdRow.waitFor({ state: 'visible', timeout: 10000 });
          await createdRow.locator('button[aria-label="Record actions"]').click();
          if (flow.confirm) page.once('dialog', dialogEvent => dialogEvent.accept());
          await page.locator('.column-menu button').filter({ hasText: flow.deleteLabel }).click();
          const deleteResponsePromise = page.waitForResponse(response => response.url().split('?')[0] === `${expectedPath}/${createdId}` && response.request().method() === 'DELETE', { timeout: 10000 });
          const deleteResponse = await deleteResponsePromise;
          assert(deleteResponse.ok, `${flow.route} delete returned HTTP ${deleteResponse.status()}.`);
          await createdRow.waitFor({ state: 'detached', timeout: 10000 });
          const afterDelete = await fetchJson(`${API_BASE}${flow.endpoint}${flow.endpoint.includes('?') ? '&' : '?'}pageSize=100`, { headers: authHeaders });
          const remaining = Array.isArray(afterDelete.data) ? afterDelete.data : afterDelete.data?.items || [];
          assert(!remaining.some(item => item.id === createdId), `${flow.route} deleted record still appears in the live API.`);
          completed.push(flow.route);
        } catch (error) {
          if (created && createdId) {
            const cleanup = await fetchJson(`${API_BASE}${flow.endpoint}/${createdId}`, { method: 'DELETE', headers: authHeaders }).catch(() => null);
            if (!cleanup?.response?.ok && cleanup?.response?.status !== 404) cleanupFailures.push(`${flow.route} record ${createdId} cleanup returned ${cleanup?.response?.status || 'no response'}`);
          }
          throw new Error(`${flow.route}: ${error.message}${cleanupFailures.length ? `; ${cleanupFailures.join('; ')}` : ''}`);
        }
      }
      return `${completed.length} reversible CRUD flows completed end-to-end: ${completed.join(', ')}`;
    });

    await runCheck('Data row detail actions open and close their views', async () => {
      const failures = [];
      const detailPages = [
        ['/hr/employees', 'View Profile', '.profile-hero'],
        ['/admin/audit-logs', 'Inspect Details', '.search-dialog'],
      ];
      for (const [route, action, expected] of detailPages) {
        await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(180);
        const actionsButton = page.locator('button[aria-label="Record actions"]').first();
        if (!await actionsButton.count()) { failures.push(`${route}: no row action available`); continue; }
        await actionsButton.click();
        const actionButton = page.locator('.column-menu button').filter({ hasText: action }).first();
        if (!await actionButton.count()) { failures.push(`${route}: "${action}" is not available`); continue; }
        await actionButton.click();
        await page.locator(expected).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!await page.locator(expected).count()) failures.push(`${route}: action did not open expected view`);
        await page.locator('.search-modal .modal-close').click().catch(() => {});
      }
      assert(failures.length === 0, failures.join('\n'));
      return `${detailPages.length} record detail actions`;
    });

    await runCheck('Admin edit flows through login cards and the target account sidebar, then restores data', async () => {
      const usersResult = await fetchJson(`${API_BASE}/admin/users?pageSize=100`, { headers: authHeaders });
      assert(usersResult.response.ok, `Could not load users for live integration test: ${usersResult.response.status}`);
      const hrUser = usersResult.data.items.find(user => user.email === 'hr@indigo.co');
      assert(hrUser, 'The HR demo account is required for the live user update test.');
      const original = { fullName: hrUser.fullName, department: hrUser.department, role: hrUser.roles[0] };
      const changedName = `${original.fullName} Live Check ${Date.now().toString().slice(-5)}`;
      let changed = false;

      try {
        await page.goto(`${WEB_BASE}/admin/users`, { waitUntil: 'domcontentloaded' });
        const targetRow = page.locator('tbody tr').filter({ hasText: 'hr@indigo.co' }).first();
        await targetRow.waitFor({ state: 'visible', timeout: 10000 });
        await targetRow.locator('button[aria-label="Record actions"]').click();
        await page.locator('.column-menu button').filter({ hasText: 'Edit' }).click();
        const editDialog = page.getByRole('dialog').last();
        const nameField = editDialog.locator('label').filter({ hasText: 'Full Name' }).locator('input');
        await nameField.fill(changedName);
        const updateResponse = page.waitForResponse(response => response.url().includes(`/api/admin/users/${hrUser.id}`) && response.request().method() === 'PUT');
        const refreshedRolesResponse = page.waitForResponse(response => response.url().endsWith('/api/admin/users/roles') && response.request().method() === 'GET');
        await editDialog.getByRole('button', { name: 'Save changes' }).click();
        const update = await updateResponse;
        assert(update.ok(), `User update returned ${update.status()}.`);
        const rolesResponse = await refreshedRolesResponse;
        assert(rolesResponse.ok(), `Refreshing the admin user list's roles returned ${rolesResponse.status()}.`);
        changed = true;

        const directoryAfterEdit = await fetchJson(`${API_BASE}/auth/login-accounts`);
        assert(directoryAfterEdit.response.ok && directoryAfterEdit.data.find(user => user.email === 'hr@indigo.co')?.fullName === changedName, 'Login account API did not reflect the saved full name.');

        await page.locator('#btn-user-logout').click();
        await page.getByText(changedName, { exact: true }).first().waitFor({ state: 'visible', timeout: 8000 });
        await page.locator('#input-login-email').fill('hr@indigo.co');
        await page.locator('#input-login-password').fill('Hr@123456');
        await page.locator('#btn-submit-login').click();
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        await page.locator('.sidebar-bottom .workspace').getByText(changedName, { exact: true }).waitFor({ state: 'visible', timeout: 8000 });
        assert((await page.locator('.sidebar-bottom .workspace').innerText()).includes('HR Manager'), 'Updated account role was not displayed in the sidebar.');
        await page.locator('#btn-user-logout').click();
        await page.locator('#input-login-email').fill('admin@indigo.co');
        await page.locator('#input-login-password').fill('Admin@123456');
        await page.locator('#btn-submit-login').click();
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        return 'Admin edit → live login card → HR login/sidebar verified';
      } finally {
        if (changed) {
          const restore = await fetchJson(`${API_BASE}/admin/users/${hrUser.id}`, {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: original.fullName, department: original.department, role: original.role, password: '' }),
          });
          assert(restore.response.ok, `Could not restore the HR account after the test: ${restore.response.status}`);
          const restoredDirectory = await fetchJson(`${API_BASE}/auth/login-accounts`);
          assert(restoredDirectory.data.find(user => user.email === 'hr@indigo.co')?.fullName === original.fullName, 'The HR account name was not restored after the test.');
        }
      }
    });

    await runCheck('Logout clears the session and returns to login', async () => {
      await page.locator('.search-modal .modal-close').click().catch(() => {});
      await page.locator('#btn-user-logout').click();
      await page.locator('#btn-submit-login').waitFor({ state: 'visible', timeout: 6000 });
      assert(new URL(page.url()).pathname === '/login', `Logout left the browser at ${page.url()}`);
      return 'Session ended and login screen rendered';
    });

    await runCheck('No browser runtime, console, or authenticated API errors', async () => {
      assert(pageErrors.length === 0, `Browser runtime errors: ${pageErrors.join(' | ')}`);
      assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(' | ')}`);
      assert(apiErrors.length === 0, `Authenticated API errors: ${apiErrors.join(' | ')}`);
      return '0 page exceptions, console errors, or authenticated API errors';
    });
  } finally {
    await browser.close();
  }

  result.pageErrors = pageErrors;
  result.apiErrors = apiErrors;
  result.consoleErrors = consoleErrors;
  result.summary = { passed: result.passed.length, failed: result.failed.length, skipped: result.skipped.length, routes: result.routePages.length, apiEndpoints: result.apiEndpoints.length };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'results.md'), [
    '# Full System Test Results', '',
    `- Passed checks: ${result.summary.passed}`,
    `- Failed checks: ${result.summary.failed}`,
    `- Pages rendered: ${result.summary.routes}/${routes.length}`,
    `- API read endpoints: ${result.summary.apiEndpoints}/${readEndpoints.length}`,
    `- Browser runtime errors: ${pageErrors.length}`,
    `- Browser console errors: ${consoleErrors.length}`,
    `- Authenticated API errors: ${apiErrors.length}`, '',
    '## Passed checks', '',
    ...result.passed.map(item => `- ${item.name}${item.detail ? ` — ${item.detail}` : ''}`), '',
    '## Scope note', '',
    'High-impact actions that post or alter financial, payroll, attendance, leave, or employment records were not executed against the shared Development database. Run those workflows against an isolated seeded test database before treating them as verified.', '',
    '## Failures', '',
    ...(result.failed.length ? result.failed.map(item => `- ${item.name}: ${item.error}`) : ['- None']),
  ].join('\n'));

  console.log(`\nFull system test summary: ${JSON.stringify(result.summary)}`);
  if (result.failed.length || pageErrors.length || apiErrors.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
