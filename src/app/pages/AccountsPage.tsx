import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function AccountsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/accounts', { pageSize: 100 });
      setAccounts(res.items || res);
    } catch (err) {
      notify('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}`);
      notify('Account deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete account.');
    }
  };

  const rows = accounts.map(a => ({
    code: <b className="code">{a.code}</b>,
    name: a.name,
    type: a.type,
    category: a.category,
    balance: `$${(a.currentBalance || 0).toLocaleString()}`,
    status: <StatusBadge status={a.isActive ? 'Active' : 'Inactive'} />,
    _rawId: a.id
  }));

  const typeOptions = [
    { value: 'Asset', label: 'Asset' },
    { value: 'Liability', label: 'Liability' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Expense', label: 'Expense' }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Chart of Accounts"
        description="Manage your financial accounts structure."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-journal-plus" /> New Account
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading accounts...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'code', label: 'Account Code' },
            { key: 'name', label: 'Account Name' },
            { key: 'type', label: 'Type' },
            { key: 'category', label: 'Category' },
            { key: 'balance', label: 'Balance' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[{ label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }]}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Account"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/accounts', {
                code: data['Code'],
                name: data['Name'],
                type: data['Type'],
                category: data['Category'],
                description: data['Description'],
              });
              setDialog(false);
              notify('Account created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create account');
            }
          }}
          fields={[
            { label: 'Code', required: true },
            { label: 'Name', required: true },
            { label: 'Type', type: 'select', options: typeOptions, required: true },
            { label: 'Category', required: true },
            { label: 'Description' },
          ]}
        />
      )}
    </>
  );
}
