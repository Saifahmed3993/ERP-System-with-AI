import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { employeeService } from '../../infrastructure/services/employeeService';
import { api } from '../../infrastructure/api/apiClient';
import { formatDate } from '../../infrastructure/api/formatters';
import type { EmployeeDto } from '../../infrastructure/api/types';
import { downloadExcel, openPrintDocument, printableTable } from '../../shared/components/exportUtils';

export function EmployeeProfilePage({ notify }: { notify: (message: string) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tab, setTab] = useState('Overview');
  const tabs = ['Overview', 'Personal information', 'Employment', 'Attendance', 'Leave', 'Payroll', 'Benefits', 'Documents', 'Performance'];

  const loadData = async () => {
    if (!id) return;
    try {
      const emp = await employeeService.getById(id);
      setEmployee(emp);
      
      const allEmps = await employeeService.getAll({ pageSize: 100 });
      setEmployees(allEmps.items);

      const deps = await api.get<any>('/departments');
      setDepartments(deps.items || deps);
      
      const pos = await api.get<any>('/positions');
      setPositions(pos.items || pos);
    } catch (err) {
      notify('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading employee details...</div>;
  if (!employee) return <div style={{ padding: '40px', textAlign: 'center' }}>Employee not found.</div>;

  return (
    <>
      <PageHeader
        eyebrow="Human resources / Employees"
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.employeeCode} · ${employee.position} · ${employee.department}`}
        action={
          <>
            <button className="soft-button" onClick={async () => {
                try {
                  await employeeService.update(id!, { status: 'Terminated' });
                  notify('Employee deactivated (status set to Terminated).');
                  loadData();
                } catch (err: any) {
                  notify(err.message || 'Failed to deactivate employee.');
                }
            }}>
              <i className="bi bi-person-x" /> Deactivate
            </button>
            <button className="primary-button" onClick={() => setDialog(true)}>
              <i className="bi bi-pencil" /> Edit profile
            </button>
          </>
        }
      />
      <section className="profile-hero panel">
        <Avatar initials={`${employee.firstName.substring(0, 1)}${employee.lastName.substring(0, 1)}`.toUpperCase()} name={`${employee.firstName} ${employee.lastName}`} />
        <div>
          <h2>
            {employee.firstName} {employee.lastName} <StatusBadge status={employee.status} />
          </h2>
          <p>
            {employee.position} · {employee.department} · {employee.location || 'Remote'}
          </p>
          <small>
            Reports to {employee.managerName || 'No Manager'} · Joined {formatDate(employee.joinDate)}
          </small>
        </div>
        <div className="profile-quick">
          <button onClick={() => navigate(`/hr/attendance?search=${employee.firstName}`)}>
            <i className="bi bi-calendar2-check" /> Attendance
          </button>
          <button onClick={() => {
            const headers = ['Employee', 'Employee code', 'Department', 'Position', 'Status', 'Monthly salary (EGP)'];
            const rows = [[`${employee.firstName} ${employee.lastName}`, employee.employeeCode, employee.department, employee.position, employee.status, employee.monthlySalary || 0]];
            openPrintDocument('Employee salary statement', `${employee.firstName} ${employee.lastName} · Confidential`, printableTable(headers, rows), false);
          }}>
            <i className="bi bi-printer" /> Payslip PDF
          </button>
          <button onClick={() => {
            const headers = ['Employee', 'Employee code', 'Department', 'Position', 'Status', 'Monthly salary (EGP)'];
            const rows = [[`${employee.firstName} ${employee.lastName}`, employee.employeeCode, employee.department, employee.position, employee.status, employee.monthlySalary || 0]];
            downloadExcel({ fileName: `payslip_${employee.employeeCode || employee.id}`, sheetName: 'Payslip', title: 'Employee salary statement', subtitle: `${employee.firstName} ${employee.lastName} · Confidential · ${new Date().toLocaleDateString()}`, headers, rows });
          }}>
            <i className="bi bi-file-earmark-spreadsheet" /> Payslip Excel
          </button>
          <button onClick={() => { window.location.href = `mailto:${employee.email || ''}?subject=Message from HR`; }}>
            <i className="bi bi-chat-left-text" /> Message
          </button>
        </div>
      </section>
      <div className="profile-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={tab === item ? 'active' : ''}>
            {item}
          </button>
        ))}
      </div>
      {tab === 'Overview' ? (
        <section className="profile-layout">
          <div>
            <section className="panel info-card">
              <div className="panel-head">
                <h2>Personal information</h2>
                <button className="text-button" onClick={() => setDialog(true)}>Edit</button>
              </div>
              <div className="info-grid">
                <span>
                  <small>Work email</small>
                  {employee.email}
                </span>
                <span>
                  <small>Phone</small>
                  {employee.phone || 'Not provided'}
                </span>
                <span>
                  <small>Employment type</small>
                  {employee.employmentType}
                </span>
                <span>
                  <small>Location</small>
                  {employee.location || 'Remote'}
                </span>
                <span>
                  <small>Manager</small>
                  {employee.managerName || 'None'}
                </span>
                <span>
                  <small>Cost center</small>
                  Product · 302
                </span>
              </div>
            </section>
            <section className="panel timeline">
              <div className="panel-head">
                <h2>Employment timeline</h2>
              </div>
              {[
                [`Joined ${formatDate(employee.joinDate)}`, 'Joined Nile Horizon Technologies S.A.E'],
              ].map((item) => (
                <div key={item[0]}>
                  <b>{item[0]}</b>
                  <span>{item[1]}</span>
                </div>
              ))}
            </section>
          </div>
          <section className="panel profile-side">
            <h2>Compensation</h2>
            <strong>
              {employee.monthlySalary.toLocaleString()} EGP
              <small> / month</small>
            </strong>
            <span>Next payroll · Sep 30, 2026</span>
            <hr />
            <h2>Time off</h2>
            <strong>
              18.5 <small>days available</small>
            </strong>
            <span>2 requests in the current year</span>
          </section>
        </section>
      ) : (
        <section className="panel tab-placeholder">
          <div className="empty-icon">
            <i className="bi bi-check2-circle" />
          </div>
          <h2>{tab}</h2>
          <p>
            {tab} records for {employee.firstName} {employee.lastName} are up to date and ready to review.
          </p>
          <button className="soft-button" onClick={() => notify(`${tab} details opened.`)}>
            View details
          </button>
        </section>
      )}
      {dialog && (
        <FormDialog
          title="Edit employee"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const departmentId = departments.find(d => d.name === data['Department'])?.id || departments.find(d => d.name === employee.department)?.id;
              const positionId = positions.find(p => p.title === data['Position'])?.id || positions.find(p => p.title === employee.position)?.id;
              const managerId = data['Manager'] || undefined;
              
              await employeeService.update(id!, {
                firstName: data['First name'] || employee.firstName,
                lastName: data['Last name'] || employee.lastName,
                email: data['Work email'] || employee.email,
                departmentId,
                positionId,
                managerId,
                joinDate: data['Join date'] || employee.joinDate,
                monthlySalary: Number(data['Monthly salary']) || employee.monthlySalary,
                employmentType: data['Employment type'] || employee.employmentType,
                status: employee.status,
              });
              setDialog(false);
              notify('Employee updated successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to update employee');
            }
          }}
          fields={[
            { label: 'First name', required: true },
            { label: 'Last name', required: true },
            { label: 'Work email', type: 'email', required: true },
            { label: 'Department', required: true, options: departments.map((d: any) => d.name) },
            { label: 'Position', required: true, options: positions.map((p: any) => p.title) },
            { label: 'Manager', type: 'select', options: [{ value: '', label: 'None' }, ...employees.filter(e => e.id !== id).map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))] },
            { label: 'Employment type', required: true, options: ['FullTime', 'PartTime', 'Contract', 'Temporary'] },
            { label: 'Join date', type: 'date', required: true },
            { label: 'Monthly salary', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
