import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function SettingsPage({ notify }: { notify: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState({
    name: 'Indigo Ventures ERP',
    taxId: 'TAX-2026-9938',
    baseCurrency: 'USD',
    email: 'support@indigo.co',
    phone: '+1 (555) 019-2834',
    address: '100 Innovation Boulevard, Tech Park',
    timezone: 'UTC'
  });

  const [rules, setRules] = useState({
    fiscalYearStart: '01-01',
    payrollCutoffDay: 25,
    defaultLeaveDays: 21,
    workHoursPerDay: 8,
    autoPostPayroll: false,
    requireTwoApprovals: true
  });

  const loadData = async () => {
    try {
      const res = await api.get<any>('/admin/settings');
      if (res.company) setCompany(res.company);
      if (res.settings) setRules(res.settings);
    } catch (err: any) {
      notify(err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/settings', {
        company,
        settings: rules
      });
      notify('Configuration and system settings saved successfully.');
    } catch (err: any) {
      notify(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <form id="settings-form" onSubmit={handleSave}>
        <PageHeader
          eyebrow="System Configuration"
          title="Organization Profile & ERP Settings"
          description="Global company profile, fiscal year parameters, and HR operational rules."
          action={
            <>
              <button type="button" className="soft-button" onClick={loadData}>
                <i className="bi bi-arrow-clockwise" /> Reload
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                <i className="bi bi-check-lg" /> {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </>
          }
        />

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading system settings...</div>
        ) : (
          <div style={{ maxWidth: '960px' }}>
            {/* Company Profile Section */}
            <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="panel-head" style={{ marginBottom: '20px', padding: 0, border: 'none' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Company Information</h2>
                  <p>Used on generated invoices, official payslips, and external communications.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Company Legal Name</label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={e => setCompany({ ...company, name: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Tax / VAT Registration ID</label>
                  <input
                    type="text"
                    value={company.taxId}
                    onChange={e => setCompany({ ...company, taxId: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Official Support Email</label>
                  <input
                    type="email"
                    value={company.email}
                    onChange={e => setCompany({ ...company, email: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Official Telephone</label>
                  <input
                    type="text"
                    value={company.phone}
                    onChange={e => setCompany({ ...company, phone: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Headquarters Address</label>
                  <input
                    type="text"
                    value={company.address}
                    onChange={e => setCompany({ ...company, address: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Base Operating Currency</label>
                  <select
                    value={company.baseCurrency}
                    onChange={e => setCompany({ ...company, baseCurrency: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    <option value="USD">USD ($) — United States Dollar</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="EGP">EGP — Egyptian Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>System Timezone</label>
                  <select
                    value={company.timezone}
                    onChange={e => setCompany({ ...company, timezone: e.target.value })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                    <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Operational & Financial Rules Section */}
            <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="panel-head" style={{ marginBottom: '20px', padding: 0, border: 'none' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Operational & Financial Controls</h2>
                  <p>Enforced across payroll runs, leave entitlement calculation, and GL posting.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Fiscal Year Start Date</label>
                  <input
                    type="text"
                    value={rules.fiscalYearStart}
                    onChange={e => setRules({ ...rules, fiscalYearStart: e.target.value })}
                    placeholder="MM-DD (e.g. 01-01)"
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Monthly Payroll Cutoff Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={rules.payrollCutoffDay}
                    onChange={e => setRules({ ...rules, payrollCutoffDay: parseInt(e.target.value) || 25 })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Standard Annual Leave Entitlement (Days)</label>
                  <input
                    type="number"
                    min={0}
                    value={rules.defaultLeaveDays}
                    onChange={e => setRules({ ...rules, defaultLeaveDays: parseInt(e.target.value) || 21 })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>Standard Work Hours Per Day</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={24}
                    value={rules.workHoursPerDay}
                    onChange={e => setRules({ ...rules, workHoursPerDay: parseFloat(e.target.value) || 8 })}
                    style={{ width: '100%', height: '37px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '32px' }}>
              <button type="button" className="soft-button" onClick={loadData}>
                <i className="bi bi-x-circle" /> Cancel Changes
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                <i className="bi bi-check-lg" /> {saving ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
