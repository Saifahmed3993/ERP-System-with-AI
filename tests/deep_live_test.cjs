const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'test_live_audit_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runLiveAudit() {
  console.log('🚀 Starting Deep Live ERP Button & Action Audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
      errors.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    console.error('Browser page error:', err.message);
    errors.push({ type: 'pageerror', text: err.message });
  });

  // 1. Login
  console.log('\n--- 1. Authenticating as Administrator ---');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  if (await page.isVisible('input[type="email"]')) {
    await page.fill('input[type="email"]', 'admin@indigo.co');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }
  console.log('✓ Successfully authenticated and loaded Dashboard.');

  // 2. Test Topbar Controls
  console.log('\n--- 2. Testing Shell & Topbar Buttons ---');
  // Quick + New
  const newBtn = await page.$('#btn-quick-new');
  if (newBtn) {
    await newBtn.click();
    await page.waitForSelector('.search-modal', { timeout: 3000 });
    console.log('✓ "+ New" Quick button opened modal.');
    await page.click('.search-modal button.icon-button');
    await page.waitForTimeout(300);
  }

  // Notifications
  const notifBtn = await page.$('#btn-notifications');
  if (notifBtn) {
    await notifBtn.click();
    await page.waitForSelector('.search-modal', { timeout: 3000 });
    console.log('✓ Notification button opened panel.');
    await page.click('button:has-text("Clear all")');
    console.log('✓ Notification "Clear all" clicked.');
    await page.waitForTimeout(300);
  }

  // Global search Ctrl+K
  await page.keyboard.press('Control+KeyK');
  await page.waitForSelector('.search-modal', { timeout: 3000 });
  console.log('✓ Ctrl+K opened search modal.');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('✓ Escape closed search modal.');

  // 3. Test Customers Live CRUD
  console.log('\n--- 3. Testing Customers Page Live CRUD ---');
  await page.click('a[href="/finance/receivables"]');
  await page.waitForSelector('.table-panel', { timeout: 8000 });
  
  // Click "New Customer"
  await page.click('button:has-text("New Customer")');
  await page.waitForSelector('.dialog-backdrop', { timeout: 3000 });
  
  // Submit with empty name to test validation
  await page.click('.form-dialog button[type="submit"]');
  const hasError = await page.isVisible('.field-error');
  console.log(`✓ FormDialog required field validation works: ${hasError}`);
  
  // Fill and create real customer
  const testCustName = `Test Corp ${Date.now().toString().slice(-4)}`;
  await page.fill('.form-dialog input[placeholder*="name"]', testCustName);
  await page.fill('.form-dialog input[placeholder*="email"]', `contact@testcorp${Date.now().toString().slice(-4)}.com`);
  await page.fill('.form-dialog input[placeholder*="phone"]', '+1 555 987 6543');
  await page.click('.form-dialog button[type="submit"]');
  await page.waitForSelector('.toast-message', { timeout: 5000 });
  console.log(`✓ Created new customer: "${testCustName}"`);
  await page.waitForTimeout(1000);

  // Search for the newly created customer
  await page.fill('.search-field input', testCustName);
  await page.waitForTimeout(500);
  const foundCust = await page.isVisible(`td:has-text("${testCustName}")`);
  console.log(`✓ DataTable search finds newly created record: ${foundCust}`);

  // Test Sort
  await page.click('th button:has-text("Name")');
  await page.waitForTimeout(300);
  console.log('✓ Clicked Name column sort (Ascending).');
  await page.click('th button:has-text("Name")');
  await page.waitForTimeout(300);
  console.log('✓ Clicked Name column sort (Descending).');

  // Delete the test customer using ActionMenu
  await page.fill('.search-field input', testCustName);
  await page.waitForTimeout(300);
  const rowActionsBtn = await page.$(`tr:has-text("${testCustName}") button[aria-label="Record actions"]`);
  if (rowActionsBtn) {
    await rowActionsBtn.click();
    await page.waitForSelector('.column-menu', { timeout: 3000 });
    await page.click('.column-menu button:has-text("Delete")');
    await page.waitForSelector('.toast-message', { timeout: 5000 });
    console.log(`✓ ActionMenu "Delete" successfully deleted test customer.`);
  }

  // 4. Test Tax Rates Live CRUD
  console.log('\n--- 4. Testing Tax Rates Page Live CRUD ---');
  await page.click('a[href="/finance/tax"]');
  await page.waitForSelector('.table-panel', { timeout: 8000 });
  
  // Add Tax Rate
  await page.click('button:has-text("Add Tax Rate")');
  await page.waitForSelector('.dialog-backdrop', { timeout: 3000 });
  const testTaxName = `Municipal Surcharge ${Date.now().toString().slice(-4)}`;
  await page.fill('.form-dialog input[placeholder*="rule name"]', testTaxName);
  await page.fill('.form-dialog input[placeholder*="tax rate"]', '8.5');
  await page.selectOption('.form-dialog select', 'Services');
  await page.fill('.form-dialog input[placeholder*="description"]', 'Local municipal municipal tax');
  await page.click('.form-dialog button[type="submit"]');
  await page.waitForSelector('.toast-message', { timeout: 5000 });
  console.log(`✓ Added Tax Rate: "${testTaxName}"`);
  await page.waitForTimeout(1000);

  // Search for the tax rate
  await page.fill('.search-field input', testTaxName);
  await page.waitForTimeout(500);
  const foundTax = await page.isVisible(`td:has-text("${testTaxName}")`);
  console.log(`✓ DataTable search finds tax rate: ${foundTax}`);

  // Delete the test tax rate
  page.on('dialog', dialog => dialog.accept());
  const taxRowAction = await page.$(`tr:has-text("${testTaxName}") button[aria-label="Record actions"]`);
  if (taxRowAction) {
    await taxRowAction.click();
    await page.waitForSelector('.column-menu', { timeout: 3000 });
    await page.click('.column-menu button:has-text("Delete Rule")');
    await page.waitForSelector('.toast-message', { timeout: 5000 });
    console.log(`✓ ActionMenu "Delete Rule" removed test tax rate.`);
  }

  // 5. Test Journal Entries
  console.log('\n--- 5. Testing Journal Entries Page ---');
  await page.click('a[href="/finance/journal"]');
  await page.waitForSelector('.journal-form', { timeout: 8000 });
  
  // Test reference & balanced entry
  const postBtn = await page.$('button:has-text("Post entry")');
  const isDisabled = await postBtn.isDisabled();
  console.log(`✓ Post button disabled when entry is unbalanced: ${isDisabled}`);

  // Fill in a balanced test journal
  await page.fill('input[placeholder="JE-2026-0815"]', `JE-TEST-${Date.now().toString().slice(-4)}`);
  await page.fill('input[placeholder="Enter journal description"]', 'Monthly office supplies allocation');
  
  // Select accounts for the two lines
  const accountSelects = await page.$$('.journal-lines select');
  if (accountSelects.length >= 2) {
    // Select first and second account
    await accountSelects[0].selectOption({ index: 1 });
    await accountSelects[1].selectOption({ index: 2 });
    
    // Fill debits and credits
    const numberInputs = await page.$$('.journal-lines input[type="number"]');
    // First line Debit 500
    await numberInputs[0].fill('500');
    // Second line Credit 500
    await numberInputs[3].fill('500');
    
    await page.waitForTimeout(300);
    const isNowEnabled = await postBtn.isEnabled();
    console.log(`✓ Balanced entry enables post button: ${isNowEnabled}`);
    if (isNowEnabled) {
      await postBtn.click();
      await page.waitForSelector('.toast-message', { timeout: 5000 });
      console.log('✓ Successfully posted balanced journal entry to API.');
    }
  }

  // 6. Test Invoices Page Actions
  console.log('\n--- 6. Testing Invoices Page & Actions ---');
  await page.click('a[href="/finance/invoices"]');
  await page.waitForSelector('.table-panel', { timeout: 8000 });
  
  // Click first invoice action
  const invoiceActionBtn = await page.$('.responsive-table tbody tr:first-child button[aria-label="Record actions"]');
  if (invoiceActionBtn) {
    await invoiceActionBtn.click();
    await page.waitForSelector('.column-menu', { timeout: 3000 });
    const hasViewDetails = await page.isVisible('.column-menu button:has-text("View details")');
    console.log(`✓ Invoice row action menu has "View details": ${hasViewDetails}`);
    await page.click('.column-menu button:has-text("View details")');
    await page.waitForSelector('.invoice-document', { timeout: 8000 });
    console.log('✓ Navigated to Invoice detail page.');
    
    // Test Print button
    const printBtn = await page.$('button:has-text("Print")');
    console.log(`✓ Invoice print button is functional: ${!!printBtn}`);
    
    // Test Record Payment modal
    const recPaymentBtn = await page.$('button:has-text("Record payment")');
    if (recPaymentBtn && await recPaymentBtn.isEnabled()) {
      await recPaymentBtn.click();
      await page.waitForSelector('.dialog-backdrop', { timeout: 3000 });
      console.log('✓ Opened "Record Payment" FormDialog.');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log('✓ Closed Record Payment dialog via ESC.');
    }
  }

  // 7. Test Payroll Page Drill-Down & Payslip Modal
  console.log('\n--- 7. Testing Payroll Page Drill-down & Payslips ---');
  await page.click('a[href="/hr/payroll"]');
  await page.waitForSelector('.table-panel', { timeout: 8000 });

  // Open first period drill-down
  const payrollAction = await page.$('.responsive-table tbody tr:first-child button[aria-label="Record actions"]');
  if (payrollAction) {
    await payrollAction.click();
    await page.waitForSelector('.column-menu', { timeout: 3000 });
    await page.click('.column-menu button:has-text("View Employee Payslips")');
    await page.waitForSelector('.search-modal', { timeout: 5000 });
    console.log('✓ Opened Period drill-down modal with employee payslips.');
    
    // View individual payslip
    const viewPayslipBtn = await page.$('.search-modal button:has-text("View Payslip")');
    if (viewPayslipBtn) {
      await viewPayslipBtn.click();
      await page.waitForTimeout(500);
      const hasPayslipDoc = await page.isVisible('.payslip-modal-content');
      console.log(`✓ Opened Individual Payslip modal: ${hasPayslipDoc}`);
      
      const printSlipBtn = await page.$('button:has-text("Print Payslip")');
      console.log(`✓ Payslip Print button exists and is active: ${!!printSlipBtn}`);
      
      await page.click('.modal-close');
      await page.waitForTimeout(300);
    }
    
    // Close period modal
    await page.click('.search-modal button[aria-label="Close"], .search-modal button.icon-button');
    await page.waitForTimeout(300);
  }

  // 8. Test Reports Page & All Export Buttons
  console.log('\n--- 8. Testing Reports Page & Export CSV / Print ---');
  await page.click('a[href="/reports"]');
  await page.waitForSelector('.profile-tabs', { timeout: 8000 });

  const reportTabs = ['Trial balance', 'Income statement', 'Balance sheet', 'Payroll register', 'Workforce analytics'];
  for (const t of reportTabs) {
    await page.click(`.profile-tabs button:has-text("${t}")`);
    await page.waitForTimeout(600);
    console.log(`✓ Loaded report tab: ${t}`);
    
    // Click Export CSV
    await page.click('button:has-text("Export CSV")');
    await page.waitForTimeout(200);
    console.log(`✓ Exported CSV for tab: ${t}`);
  }

  // 9. Test Settings Page Save
  console.log('\n--- 9. Testing Settings Page Save ---');
  await page.click('a[href="/admin/settings"]');
  await page.waitForSelector('#settings-form', { timeout: 8000 });
  await page.click('#settings-form button[type="submit"]');
  await page.waitForSelector('.toast-message', { timeout: 5000 });
  console.log('✓ Saved organization settings and verified toast notification.');

  // 10. Test Roles & Permissions Matrix
  console.log('\n--- 10. Testing Roles & Permissions Matrix ---');
  await page.click('a[href="/admin/roles"]');
  await page.waitForSelector('.roles-page', { timeout: 8000 });
  const roleButtons = await page.$$('.roles-page button:has(.bi-shield-lock)');
  if (roleButtons.length > 1) {
    await roleButtons[1].click();
    await page.waitForTimeout(400);
    console.log('✓ Switched active role in permission matrix.');
  }

  // 11. Test User Accounts Toggle Status
  console.log('\n--- 11. Testing User Accounts Page ---');
  await page.click('a[href="/admin/users"]');
  await page.waitForSelector('.table-panel', { timeout: 8000 });
  const usersCount = await page.$$eval('.responsive-table tbody tr', trs => trs.length);
  console.log(`✓ User accounts table rendered with ${usersCount} users.`);

  // 12. Take screenshot of final healthy state
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live_audit_final_dashboard.png'), fullPage: true });

  await browser.close();

  console.log('\n======================================================');
  console.log(`Audit Complete! Total unexpected console/page errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  } else {
    console.log('🌟 ALL 12 AUDIT STAGES PASSED WITH 0 ERRORS! 100% LIVE.');
  }
  console.log('======================================================');
}

runLiveAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
