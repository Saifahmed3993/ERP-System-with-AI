import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function RolesPage({ notify }: { notify: (m: string) => void }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionsData, setPermissionsData] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const rolesRes = await api.get<any[]>('/admin/roles');
      setRoles(rolesRes || []);
      if (rolesRes && rolesRes.length > 0) {
        setSelectedRole(rolesRes[0]);
      }
      const permRes = await api.get<any>('/admin/permissions');
      setPermissionsData(permRes);
    } catch (err: any) {
      notify(err.message || 'Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="roles-page">
      <PageHeader
        eyebrow="Security & Governance"
        title="Roles & Permission Matrix"
        description="Role-Based Access Control (RBAC) definitions and granular module privileges."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
          </div>
        }
      />

      <section className="compact-stats">
        <div>
          <span>Configured roles</span>
          <b>{roles.length}</b>
        </div>
        <div>
          <span>Total permissions</span>
          <b>{permissionsData?.total || 132}</b>
        </div>
        <div>
          <span>System modules</span>
          <b>{permissionsData?.modules?.length || 10}</b>
        </div>
        <div>
          <span>Active selection</span>
          <b>{selectedRole?.name || 'Administrator'}</b>
        </div>
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading security model...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          {/* Left Column: Roles List */}
          <div className="panel" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Roles ({roles.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roles.map(r => {
                const isSelected = selectedRole?.name === r.name;
                return (
                  <button
                    key={r.name}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ color: isSelected ? 'var(--primary)' : 'var(--text)', fontSize: '13px' }}>{r.name}</b>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        background: 'var(--surface-2)',
                        color: 'var(--muted)',
                        fontWeight: 600
                      }}>
                        {r.userCount} users
                      </span>
                    </div>
                    <small style={{ display: 'block', color: 'var(--muted)', marginTop: '4px', fontSize: '11px' }}>
                      {r.description || `${r.name} access level`}
                    </small>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                      <i className="bi bi-shield-lock" /> {r.permissions?.length || 0} permissions granted
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix */}
          {selectedRole && (
            <div className="panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'Manrope, sans-serif' }}>
                    Permissions for <b>{selectedRole.name}</b>
                  </h3>
                  <small style={{ color: 'var(--muted)' }}>
                    Total privileges granted: {selectedRole.permissions?.length} of {permissionsData?.total || 132}
                  </small>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: selectedRole.name === 'Administrator' ? 'var(--danger-soft)' : 'var(--primary-soft)',
                  color: selectedRole.name === 'Administrator' ? 'var(--danger)' : 'var(--primary)'
                }}>
                  {selectedRole.name === 'Administrator' ? 'Full SuperAdmin Privileges' : 'Scoped Role'}
                </span>
              </div>

              {/* Module Privileges Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {permissionsData?.modules?.map((m: any) => {
                  const modulePerms = m.actions.map((act: string) => {
                    const actionName = act.split('.')[1];
                    const isGranted = selectedRole.permissions?.includes(act);
                    return { act, actionName, isGranted };
                  });

                  const grantedCount = modulePerms.filter((p: any) => p.isGranted).length;

                  return (
                    <div key={m.module} style={{
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '14px',
                      background: grantedCount > 0 ? 'var(--surface)' : 'var(--surface-2)',
                      opacity: grantedCount > 0 ? 1 : 0.65
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <b style={{ fontSize: '13px', color: 'var(--text)' }}>{m.module}</b>
                        <span style={{ fontSize: '11px', color: grantedCount > 0 ? 'var(--primary)' : 'var(--muted)', fontWeight: 600 }}>
                          {grantedCount}/{m.actions.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {modulePerms.map((p: any) => (
                          <span
                            key={p.act}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: p.isGranted ? 'var(--success-soft)' : 'var(--surface-2)',
                              color: p.isGranted ? 'var(--success)' : 'var(--muted)'
                            }}
                          >
                            <i className={`bi bi-${p.isGranted ? 'check' : 'x'}`} />
                            {p.actionName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
