import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function BenefitsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/benefits');
      setBenefits(Array.isArray(res) ? res : res.items || []);
    } catch (err) {
      notify('Failed to load benefits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/benefits/${id}`);
      notify('Benefit plan deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete plan');
    }
  };

  const rows = benefits.map(b => ({
    planName: <b>{b.planName}</b>,
    provider: b.provider,
    employerCost: `$${(b.employerCostMonthly || 0).toLocaleString()}`,
    employeeCost: `$${(b.employeeCostMonthly || 0).toLocaleString()}`,
    enrolled: b.enrolledCount ?? 0,
    status: <StatusBadge status={b.status} />,
    _rawId: b.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Benefits"
        description="Manage company benefit plans and enrollment."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-heart-pulse" /> New Plan
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading benefits...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'planName', label: 'Plan Name' },
            { key: 'provider', label: 'Provider' },
            { key: 'employerCost', label: 'Employer Cost / mo' },
            { key: 'employeeCost', label: 'Employee Cost / mo' },
            { key: 'enrolled', label: 'Enrolled' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[{ label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }]}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Benefit Plan"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/benefits', {
                planName: data['Plan Name'],
                provider: data['Provider'],
                description: data['Description'],
                employerCostMonthly: Number(data['Employer Cost / mo']),
                employeeCostMonthly: Number(data['Employee Cost / mo']),
              });
              setDialog(false);
              notify('Benefit plan created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create benefit plan.');
            }
          }}
          fields={[
            { label: 'Plan Name', required: true },
            { label: 'Provider', required: true },
            { label: 'Description' },
            { label: 'Employer Cost / mo', type: 'number', required: true },
            { label: 'Employee Cost / mo', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
