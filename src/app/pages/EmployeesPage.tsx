import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { employeeService } from '../../infrastructure/services/employeeService';
import { api } from '../../infrastructure/api/apiClient';
import { formatDate } from '../../infrastructure/api/formatters';
import type { EmployeeDto } from '../../infrastructure/api/types';

export function EmployeesPage({ notify }: { notify: (m: string) => void }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const res = await employeeService.getAll({ pageSize: 100 });
      setEmployees(res.items);
      
      const deps = await api.get<any>('/departments');
      setDepartments(deps.items || deps);
      
      const pos = await api.get<any>('/positions');
      setPositions(pos.items || pos);
    } catch (err) {
      notify('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const employeeRows = employees.map((e) => ({
    id: <span className="code">{e.employeeCode}</span>,
    employee: (
      <div className="person">
        <Avatar initials={`${e.firstName.substring(0,1)}${e.lastName.substring(0,1)}`.toUpperCase()} name={`${e.firstName} ${e.lastName}`} />
        <div>
          <b>{e.firstName} {e.lastName}</b>
          <small>{e.email}</small>
        </div>
      </div>
    ),
    department: e.department,
    position: e.position,
    type: e.employmentType,
    joined: formatDate(e.joinDate),
    status: <StatusBadge status={e.status} />,
    salary: `${e.monthlySalary.toLocaleString()} EGP`,
    _rawId: e.id,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources / Directory"
        title="Employees"
        description="Manage your workforce and keep employee records up to date."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-person-plus" /> Add employee
          </button>
        }
      />
      <section className="compact-stats">
        <div>
          <span>Active employees</span>
          <b>{employees.filter((e) => e.status === 'Active').length}</b>
        </div>
        <div>
          <span>On leave</span>
          <b>{employees.filter((e) => e.status === 'OnLeave').length}</b>
        </div>
        <div>
          <span>Terminated</span>
          <b>{employees.filter((e) => e.status === 'Terminated').length}</b>
        </div>
        <div>
          <span>Total records</span>
          <b>{employees.length}</b>
        </div>
      </section>
      
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading employees...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Employee ID' },
            { key: 'employee', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'position', label: 'Position' },
            { key: 'type', label: 'Employment type' },
            { key: 'joined', label: 'Join date' },
            { key: 'status', label: 'Status' },
            { key: 'salary', label: 'Salary' },
          ]}
          rows={employeeRows}
          actions={[{ label: 'View Profile', icon: 'person', onClick: (r: any) => navigate(`/hr/employees/${r._rawId}`) }]}
        />
      )}
      
      {dialog && (
        <FormDialog
          title="Add employee"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const departmentId = departments.find(d => d.name === data['Department'])?.id || departments[0]?.id || '00000000-0000-0000-0000-000000000000';
              const positionId = positions.find(p => p.title === data['Position'])?.id || positions[0]?.id || '00000000-0000-0000-0000-000000000000';
              const managerId = data['Manager'] || undefined;
              
              await employeeService.create({
                firstName: data['First name'],
                lastName: data['Last name'],
                email: data['Work email'],
                departmentId,
                positionId,
                managerId,
                joinDate: data['Join date'],
                monthlySalary: Number(data['Monthly salary']),
                employmentType: data['Employment type'],
              });
              setDialog(false);
              notify('Employee created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create employee');
            }
          }}
          fields={[
            { label: 'First name', required: true },
            { label: 'Last name', required: true },
            { label: 'Work email', type: 'email', required: true },
            { label: 'Department', required: true, options: departments.map(d => d.name) },
            { label: 'Position', required: true, options: positions.map(p => p.title) },
            { label: 'Manager', type: 'select', options: [{ value: '', label: 'None' }, ...employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))] },
            { label: 'Employment type', required: true, options: ['FullTime', 'PartTime', 'Contract', 'Temporary'] },
            { label: 'Join date', type: 'date', required: true },
            { label: 'Monthly salary', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
