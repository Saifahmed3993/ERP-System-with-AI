import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function CustomersPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/customers', { pageSize: 100 });
      setCustomers(res.items || res);
    } catch (err) {
      notify('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      notify('Customer deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete customer');
    }
  };

  const rows = customers.map(c => ({
    name: <b>{c.name}</b>,
    email: c.email || '-',
    phone: c.phone || '-',
    balance: `$${(c.outstandingBalance || 0).toLocaleString()}`,
    status: <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />,
    _rawId: c.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Customers"
        description="Manage customer accounts and receivables."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-person-plus" /> New Customer
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading customers...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'balance', label: 'Outstanding Balance' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[{ label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }]}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Customer"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/customers', {
                name: data['Name'],
                email: data['Email'],
                phone: data['Phone'],
                address: data['Address'],
                contactPerson: data['Contact Person'],
              });
              setDialog(false);
              notify('Customer created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create customer');
            }
          }}
          fields={[
            { label: 'Name', required: true },
            { label: 'Email', type: 'email' },
            { label: 'Phone' },
            { label: 'Address' },
            { label: 'Contact Person' },
          ]}
        />
      )}
    </>
  );
}
