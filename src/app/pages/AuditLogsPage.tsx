import { useEffect, useState } from 'react';
import { DataTable, PageHeader } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function AuditLogsPage({ notify }: { notify: (m: string) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [filterModule, setFilterModule] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/audit-logs');
      setLogs(res.items || res);
    } catch (err: any) {
      notify(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = filterModule ? logs.filter(l => l.module?.toLowerCase() === filterModule.toLowerCase()) : logs;

  const rows = (filteredLogs || []).map(l => ({
    timestamp: new Date(l.timestamp).toLocaleString('en-US'),
    user: <b>{l.userName || 'System'}</b>,
    action: (
      <span style={{
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 700,
        background: l.action === 'Login' ? '#e0f2fe' : l.action === 'Create' ? '#dcfce7' : l.action === 'Delete' ? '#fee2e2' : '#fef3c7',
        color: l.action === 'Login' ? '#0369a1' : l.action === 'Create' ? '#15803d' : l.action === 'Delete' ? '#b91c1c' : '#b45309'
      }}>
        {l.action}
      </span>
    ),
    module: (
      <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
        {l.module}
      </span>
    ),
    description: l.description,
    _raw: l
  }));

  const modules = Array.from(new Set(logs.map(l => l.module).filter(Boolean)));

  return (
    <>
      <PageHeader
        eyebrow="Compliance & Traceability"
        title="Audit Logs & System Activity"
        description="Immutable record of user authentication, financial transactions, and master data changes."
        action={
          <div className="header-action">
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              style={{ height: '35px', padding: '0 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '11px', fontWeight: 600 }}
            >
              <option value="">All Modules</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="soft-button" onClick={loadData}>
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
          </div>
        }
      />

      <section className="compact-stats">
        <div>
          <span>Total events</span>
          <b>{logs.length}</b>
        </div>
        <div>
          <span>Audited modules</span>
          <b>{modules.length}</b>
        </div>
        <div>
          <span>Active filter</span>
          <b>{filterModule || 'All events'}</b>
        </div>
        <div>
          <span>Audit status</span>
          <b style={{ color: 'var(--success)' }}>Active & Compliant</b>
        </div>
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading audit records...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'user', label: 'User / Actor' },
            { key: 'action', label: 'Action' },
            { key: 'module', label: 'Module' },
            { key: 'description', label: 'Operation Summary' },
          ]}
          rows={rows}
          actions={[
            {
              label: 'Inspect Details',
              icon: 'search',
              color: 'var(--primary)',
              onClick: (r: any) => setSelectedLog(r._raw)
            }
          ]}
        />
      )}

      {selectedLog && (
        <div className="search-modal" role="dialog" style={{ zIndex: 1000 }}>
          <div className="search-dialog" style={{ width: '90%', maxWidth: '650px', background: 'var(--surface)', color: 'var(--text)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'Manrope, sans-serif' }}>Audit Record Details</h3>
              <button className="icon-button" onClick={() => setSelectedLog(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Timestamp:</span>
              <b>{new Date(selectedLog.timestamp).toLocaleString('en-US')}</b>
              
              <span style={{ color: 'var(--muted)' }}>Actor Name:</span>
              <b>{selectedLog.userName || 'System Service'}</b>

              <span style={{ color: 'var(--muted)' }}>Action:</span>
              <b>{selectedLog.action}</b>

              <span style={{ color: 'var(--muted)' }}>Module:</span>
              <b>{selectedLog.module}</b>

              <span style={{ color: 'var(--muted)' }}>Entity Type:</span>
              <span>{selectedLog.entityType || '—'}</span>

              <span style={{ color: 'var(--muted)' }}>Entity ID:</span>
              <span style={{ fontFamily: 'monospace' }}>{selectedLog.entityId || '—'}</span>

              <span style={{ color: 'var(--muted)' }}>Description:</span>
              <div>{selectedLog.description}</div>

              {selectedLog.oldValues && (
                <>
                  <span style={{ color: 'var(--muted)' }}>Previous Value:</span>
                  <pre style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', overflowX: 'auto', fontSize: '11px' }}>{selectedLog.oldValues}</pre>
                </>
              )}

              {selectedLog.newValues && (
                <>
                  <span style={{ color: 'var(--muted)' }}>New Value:</span>
                  <pre style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px', borderRadius: '6px', overflowX: 'auto', fontSize: '11px' }}>{selectedLog.newValues}</pre>
                </>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={() => setSelectedLog(null)} />
        </div>
      )}
    </>
  );
}
