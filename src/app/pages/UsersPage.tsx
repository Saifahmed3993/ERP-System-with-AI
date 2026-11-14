import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function UsersPage({ notify }: { notify: (m: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/admin/users', { pageSize: 100 });
      setUsers(res.items || res);
      const rolesRes = await api.get<any>('/admin/users/roles');
      setRoles(rolesRes || []);
    } catch (err: any) {
      notify(err.message || 'Failed to load system users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    try {
      const endpoint = currentActive ? `/admin/users/${id}/disable` : `/admin/users/${id}/enable`;
      await api.post(endpoint);
      notify(`User ${currentActive ? 'disabled' : 'enabled'} successfully.`);
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to update user status.');
    }
  };

  const rows = (users || []).map(u => ({
    name: <b>{u.fullName}</b>,
    email: u.email,
    department: u.department || 'General',
    roles: (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {u.roles?.map((r: string) => (
          <span key={r} style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            background: r === 'Administrator' ? '#fee2e2' : '#e0e7ff',
            color: r === 'Administrator' ? '#b91c1c' : '#4338ca'
          }}>
            {r}
          </span>
        ))}
      </div>
    ),
    status: <StatusBadge status={u.isActive ? 'Active' : 'Terminated'} />,
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-US') : 'Never',
    _rawId: u.id,
    _isActive: u.isActive,
    _rawData: u
  }));

  return (
    <>
      <PageHeader
        eyebrow="System Administration"
        title="User Accounts & Access"
        description="Provision, manage, and configure system users and role assignments."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
            <button className="primary-button" onClick={() => setDialog(true)}>
              <i className="bi bi-person-plus" /> Provision User
            </button>
          </div>
        }
      />

      <section className="compact-stats">
        <div>
          <span>Total users</span>
          <b>{users.length}</b>
        </div>
        <div>
          <span>Active accounts</span>
          <b>{users.filter(u => u.isActive).length}</b>
        </div>
        <div>
          <span>Administrators</span>
          <b>{users.filter(u => u.roles?.includes('Administrator')).length}</b>
        </div>
        <div>
          <span>Defined roles</span>
          <b>{roles.length || 5}</b>
        </div>
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading user directory...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email Address' },
            { key: 'department', label: 'Department' },
            { key: 'roles', label: 'Assigned Roles' },
            { key: 'lastLogin', label: 'Last Login' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            {
              label: 'Edit',
              icon: 'pencil',
              color: 'var(--text)',
              onClick: (r: any) => setEditUser(r._rawData)
            },
            {
              label: 'Toggle Active',
              icon: 'power',
              color: 'var(--primary)',
              onClick: (r: any) => handleToggleStatus(r._rawId, r._isActive)
            }
          ]}
        />
      )}

      {dialog && (
        <FormDialog
          title="Provision New System User"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/admin/users', {
                email: data['Email'],
                fullName: data['Full Name'],
                department: data['Department'],
                role: data['Role'] || 'Employee',
                password: data['Temporary Password']
              });
              setDialog(false);
              notify('User created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to provision user.');
            }
          }}
          fields={[
            { label: 'Full Name', required: true },
            { label: 'Email', type: 'email', required: true },
            { label: 'Department' },
            {
              label: 'Role',
              type: 'select',
              options: roles.length > 0 ? roles : ['Administrator', 'HR Manager', 'Finance Manager', 'Accountant', 'Employee'],
              required: true
            },
            { label: 'Temporary Password', type: 'password', required: true }
          ]}
        />
      )}

      {editUser && (
        <FormDialog
          title="Edit System User"
          close={() => setEditUser(null)}
          submit={async (data) => {
            try {
              await api.put(`/admin/users/${editUser.id}`, {
                fullName: data['Full Name'],
                department: data['Department'],
                role: data['Role'],
                password: data['New Password (Optional)']
              });
              setEditUser(null);
              notify('User updated successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to update user.');
            }
          }}
          fields={[
            { label: 'Email', value: editUser.email, readonly: true },
            { label: 'Full Name', value: editUser.fullName, required: true },
            { label: 'Department', value: editUser.department || '' },
            {
              label: 'Role',
              type: 'select',
              options: roles.length > 0 ? roles : ['Administrator', 'HR Manager', 'Finance Manager', 'Accountant', 'Employee'],
              value: editUser.roles?.[0] || 'Employee',
              required: true
            },
            { label: 'New Password (Optional)', type: 'password' }
          ]}
        />
      )}
    </>
  );
}
