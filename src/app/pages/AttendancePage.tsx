import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatDate } from '../../infrastructure/api/formatters';

export function AttendancePage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get<any>('/attendance', { pageSize: 100 });
      setAttendance(res.items || res);
      const emps = await api.get<any>('/employees', { pageSize: 100 });
      setEmployees(emps.items || emps);
    } catch (err) {
      notify('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckOut = async (id: string) => {
    try {
      const time = new Date().toTimeString().substring(0, 8); // format "HH:mm:ss"
      await api.put(`/attendance/${id}/check-out`, time);
      notify('Checked out successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to check out.');
    }
  };

  const rows = attendance.map(a => ({
    date: formatDate(a.date),
    employee: a.employeeName,
    checkIn: a.checkIn || '-',
    checkOut: a.checkOut || (a.checkIn ? <button className="soft-button attendance-checkout" aria-label={`Check out ${a.employeeName}`} onClick={() => handleCheckOut(a.id)}><i className="bi bi-box-arrow-right" /> Check Out</button> : '—'),
    hours: a.workingHours ? a.workingHours.toFixed(2) : '-',
    status: <StatusBadge status={a.status} />,
    _rawId: a.id,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Attendance"
        description="Track attendance. Select Check Out in a row’s Check Out column when an employee is ready to leave."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-clock" /> Check In
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading attendance...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'employee', label: 'Employee' },
            { key: 'checkIn', label: 'Check In' },
            { key: 'checkOut', label: 'Check Out' },
            { key: 'hours', label: 'Working Hours' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
        />
      )}
      {dialog && (
        <FormDialog
          title="Manual Check In"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const employeeId = employees.find(e => `${e.firstName} ${e.lastName}` === data['Employee'])?.id;
              await api.post('/attendance/check-in', {
                employeeId,
                date: data['Date'],
                checkIn: data['Time'] + ':00', // pad seconds
              });
              setDialog(false);
              notify('Checked in successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to check in');
            }
          }}
          fields={[
            { label: 'Employee', required: true, options: employees.map(e => `${e.firstName} ${e.lastName}`) },
            { label: 'Date', type: 'date', required: true },
            { label: 'Time', type: 'time', required: true },
          ]}
        />
      )}
    </>
  );
}
