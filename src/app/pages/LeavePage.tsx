import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatDate } from '../../infrastructure/api/formatters';

export function LeavePage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/leave', { pageSize: 100 });
      setLeaves(res.items || res);
      const emps = await api.get<any>('/employees', { pageSize: 100 });
      setEmployees(emps.items || emps);
      const types = await api.get<any>('/leave/types', { pageSize: 100 });
      setLeaveTypes(types.items || types);
    } catch (err) {
      notify('Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'cancel') => {
    try {
      if (action === 'reject') {
        await api.post(`/leave/${id}/reject`, "Rejected via dashboard");
      } else if (action === 'cancel') {
        await api.post(`/leave/${id}/cancel`);
      } else {
        await api.post(`/leave/${id}/approve`);
      }
      notify(`Leave ${action}d successfully.`);
      loadData();
    } catch (err: any) {
      notify(err.message || `Failed to ${action} leave.`);
    }
  };

  const rows = leaves.map(l => ({
    employee: l.employeeName,
    type: l.leaveType,
    startDate: formatDate(l.startDate),
    endDate: formatDate(l.endDate),
    days: l.days,
    status: <StatusBadge status={l.status} actions={[
      { label: 'Approve', onClick: () => handleAction(l.id, 'approve') },
      { label: 'Reject', onClick: () => handleAction(l.id, 'reject') },
    ].filter(() => l.status === 'Pending').concat(
      l.status === 'Approved' ? [{ label: 'Cancel', onClick: () => handleAction(l.id, 'cancel') }] : []
    )} />,
    _rawId: l.id,
    _status: l.status
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Leave management"
        description="Review and manage employee leave requests."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-plus-lg" /> Request leave
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading leaves...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'type', label: 'Leave Type' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'days', label: 'Days' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            { label: 'Approve', icon: 'check-lg', color: 'var(--success)', show: (r: any) => r._status === 'Pending', onClick: (r: any) => handleAction(r._rawId, 'approve') },
            { label: 'Reject', icon: 'x-lg', color: 'var(--danger)', show: (r: any) => r._status === 'Pending', onClick: (r: any) => handleAction(r._rawId, 'reject') },
            { label: 'Cancel', icon: 'slash-circle', show: (r: any) => r._status === 'Approved', onClick: (r: any) => handleAction(r._rawId, 'cancel') },
          ]}
        />
      )}
      {dialog && (
        <FormDialog
          title="Request leave"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const employeeId = employees.find(e => `${e.firstName} ${e.lastName}` === data['Employee'])?.id;
              const leaveTypeId = leaveTypes.find(t => t.name === data['Leave Type'])?.id;
              await api.post('/leave', {
                employeeId,
                leaveTypeId,
                startDate: data['Start Date'],
                endDate: data['End Date'],
                reason: data['Reason'],
              });
              setDialog(false);
              notify('Leave requested successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to request leave');
            }
          }}
          fields={[
            { label: 'Employee', required: true, options: employees.map(e => `${e.firstName} ${e.lastName}`) },
            { label: 'Leave Type', required: true, options: leaveTypes.map(t => t.name) },
            { label: 'Start Date', type: 'date', required: true },
            { label: 'End Date', type: 'date', required: true },
            { label: 'Reason', required: true },
          ]}
        />
      )}
    </>
  );
}
