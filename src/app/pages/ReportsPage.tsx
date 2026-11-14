import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { downloadExcel, openPrintDocument, printableTable, type SheetValue } from '../../shared/components/exportUtils';

export function ReportsPage({ notify }: { notify: (m: string) => void }) {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'income-statement' | 'balance-sheet' | 'payroll' | 'hr'>('trial-balance');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [tbData, setTbData] = useState<any>(null);
  const [isData, setIsData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [hrData, setHrData] = useState<any>(null);

  const fetchTabReport = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'trial-balance') {
        const res = await api.get<any>('/reports/trial-balance');
        setTbData(res);
      } else if (tab === 'income-statement') {
        const res = await api.get<any>('/reports/income-statement');
        setIsData(res);
      } else if (tab === 'balance-sheet') {
        const res = await api.get<any>('/reports/balance-sheet');
        setBsData(res);
      } else if (tab === 'payroll') {
        const res = await api.get<any>('/reports/payroll-summary');
        setPayrollData(res);
      } else if (tab === 'hr') {
        const res = await api.get<any>('/reports/hr-summary');
        setHrData(res);
      }
    } catch (err: any) {
      notify(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabReport(activeTab);
  }, [activeTab]);

  const getReportSheet = (): { title: string; sheetName: string; headers: string[]; rows: SheetValue[][]; sectionRows?: number[]; totalRows?: number[] } | null => {
    if (activeTab === 'trial-balance' && tbData) {
      const rows: SheetValue[][] = (tbData.items || []).map((item: any) => [item.code, item.name, item.type, item.debit, item.credit]);
      const totalRows = [rows.length];
      rows.push(['TOTAL DEBIT / CREDIT', '', '', tbData.totalDebit, tbData.totalCredit]);
      return { title: 'Trial balance', sheetName: 'Trial Balance', headers: ['Account code', 'Account name', 'Type', 'Debit (EGP)', 'Credit (EGP)'], rows, totalRows };
    }
    if (activeTab === 'income-statement' && isData) {
      const rows: SheetValue[][] = [['REVENUE', '', '', '']];
      const sectionRows = [0];
      (isData.revenues || []).forEach((item: any) => rows.push(['Revenue', item.code, item.name, item.amount]));
      sectionRows.push(rows.length); rows.push(['OPERATING EXPENSES', '', '', '']);
      (isData.expenses || []).forEach((item: any) => rows.push(['Expense', item.code, item.name, item.amount]));
      const totalRows = [rows.length]; rows.push(['NET INCOME', '', '', isData.netIncome]);
      return { title: 'Income statement', sheetName: 'Income Statement', headers: ['Section', 'Account code', 'Account name', 'Amount (EGP)'], rows, sectionRows, totalRows };
    }
    if (activeTab === 'balance-sheet' && bsData) {
      const rows: SheetValue[][] = [['ASSETS', '', '', '']];
      const sectionRows = [0];
      (bsData.assets || []).forEach((item: any) => rows.push(['Asset', item.code, item.name, item.amount]));
      sectionRows.push(rows.length); rows.push(['LIABILITIES', '', '', '']);
      (bsData.liabilities || []).forEach((item: any) => rows.push(['Liability', item.code, item.name, item.amount]));
      sectionRows.push(rows.length); rows.push(['EQUITY', '', '', '']);
      (bsData.equity || []).forEach((item: any) => rows.push(['Equity', item.code, item.name, item.amount]));
      const totalRows = [rows.length]; rows.push(['TOTAL LIABILITIES + EQUITY', '', '', bsData.totalLiabilitiesAndEquity]);
      return { title: 'Balance sheet', sheetName: 'Balance Sheet', headers: ['Section', 'Account code', 'Account name', 'Amount (EGP)'], rows, sectionRows, totalRows };
    }
    if (activeTab === 'payroll' && payrollData) {
      const rows: SheetValue[][] = (payrollData.periods || []).map((period: any) => [period.name, period.payDate, period.employeeCount, period.totalGross, period.totalDeductions, period.totalNet, period.status]);
      const totalRows = [rows.length];
      rows.push(['TOTAL', '', payrollData.periodsCount, payrollData.totalGrossPaid, payrollData.totalDeductions, payrollData.totalNetPaid, '']);
      return { title: 'Payroll register', sheetName: 'Payroll', headers: ['Period', 'Pay date', 'Employees', 'Gross (EGP)', 'Deductions (EGP)', 'Net (EGP)', 'Status'], rows, totalRows };
    }
    if (activeTab === 'hr' && hrData) {
      const rows: SheetValue[][] = [['WORKFORCE SUMMARY', '', '', '']];
      const sectionRows = [0];
      rows.push(['Total workforce', hrData.totalEmployees, '', '']);
      rows.push(['Active employees', hrData.activeEmployees, '', '']);
      rows.push(['On leave', hrData.onLeaveEmployees, '', '']);
      rows.push(['Monthly payroll (EGP)', hrData.totalMonthlyPayroll, '', '']);
      rows.push(['Average salary (EGP)', hrData.avgSalary, '', '']);
      sectionRows.push(rows.length); rows.push(['DEPARTMENT BREAKDOWN', '', '', '']);
      (hrData.byDepartment || []).forEach((item: any) => rows.push([item.department, item.count, item.totalSalary, '']));
      sectionRows.push(rows.length); rows.push(['EMPLOYMENT STATUS', '', '', '']);
      (hrData.byStatus || []).forEach((item: any) => rows.push([item.status, item.count, '', '']));
      sectionRows.push(rows.length); rows.push(['CONTRACT TYPES', '', '', '']);
      (hrData.byType || []).forEach((item: any) => rows.push([item.type, item.count, '', '']));
      return { title: 'Workforce analytics', sheetName: 'Workforce', headers: ['Metric / group', 'Count', 'Monthly payroll (EGP)', 'Notes'], rows, sectionRows };
    }
    return null;
  };

  const handlePrint = () => {
    const report = getReportSheet();
    if (!report) { notify('The current report is still loading.'); return; }
    const opened = openPrintDocument(report.title, 'Executive report · EGP unless noted', printableTable(report.headers, report.rows, report.totalRows?.length ? report.rows[report.totalRows[0]] : undefined));
    if (!opened) notify('Allow pop-ups to open the print-ready report.');
  };

  const handleExportExcel = () => {
    const report = getReportSheet();
    if (!report) { notify('The current report is still loading.'); return; }
    downloadExcel({ fileName: `indigo_${activeTab}_report`, ...report, subtitle: `Generated ${new Date().toLocaleDateString()} · EGP unless noted` });
    notify('Excel workbook downloaded.');
  };

  return (
    <>
      <PageHeader
        eyebrow="Financial & Operational Intelligence"
        title="Executive reports & statements"
        description="Audit-ready financial statements, payroll registers, and workforce analytics."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={() => fetchTabReport(activeTab)} title="Refresh data">
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
            <button className="soft-button" onClick={handlePrint} title="Print current report">
              <i className="bi bi-printer" /> Print
            </button>
            <button className="primary-button" onClick={handleExportExcel} title="Download formatted Excel workbook">
              <i className="bi bi-file-earmark-spreadsheet" /> Export Excel
            </button>
          </div>
        }
      />

      {/* Standard Profile Tabs */}
      <div className="profile-tabs">
        <button
          className={activeTab === 'trial-balance' ? 'active' : ''}
          onClick={() => setActiveTab('trial-balance')}
        >
          <i className="bi bi-journal-check" style={{ marginRight: 6 }} /> Trial balance
        </button>
        <button
          className={activeTab === 'income-statement' ? 'active' : ''}
          onClick={() => setActiveTab('income-statement')}
        >
          <i className="bi bi-graph-up" style={{ marginRight: 6 }} /> Income statement (P&L)
        </button>
        <button
          className={activeTab === 'balance-sheet' ? 'active' : ''}
          onClick={() => setActiveTab('balance-sheet')}
        >
          <i className="bi bi-cash-stack" style={{ marginRight: 6 }} /> Balance sheet
        </button>
        <button
          className={activeTab === 'payroll' ? 'active' : ''}
          onClick={() => setActiveTab('payroll')}
        >
          <i className="bi bi-wallet2" style={{ marginRight: 6 }} /> Payroll register
        </button>
        <button
          className={activeTab === 'hr' ? 'active' : ''}
          onClick={() => setActiveTab('hr')}
        >
          <i className="bi bi-people" style={{ marginRight: 6 }} /> Workforce analytics
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
          <i className="bi bi-arrow-repeat spin" style={{ fontSize: '24px', display: 'inline-block', marginBottom: '8px' }} />
          <div>Generating report data...</div>
        </div>
      ) : (
        <>
          {/* TAB 1: TRIAL BALANCE */}
          {activeTab === 'trial-balance' && tbData && (
            <div>
              <div className="compact-stats">
                <div>
                  <span>Total Debit Balance</span>
                  <b style={{ color: 'var(--primary)' }}>
                    ${tbData.totalDebit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Sum of all debit entries</small>
                </div>
                <div>
                  <span>Total Credit Balance</span>
                  <b style={{ color: 'var(--primary)' }}>
                    ${tbData.totalCredit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Sum of all credit entries</small>
                </div>
                <div>
                  <span>Variance</span>
                  <b>
                    ${Math.abs(tbData.variance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Debit / credit difference</small>
                </div>
                <div>
                  <span>Status</span>
                  <div style={{ marginTop: 6 }}>
                    <span className={`status ${tbData.isBalanced ? 'success' : 'warning'}`}>
                      {tbData.isBalanced ? 'Balanced' : 'Reconciliation in progress'}
                    </span>
                  </div>
                  <small>{new Date(tbData.generatedAt).toLocaleDateString('en-US')}</small>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Account Code</th>
                        <th>Account Name</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Debit ($)</th>
                        <th style={{ textAlign: 'right' }}>Credit ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tbData.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="code">{item.code}</td>
                          <td><b>{item.name}</b></td>
                          <td>
                            <span className={`status ${
                              item.type === 'Asset' ? 'neutral' : item.type === 'Revenue' ? 'success' : item.type === 'Expense' ? 'danger' : 'warning'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: item.debit > 0 ? 600 : 400 }}>
                            {item.debit > 0 ? `$${item.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: item.credit > 0 ? 600 : 400 }}>
                            {item.credit > 0 ? `$${item.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: '14px 17px', fontSize: '13px' }}>TOTAL SUMMARY</td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: '13px', padding: '14px 13px' }}>
                          ${tbData.totalDebit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: '13px', padding: '14px 17px' }}>
                          ${tbData.totalCredit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INCOME STATEMENT */}
          {activeTab === 'income-statement' && isData && (
            <div>
              <div className="compact-stats">
                <div>
                  <span>Gross Revenues</span>
                  <b style={{ color: 'var(--success)' }}>
                    ${isData.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Total income earned</small>
                </div>
                <div>
                  <span>Total Operating Expenses</span>
                  <b style={{ color: 'var(--danger)' }}>
                    ${isData.totalExpense?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>COGS, payroll & overhead</small>
                </div>
                <div>
                  <span>Net Income / (Loss)</span>
                  <b style={{ color: isData.netIncome >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                    ${isData.netIncome?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Operating profit after expenses</small>
                </div>
                <div>
                  <span>Net Margin</span>
                  <b style={{ color: 'var(--primary)' }}>
                    {isData.netMargin}%
                  </b>
                  <small>Profitability ratio</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                <div className="panel table-panel">
                  <div className="panel-head" style={{ padding: '16px 17px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2>Operating Revenues</h2>
                      <p>Invoiced revenue streams and sales collections</p>
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isData.revenues?.map((r: any) => (
                          <tr key={r.code}>
                            <td className="code">{r.code}</td>
                            <td><b>{r.name}</b></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel table-panel">
                  <div className="panel-head" style={{ padding: '16px 17px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2>Operating Expenses & COGS</h2>
                      <p>Cost of sales, payroll, and administrative expenses</p>
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isData.expenses?.map((e: any) => (
                          <tr key={e.code}>
                            <td className="code">{e.code}</td>
                            <td><b>{e.name}</b></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BALANCE SHEET */}
          {activeTab === 'balance-sheet' && bsData && (
            <div>
              <div className="compact-stats">
                <div>
                  <span>Total Assets</span>
                  <b style={{ color: 'var(--primary)' }}>
                    ${bsData.totalAssets?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Cash, receivables & property</small>
                </div>
                <div>
                  <span>Total Liabilities</span>
                  <b>
                    ${bsData.totalLiabilities?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Payables & tax obligations</small>
                </div>
                <div>
                  <span>Total Equity</span>
                  <b>
                    ${bsData.totalEquity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Capital & current earnings</small>
                </div>
                <div>
                  <span>Liabilities + Equity</span>
                  <b style={{ color: 'var(--primary)' }}>
                    ${bsData.totalLiabilitiesAndEquity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Balance sheet equation total</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                <div className="panel table-panel">
                  <div className="panel-head" style={{ padding: '16px 17px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2>Assets</h2>
                      <p>Liquid capital and accounts receivable</p>
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Asset Name</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bsData.assets?.map((a: any) => (
                          <tr key={a.code}>
                            <td className="code">{a.code}</td>
                            <td><b>{a.name}</b></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel table-panel">
                  <div className="panel-head" style={{ padding: '16px 17px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2>Liabilities & Equity</h2>
                      <p>Liabilities, retained earnings, and net capital</p>
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Name</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bsData.liabilities?.map((l: any) => (
                          <tr key={l.code}>
                            <td className="code">{l.code}</td>
                            <td><b>{l.name}</b> <small style={{ color: 'var(--muted)' }}>(Liability)</small></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {bsData.equity?.map((eq: any) => (
                          <tr key={eq.code}>
                            <td className="code">{eq.code}</td>
                            <td><b>{eq.name}</b> <small style={{ color: 'var(--primary)' }}>(Equity)</small></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${eq.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYROLL REGISTER */}
          {activeTab === 'payroll' && payrollData && (
            <div>
              <div className="compact-stats">
                <div>
                  <span>Total Gross Payroll</span>
                  <b style={{ color: 'var(--primary)' }}>
                    ${payrollData.totalGrossPaid?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Accumulated gross salaries</small>
                </div>
                <div>
                  <span>Total Deductions</span>
                  <b style={{ color: 'var(--warning)' }}>
                    ${payrollData.totalDeductions?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Withheld taxes & contributions</small>
                </div>
                <div>
                  <span>Net Disbursed</span>
                  <b style={{ color: 'var(--success)' }}>
                    ${payrollData.totalNetPaid?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Transferred to employees</small>
                </div>
                <div>
                  <span>Processed Periods</span>
                  <b>{payrollData.periodsCount}</b>
                  <small>Total payroll batches</small>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Period Name</th>
                        <th>Pay Date</th>
                        <th>Employees</th>
                        <th style={{ textAlign: 'right' }}>Total Gross</th>
                        <th style={{ textAlign: 'right' }}>Total Deductions</th>
                        <th style={{ textAlign: 'right' }}>Total Net</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.periods?.map((p: any) => (
                        <tr key={p.id}>
                          <td><b>{p.name}</b></td>
                          <td>{new Date(p.payDate).toLocaleDateString('en-US')}</td>
                          <td>{p.employeeCount} staff</td>
                          <td style={{ textAlign: 'right' }}>
                            ${p.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--warning)' }}>
                            ${p.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                            ${p.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={`status ${p.status === 'Posted' ? 'success' : p.status === 'Processing' ? 'warning' : 'neutral'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WORKFORCE ANALYTICS */}
          {activeTab === 'hr' && hrData && (
            <div>
              <div className="compact-stats">
                <div>
                  <span>Total Headcount</span>
                  <b style={{ color: 'var(--primary)' }}>{hrData.totalEmployees}</b>
                  <small>{hrData.activeEmployees} active personnel</small>
                </div>
                <div>
                  <span>Monthly Payroll Cost</span>
                  <b style={{ color: 'var(--text)' }}>
                    ${hrData.totalMonthlyPayroll?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Recurring salary baseline</small>
                </div>
                <div>
                  <span>Average Monthly Salary</span>
                  <b style={{ color: 'var(--text)' }}>
                    ${hrData.avgSalary?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </b>
                  <small>Per active employee</small>
                </div>
                <div>
                  <span>Departments</span>
                  <b>{hrData.byDepartment?.length || 0}</b>
                  <small>Operating organizational units</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                <div className="panel table-panel">
                  <div className="panel-head" style={{ padding: '16px 17px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h2>Department Distribution</h2>
                      <p>Headcount and payroll weight per department</p>
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Staff</th>
                          <th style={{ textAlign: 'right' }}>Monthly Payroll</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrData.byDepartment?.map((d: any) => (
                          <tr key={d.department}>
                            <td><b>{d.department}</b></td>
                            <td style={{ textAlign: 'center' }}>{d.count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${d.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel" style={{ padding: '20px' }}>
                  <div className="panel-head">
                    <div>
                      <h2>Workforce Contracts & Status</h2>
                      <p>Employment arrangements and current status breakdown</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <small style={{ fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', fontSize: '10px' }}>Current Status</small>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {hrData.byStatus?.map((s: any) => (
                        <span key={s.status} className={`status ${s.status === 'Active' ? 'success' : 'neutral'}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                          <b>{s.status}</b>: {s.count}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <small style={{ fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', fontSize: '10px' }}>Contract Types</small>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {hrData.byType?.map((t: any) => (
                        <span key={t.type} className="status neutral" style={{ fontSize: '11px', padding: '4px 10px' }}>
                          <b>{t.type}</b>: {t.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
