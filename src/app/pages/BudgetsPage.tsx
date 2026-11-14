import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function BudgetsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [budRes, deptRes] = await Promise.all([
        api.get<any>('/budgets', { pageSize: 100 }),
        api.get<any>('/departments', { pageSize: 100 }),
      ]);
      setBudgets(budRes.items || budRes);
      setDepartments((deptRes.items || deptRes || []).map((d: any) => ({ value: d.id, label: d.name })));
    } catch (err) {
      notify('Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const rows = budgets.map(b => ({
    name: <b>{b.name}</b>,
    department: b.department || 'Overall',
    year: b.fiscalYear,
    total: `$${(b.totalBudget || 0).toLocaleString()}`,
    spent: `$${(b.actualSpend || 0).toLocaleString()}`,
    utilization: `${b.utilizationPercent?.toFixed(1) || 0}%`,
    status: <StatusBadge status={b.status} />,
    _rawId: b.id
  }));

  const yearOptions = [2024, 2025, 2026, 2027, 2028].map(y => ({ value: y.toString(), label: y.toString() }));

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Budgets"
        description="Set and track departmental and corporate budgets."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-clipboard-data" /> New Budget
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading budgets...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Budget Name' },
            { key: 'department', label: 'Department' },
            { key: 'year', label: 'Fiscal Year' },
            { key: 'total', label: 'Total Budget' },
            { key: 'spent', label: 'Actual Spend' },
            { key: 'utilization', label: 'Utilization' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Budget"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/budgets', {
                name: data['Name'],
                departmentId: data['Department'] || null,
                fiscalYear: Number(data['Fiscal Year']),
                totalBudget: Number(data['Total Budget']),
              });
              setDialog(false);
              notify('Budget created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create budget');
            }
          }}
          fields={[
            { label: 'Name', required: true },
            { label: 'Department', type: 'select', options: [{ value: '', label: 'None (Overall)' }, ...departments] },
            { label: 'Fiscal Year', type: 'select', options: yearOptions, required: true },
            { label: 'Total Budget', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
