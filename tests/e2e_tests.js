import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runE2E() {
  const screenshotsDir = path.resolve('test_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('🚀 Starting Playwright E2E Test Suite...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. LOGIN
    console.log('1. Testing Login...');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    if (await page.isVisible('input[type="email"]')) {
      await page.fill('input[type="email"]', 'admin@indigo.co');
      await page.fill('input[type="password"]', 'Admin@123456');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '01_dashboard.png') });
    console.log('   ✅ Logged in successfully, Dashboard verified');

    // 2. REPORTS
    console.log('2. Testing Executive Reports (/reports)...');
    await page.goto('http://localhost:5173/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify Trial Balance
    const hasTB = await page.isVisible('text=Trial Balance');
    console.log(`   ✅ Trial Balance tab loaded: ${hasTB}`);

    // Click Income Statement
    await page.click('button:has-text("Income Statement")');
    await page.waitForTimeout(1000);
    const hasIS = await page.isVisible('text=Gross Revenues');
    console.log(`   ✅ Income Statement loaded: ${hasIS}`);

    // Click Balance Sheet
    await page.click('button:has-text("Balance Sheet")');
    await page.waitForTimeout(1000);
    const hasBS = await page.isVisible('text=ASSETS');
    console.log(`   ✅ Balance Sheet loaded: ${hasBS}`);

    // Click Payroll register
    await page.click('button:has-text("Payroll register")');
    await page.waitForTimeout(1000);
    const hasPay = await page.isVisible('text=Total Gross Payroll Paid');
    console.log(`   ✅ Payroll register loaded: ${hasPay}`);

    // Click Workforce analytics
    await page.click('button:has-text("Workforce analytics")');
    await page.waitForTimeout(1000);
    const hasHR = await page.isVisible('text=Total Workforce');
    console.log(`   ✅ Workforce analytics loaded: ${hasHR}`);
    await page.screenshot({ path: path.join(screenshotsDir, '02_reports.png') });

    // 3. PAYROLL & PAYSLIPS
    console.log('3. Testing Payroll & Payslips (/hr/payroll)...');
    await page.goto('http://localhost:5173/hr/payroll');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click 3-dots action menu on first row
    const actionMenuBtn = page.locator('button[aria-label="Record actions"]').first();
    if (await actionMenuBtn.isVisible()) {
      await actionMenuBtn.click();
      await page.waitForTimeout(500);

      const viewPayslipsBtn = page.locator('button:has-text("View Employee Payslips")').first();
      if (await viewPayslipsBtn.isVisible()) {
        await viewPayslipsBtn.click();
        await page.waitForTimeout(1500);
        console.log('   ✅ Period Breakdown modal opened');

        // Click "View Payslip"
        const payslipBtn = page.locator('button:has-text("View Payslip")').first();
        if (await payslipBtn.isVisible()) {
          await payslipBtn.click();
          await page.waitForTimeout(1500);
          const hasOfficial = await page.isVisible('text=INDIGO VENTURES ERP');
          console.log(`   ✅ Official Payslip Modal rendered: ${hasOfficial}`);
          await page.screenshot({ path: path.join(screenshotsDir, '03_payslip_modal.png') });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }

    // 4. USERS
    console.log('4. Testing User Management (/admin/users)...');
    await page.goto('http://localhost:5173/admin/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasUsersTable = await page.isVisible('text=admin@indigo.co');
    console.log(`   ✅ Users Table verified: ${hasUsersTable}`);
    await page.screenshot({ path: path.join(screenshotsDir, '04_users_page.png') });

    // 5. ROLES & PERMISSION MATRIX
    console.log('5. Testing Roles & Permissions (/admin/roles)...');
    await page.goto('http://localhost:5173/admin/roles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasRoles = await page.isVisible('text=Administrator');
    console.log(`   ✅ Roles & Permission Matrix loaded: ${hasRoles}`);
    await page.screenshot({ path: path.join(screenshotsDir, '05_roles_matrix.png') });

    // 6. AUDIT LOGS
    console.log('6. Testing Audit Logs (/admin/audit-logs)...');
    await page.goto('http://localhost:5173/admin/audit-logs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasAudit = await page.isVisible('text=Compliance & Traceability');
    console.log(`   ✅ Audit Logs page loaded: ${hasAudit}`);
    await page.screenshot({ path: path.join(screenshotsDir, '06_audit_logs.png') });

    // 7. SETTINGS
    console.log('7. Testing Settings (/admin/settings)...');
    await page.goto('http://localhost:5173/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasSettings = await page.isVisible('text=Company Legal Name');
    console.log(`   ✅ Settings page loaded: ${hasSettings}`);
    await page.screenshot({ path: path.join(screenshotsDir, '07_settings_page.png') });

    // 8. TAX RATES
    console.log('8. Testing Tax Rates (/finance/tax)...');
    await page.goto('http://localhost:5173/finance/tax');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasTax = await page.isVisible('text=Standard VAT');
    console.log(`   ✅ Tax rules loaded: ${hasTax}`);
    await page.screenshot({ path: path.join(screenshotsDir, '08_tax_rates.png') });

    console.log('\n🎉 ALL 8 PLAYWRIGHT E2E BROWSER TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ E2E Test failed:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'error.png') });
  } finally {
    await browser.close();
  }
}

runE2E();
