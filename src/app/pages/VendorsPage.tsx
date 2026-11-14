import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function VendorsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/vendors', { pageSize: 100 });
      setVendors(res.items || res);
    } catch (err) {
      notify('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/vendors/${id}`);
      notify('Vendor deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete vendor');
    }
  };

  const rows = vendors.map(v => ({
    name: <b>{v.name}</b>,
    email: v.email || '-',
    phone: v.phone || '-',
    balance: `$${(v.outstandingBalance || 0).toLocaleString()}`,
    status: <StatusBadge status={v.isActive ? 'Active' : 'Inactive'} />,
    _rawId: v.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Vendors"
        description="Manage suppliers, vendors, and accounts payable."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-building-add" /> New Vendor
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading vendors...</div>
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
          title="New Vendor"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/vendors', {
                name: data['Name'],
                email: data['Email'],
                phone: data['Phone'],
                address: data['Address'],
                contactPerson: data['Contact Person'],
              });
              setDialog(false);
              notify('Vendor created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create vendor');
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
