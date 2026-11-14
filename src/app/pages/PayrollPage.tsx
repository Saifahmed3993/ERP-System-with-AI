import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';
import { downloadExcel, openPrintDocument, printableTable } from '../../shared/components/exportUtils';

const payrollColumns = ['Employee', 'Employee code', 'Department', 'Basic salary (EGP)', 'Other earnings (EGP)', 'Gross (EGP)', 'Deductions and tax (EGP)', 'Net salary (EGP)', 'Status'];
const payrollExportRows = (items: any[]) => items.map(item => [
  item.employeeName || item.employee?.fullName || 'Staff Member',
  item.employeeCode || item.employee?.employeeCode || '',
  item.department || item.employee?.department?.name || '',
  item.basicSalary || 0,
  (item.allowances || 0) + (item.bonuses || 0) + (item.overtimePay || 0),
  item.grossSalary || 0,
  (item.deductions || 0) + (item.taxes || 0),
  item.netSalary || 0,
  item.status || '',
]);

export function PayrollPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Period drill-down & payslips
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [periodPayrolls, setPeriodPayrolls] = useState<any[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [activePayslip, setActivePayslip] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/payroll/periods');
      setPeriods(res.items || res);
    } catch (err) {
      notify('Failed to load payroll periods.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'process' | 'post') => {
    try {
      await api.post(`/payroll/periods/${id}/${action}`);
      notify(`Payroll period ${action}ed successfully.`);
      loadData();
      if (selectedPeriod && selectedPeriod.id === id) {
        openPeriodPayrolls({ ...selectedPeriod, status: action === 'process' ? 'Processing' : 'Posted' });
      }
    } catch (err: any) {
      notify(err.message || `Failed to ${action} payroll.`);
    }
  };

  const openPeriodPayrolls = async (period: any) => {
    setSelectedPeriod(period);
    setLoadingPayrolls(true);
    try {
      const res = await api.get<any[]>(`/payroll/periods/${period.id}/payrolls`);
      setPeriodPayrolls(res || []);
    } catch (err: any) {
      notify(err.message || 'Failed to load employee payrolls for this period.');
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const rows = (periods || []).map(p => ({
    name: <b>{p.name}</b>,
    startDate: formatDate(p.startDate),
    endDate: formatDate(p.endDate),
    employees: p.employeeCount,
    totalGross: formatCurrency(p.totalGross || 0),
    totalNet: formatCurrency(p.totalNet || 0),
    status: <StatusBadge status={p.status} actions={[
      ...(p.status === 'Draft' ? [{ label: 'Process', onClick: () => handleAction(p.id, 'process') }] : []),
      ...(p.status === 'Processing' ? [{ label: 'Post', onClick: () => handleAction(p.id, 'post') }] : []),
    ]} />,
    _rawId: p.id,
    _status: p.status,
    _rawObj: p
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Payroll & Employee Payslips"
        description="Manage payroll periods, calculate salaries, and generate individual employee payslips."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
            <button className="primary-button" onClick={() => setDialog(true)}>
              <i className="bi bi-plus-lg" /> Create Period
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading payroll periods...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Period Name' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'employees', label: 'Employees' },
            { key: 'totalGross', label: 'Total Gross' },
            { key: 'totalNet', label: 'Total Net' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            {
              label: 'View Employee Payslips',
              icon: 'file-earmark-person',
              color: 'var(--primary, #4f46e5)',
              onClick: (r: any) => openPeriodPayrolls(r._rawObj)
            },
            {
              label: 'Process',
              icon: 'gear',
              color: 'var(--primary)',
              show: (r: any) => r._status === 'Draft',
              onClick: (r: any) => handleAction(r._rawId, 'process')
            },
            {
              label: 'Post to GL',
              icon: 'check2-all',
              color: 'var(--success)',
              show: (r: any) => r._status === 'Processing',
              onClick: (r: any) => handleAction(r._rawId, 'post')
            },
          ]}
        />
      )}

      {/* PERIOD DRILL-DOWN MODAL */}
      {selectedPeriod && (
        <div className="search-modal" role="dialog" style={{ zIndex: 999 }}>
          <div className="search-dialog" style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'Manrope, sans-serif' }}>
                  Payroll Breakdown: <b>{selectedPeriod.name}</b>
                </h3>
                <small style={{ color: 'var(--muted)' }}>
                  Pay Date: {new Date(selectedPeriod.payDate || selectedPeriod.endDate).toLocaleDateString('en-US')} • Status: <StatusBadge status={selectedPeriod.status} />
                </small>
              </div>
              <div className="header-action">
                <button className="soft-button" disabled={loadingPayrolls || periodPayrolls.length === 0} onClick={() => {
                  const rows = payrollExportRows(periodPayrolls);
                  const gross = periodPayrolls.reduce((sum, item) => sum + (item.grossSalary || 0), 0);
                  const deductions = periodPayrolls.reduce((sum, item) => sum + (item.deductions || 0) + (item.taxes || 0), 0);
                  const net = periodPayrolls.reduce((sum, item) => sum + (item.netSalary || 0), 0);
                  rows.push(['TOTAL', '', '', '', '', gross, deductions, net, '']);
                  downloadExcel({ fileName: `payroll_${selectedPeriod.name}`, sheetName: 'Payroll', title: `Payroll register · ${selectedPeriod.name}`, subtitle: `Pay date ${new Date(selectedPeriod.payDate || selectedPeriod.endDate).toLocaleDateString()} · Confidential`, headers: payrollColumns, rows, totalRows: [rows.length - 1] });
                }}><i className="bi bi-file-earmark-spreadsheet" /> Export Excel</button>
                <button className="soft-button" disabled={loadingPayrolls || periodPayrolls.length === 0} onClick={() => {
                  const rows = payrollExportRows(periodPayrolls);
                  const totals = ['TOTAL', '', '', '', '', periodPayrolls.reduce((sum, item) => sum + (item.grossSalary || 0), 0), periodPayrolls.reduce((sum, item) => sum + (item.deductions || 0) + (item.taxes || 0), 0), periodPayrolls.reduce((sum, item) => sum + (item.netSalary || 0), 0), ''];
                  openPrintDocument(`Payroll register · ${selectedPeriod.name}`, 'Confidential payroll detail · EGP', printableTable(payrollColumns, rows, totals));
                }}><i className="bi bi-printer" /> Print / PDF</button>
                <button className="icon-button" onClick={() => setSelectedPeriod(null)} aria-label="Close payroll period"><i className="bi bi-x-lg" /></button>
              </div>
            </div>

            {loadingPayrolls ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading employee payslips...</div>
            ) : periodPayrolls.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                <p>No payroll records found for this period.</p>
                {selectedPeriod.status === 'Draft' && (
                  <button className="primary-button" onClick={() => handleAction(selectedPeriod.id, 'process')}>
                    <i className="bi bi-gear" /> Process Payroll Now
                  </button>
                )}
              </div>
            ) : (
              <div className="responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th style={{ textAlign: 'right' }}>Basic Salary</th>
                      <th style={{ textAlign: 'right' }}>Allowances</th>
                      <th style={{ textAlign: 'right' }}>Gross Pay</th>
                      <th style={{ textAlign: 'right' }}>Deductions & Taxes</th>
                      <th style={{ textAlign: 'right' }}>Net Salary</th>
                      <th style={{ textAlign: 'center' }}>Payslip Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodPayrolls.map((py: any) => (
                      <tr key={py.id}>
                        <td>
                          <b>{py.employeeName || py.employee?.fullName || 'Staff Member'}</b>
                          <small style={{ display: 'block', color: 'var(--muted)' }}>
                            {py.employeeCode || py.employee?.employeeCode || 'EMP'} • {py.department || py.employee?.department?.name || 'Department'}
                          </small>
                        </td>
                        <td style={{ textAlign: 'right' }}>${(py.basicSalary || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>${((py.allowances || 0) + (py.bonuses || 0) + (py.overtimePay || 0)).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(py.grossSalary || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-${((py.deductions || 0) + (py.taxes || 0)).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          ${(py.netSalary || 0).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="soft-button"
                            onClick={() => setActivePayslip({ ...py, periodName: selectedPeriod.name, payDate: selectedPeriod.payDate })}
                            style={{ height: '30px', fontSize: '11px', padding: '0 10px' }}
                          >
                            <i className="bi bi-file-earmark-text" /> View Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <button className="modal-close" onClick={() => setSelectedPeriod(null)} />
        </div>
      )}

      {/* OFFICIAL PAYSLIP VIEW & PRINT MODAL */}
      {activePayslip && (
        <div className="search-modal" id="payroll-payslip-dialog" role="dialog" style={{ zIndex: 1000 }}>
          <div className="search-dialog" style={{ width: '90%', maxWidth: '750px', background: 'var(--surface)', color: 'var(--text)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            
            {/* Header & Print controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '2px solid var(--primary)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Manrope, sans-serif' }}>
                  INDIGO VENTURES ERP
                </h2>
                <small style={{ color: 'var(--muted)', fontSize: '12px' }}>Official Confidential Salary Payslip</small>
              </div>
              <div className="header-action">
                <button
                  className="soft-button"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer" /> Print
                </button>
                <button className="soft-button" onClick={() => {
                  const totalDeductions = (activePayslip.deductions || 0) + (activePayslip.taxes || 0) + (activePayslip.benefitsDeduction || 0);
                  const rows: (string | number)[][] = [
                    ['EARNINGS', '', ''],
                    ['Basic salary', '', activePayslip.basicSalary || 0],
                    ['Allowances', '', activePayslip.allowances || 0],
                    ['Overtime pay', '', activePayslip.overtimePay || 0],
                    ['Bonuses', '', activePayslip.bonuses || 0],
                    ['TOTAL GROSS', '', activePayslip.grossSalary || 0],
                    ['DEDUCTIONS', '', ''],
                    ['Income tax', '', activePayslip.taxes || 0],
                    ['Social security / pension', '', activePayslip.deductions || 0],
                    ['Benefits contribution', '', activePayslip.benefitsDeduction || 0],
                    ['TOTAL DEDUCTIONS', '', totalDeductions],
                    ['NET PAY', '', activePayslip.netSalary || 0],
                  ];
                  downloadExcel({ fileName: `payslip_${activePayslip.employeeCode || activePayslip.id}`, sheetName: 'Payslip', title: `Confidential payslip · ${activePayslip.employeeName || activePayslip.employee?.fullName || 'Employee'}`, subtitle: `${activePayslip.periodName} · ${new Date(activePayslip.payDate || Date.now()).toLocaleDateString()}`, headers: ['Component', 'Details', 'Amount (EGP)'], rows, sectionRows: [0, 6], totalRows: [5, 10, 11] });
                }}>
                  <i className="bi bi-file-earmark-spreadsheet" /> Export Excel
                </button>
                <button className="icon-button" onClick={() => setActivePayslip(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>
            {/* Employee & Period Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', border: '1px solid var(--border)' }}>
              <div>
                <div><span style={{ color: 'var(--muted)' }}>Employee Name:</span> <b>{activePayslip.employeeName || activePayslip.employee?.fullName}</b></div>
                <div style={{ marginTop: '4px' }}><span style={{ color: 'var(--muted)' }}>Employee Code:</span> <b>{activePayslip.employeeCode || activePayslip.employee?.employeeCode || 'EMP-2026'}</b></div>
                <div style={{ marginTop: '4px' }}><span style={{ color: 'var(--muted)' }}>Department:</span> <b>{activePayslip.department || activePayslip.employee?.department?.name || 'General Staff'}</b></div>
              </div>
              <div>
                <div><span style={{ color: 'var(--muted)' }}>Payroll Period:</span> <b>{activePayslip.periodName}</b></div>
                <div style={{ marginTop: '4px' }}><span style={{ color: 'var(--muted)' }}>Payment Date:</span> <b>{new Date(activePayslip.payDate || Date.now()).toLocaleDateString('en-US')}</b></div>
                <div style={{ marginTop: '4px' }}><span style={{ color: 'var(--muted)' }}>Payment Method:</span> <b>Direct Bank Transfer</b></div>
              </div>
            </div>

            {/* Earnings & Deductions Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Earnings */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: 'var(--surface)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--success)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Earnings
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Basic Salary</span>
                  <b>{formatCurrency(activePayslip.basicSalary || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Allowances</span>
                  <b>{formatCurrency(activePayslip.allowances || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Overtime Pay</span>
                  <b>{formatCurrency(activePayslip.overtimePay || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Bonuses</span>
                  <b>{formatCurrency(activePayslip.bonuses || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: '10px', paddingTop: '10px', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL GROSS</span>
                  <span style={{ color: 'var(--success)' }}>{formatCurrency(activePayslip.grossSalary || 0)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: 'var(--surface)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--danger)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Deductions
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Income Tax (WHT)</span>
                  <b>{formatCurrency(activePayslip.taxes || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Social Security / Pension</span>
                  <b>{formatCurrency(activePayslip.deductions || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                  <span>Benefits Contribution</span>
                  <b>{formatCurrency(activePayslip.benefitsDeduction || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: '36px', paddingTop: '10px', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL DEDUCTIONS</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatCurrency((activePayslip.taxes || 0) + (activePayslip.deductions || 0) + (activePayslip.benefitsDeduction || 0))}</span>
                </div>
              </div>
            </div>

            {/* NET PAY BANNER */}
            <div style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <small style={{ color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Net Disbursed Salary</small>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Credited directly to registered bank account</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>
                {formatCurrency(activePayslip.netSalary || 0)}
              </div>
            </div>

            {/* Signature / Audit Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
              <div>
                <div>System Signature: <b>INDIGO-ERP-VERIFIED-PAYROLL</b></div>
                <div>Generated on {new Date().toLocaleString('en-US')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid var(--border)', width: '180px', marginBottom: '4px' }}></div>
                <span>Authorized HR & Finance Signature</span>
              </div>
            </div>

          </div>
          <button className="modal-close" onClick={() => setActivePayslip(null)} />
        </div>
      )}

      {dialog && (
        <FormDialog
          title="Create Payroll Period"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/payroll/periods', {
                name: data['Period Name'],
                startDate: data['Start Date'],
                endDate: data['End Date'],
                payDate: data['Pay Date'],
              });
              setDialog(false);
              notify('Payroll period created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create period');
            }
          }}
          fields={[
            { label: 'Period Name', required: true },
            { label: 'Start Date', type: 'date', required: true },
            { label: 'End Date', type: 'date', required: true },
            { label: 'Pay Date', type: 'date', required: true },
          ]}
        />
      )}
    </>
  );
}
