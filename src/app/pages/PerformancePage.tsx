import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function PerformancePage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [revRes, empRes] = await Promise.all([
        api.get<any>('/performance/reviews'),
        api.get<any>('/employees'),
      ]);
      setReviews(Array.isArray(revRes) ? revRes : revRes.items || []);
      setEmployees((empRes.items || empRes || []).map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })));
    } catch (err) {
      notify('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/performance/reviews/${id}`);
      notify('Review deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete review');
    }
  };

  const rows = reviews.map(r => ({
    employee: <b>{r.employeeName}</b>,
    period: r.reviewPeriod,
    score: (r.score ?? 0).toFixed(1),
    goals: `${(r.goalsCompletePercent ?? 0)}%`,
    reviewer: r.reviewerName || '-',
    status: <StatusBadge status={r.status} />,
    _rawId: r.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Performance"
        description="Track employee performance reviews and goals."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-star" /> New Review
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading performance reviews...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'period', label: 'Review Period' },
            { key: 'score', label: 'Score' },
            { key: 'goals', label: 'Goals Completed' },
            { key: 'reviewer', label: 'Reviewer' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            { label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }
          ]}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Performance Review"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/performance/reviews', {
                employeeId: data['Employee'],
                reviewPeriod: data['Review Period'],
                score: Number(data['Score']),
                goalsCompletePercent: Number(data['Goals Complete %']),
                comments: data['Comments'],
              });
              setDialog(false);
              notify('Performance review created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create review.');
            }
          }}
          fields={[
            { label: 'Employee', type: 'select', options: employees, required: true },
            { label: 'Review Period', required: true },
            { label: 'Score', type: 'number', required: true },
            { label: 'Goals Complete %', type: 'number', required: true },
            { label: 'Comments' },
          ]}
        />
      )}
    </>
  );
}
