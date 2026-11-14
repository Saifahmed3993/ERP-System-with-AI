import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function DepartmentsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/departments', { pageSize: 100 });
      setDepartments(res.items || res);
    } catch (err) {
      notify('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/departments/${id}`);
      notify('Department deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete department');
    }
  };

  const rows = departments.map(d => ({
    name: <b>{d.name}</b>,
    description: d.description || '-',
    manager: d.managerName || '-',
    budget: `$${d.annualBudget.toLocaleString()}`,
    employees: d.employeeCount,
    status: <StatusBadge status={d.isActive ? 'Active' : 'Inactive'} />,
    _rawId: d.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Departments"
        description="Manage company departments and their budgets."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-plus-lg" /> Add department
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading departments...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'manager', label: 'Manager' },
            { key: 'budget', label: 'Annual Budget' },
            { key: 'employees', label: 'Employees' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[{ label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }]}
        />
      )}
      {dialog && (
        <FormDialog
          title="Add department"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/departments', {
                name: data['Name'],
                description: data['Description'],
                annualBudget: Number(data['Annual Budget']),
              });
              setDialog(false);
              notify('Department created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create department');
            }
          }}
          fields={[
            { label: 'Name', required: true },
            { label: 'Description' },
            { label: 'Annual Budget', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
