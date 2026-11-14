import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function PositionsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/positions', { pageSize: 100 });
      setPositions(res.items || res);
      const deps = await api.get<any>('/departments', { pageSize: 100 });
      setDepartments(deps.items || deps);
    } catch (err) {
      notify('Failed to load positions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/positions/${id}`);
      notify('Position deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete position');
    }
  };

  const rows = positions.map(p => ({
    title: <b>{p.title}</b>,
    department: p.department,
    salaryRange: `$${p.minSalary.toLocaleString()} - $${p.maxSalary.toLocaleString()}`,
    employees: p.employeeCount,
    status: <StatusBadge status={p.isActive ? 'Active' : 'Inactive'} />,
    _rawId: p.id
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Positions"
        description="Manage job titles and salary bands."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-plus-lg" /> Add position
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading positions...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', label: 'Job Title' },
            { key: 'department', label: 'Department' },
            { key: 'salaryRange', label: 'Salary Range' },
            { key: 'employees', label: 'Employees' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[{ label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) }]}
        />
      )}
      {dialog && (
        <FormDialog
          title="Add position"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const departmentId = departments.find(d => d.name === data['Department'])?.id;
              await api.post('/positions', {
                title: data['Job Title'],
                description: data['Description'],
                departmentId,
                minSalary: Number(data['Min Salary']),
                maxSalary: Number(data['Max Salary']),
              });
              setDialog(false);
              notify('Position created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create position');
            }
          }}
          fields={[
            { label: 'Job Title', required: true },
            { label: 'Department', required: true, options: departments.map(d => d.name) },
            { label: 'Description' },
            { label: 'Min Salary', type: 'number', required: true },
            { label: 'Max Salary', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
