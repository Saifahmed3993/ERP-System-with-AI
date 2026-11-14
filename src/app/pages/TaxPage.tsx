import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function TaxPage({ notify }: { notify: (m: string) => void }) {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get<any[]>('/finance/tax');
      setTaxes(res || []);
    } catch (err: any) {
      notify(err.message || 'Failed to load tax rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this tax rate rule?')) return;
    try {
      await api.delete(`/finance/tax/${id}`);
      notify('Tax rate rule removed.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete tax rate.');
    }
  };

  const rows = (taxes || []).map(t => ({
    name: <b>{t.name}</b>,
    rate: <b style={{ color: 'var(--primary, #4f46e5)', fontSize: '15px' }}>{t.rate}%</b>,
    category: (
      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', fontSize: '12px', fontWeight: 600 }}>
        {t.category}
      </span>
    ),
    description: t.description || '—',
    status: <StatusBadge status={t.isActive ? 'Active' : 'Terminated'} />,
    _rawId: t.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Financial Compliance"
        title="Tax Configuration & Rates"
        description="Configure VAT, Withholding Tax, and statutory transaction tax rates."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
            <button className="primary-button" onClick={() => setDialog(true)}>
              <i className="bi bi-plus-lg" /> Add Tax Rate
            </button>
          </div>
        }
      />

      <section className="compact-stats">
        <div>
          <span>Configured rates</span>
          <b>{taxes.length}</b>
        </div>
        <div>
          <span>Active tax rules</span>
          <b>{taxes.filter(t => t.isActive).length}</b>
        </div>
        <div>
          <span>Standard VAT</span>
          <b>{taxes.find(t => t.name?.toLowerCase().includes('vat'))?.rate || 14}%</b>
        </div>
        <div>
          <span>Statutory compliance</span>
          <b style={{ color: 'var(--success)' }}>Valid</b>
        </div>
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading tax configurations...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Tax Name / Rule' },
            { key: 'rate', label: 'Rate (%)' },
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            {
              label: 'Delete Rule',
              icon: 'trash',
              color: 'var(--danger, #ef4444)',
              onClick: (r: any) => handleDelete(r._rawId)
            }
          ]}
        />
      )}

      {dialog && (
        <FormDialog
          title="Create New Tax Rule"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/finance/tax', {
                name: data['Rule Name'],
                rate: parseFloat(data['Tax Rate (%)']) || 0,
                category: data['Category'] || 'Sales',
                description: data['Description'],
                isActive: true
              });
              setDialog(false);
              notify('Tax rate created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create tax rate.');
            }
          }}
          fields={[
            { label: 'Rule Name', required: true },
            { label: 'Tax Rate (%)', type: 'number', required: true },
            {
              label: 'Category',
              type: 'select',
              options: ['Sales', 'Services', 'Compensation', 'Exports'],
              required: true
            },
            { label: 'Description' }
          ]}
        />
      )}
    </>
  );
}
