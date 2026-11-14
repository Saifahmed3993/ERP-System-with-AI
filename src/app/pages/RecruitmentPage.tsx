import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';

export function RecruitmentPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [jobRes, deptRes] = await Promise.all([
        api.get<any>('/recruitment/job-openings'),
        api.get<any>('/departments'),
      ]);
      setJobs(Array.isArray(jobRes) ? jobRes : jobRes.items || []);
      setDepartments((deptRes.items || deptRes || []).map((d: any) => ({ value: d.id, label: d.name })));
    } catch (err) {
      notify('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleClose = async (id: string) => {
    try {
      await api.post(`/recruitment/job-openings/${id}/close`);
      notify('Job opening closed successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to close job opening');
    }
  };

  const rows = jobs.map(j => ({
    title: <b>{j.title}</b>,
    department: j.department,
    position: j.position || '-',
    candidates: j.candidateCount,
    manager: j.hiringManager || '-',
    status: <StatusBadge status={j.isActive ? 'Active' : 'Closed'} actions={[
      ...(j.isActive ? [{ label: 'Close Opening', onClick: () => handleClose(j.id) }] : [])
    ]} />,
    _rawId: j.id,
    _isActive: j.isActive
  }));

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Recruitment"
        description="Manage job openings and candidate pipelines."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-plus-lg" /> New Opening
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading job openings...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', label: 'Job Title' },
            { key: 'department', label: 'Department' },
            { key: 'position', label: 'Position' },
            { key: 'candidates', label: 'Candidates' },
            { key: 'manager', label: 'Hiring Manager' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            {
              label: 'Close Opening',
              icon: 'x-circle',
              color: 'var(--danger)',
              show: (r: any) => r._isActive,
              onClick: (r: any) => handleClose(r._rawId)
            }
          ]}
        />
      )}
      {dialog && (
        <FormDialog
          title="New Job Opening"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/recruitment/job-openings', {
                title: data['Job Title'],
                departmentId: data['Department'],
                description: data['Description'],
                requirements: data['Requirements'],
                salaryMin: data['Min Salary'] ? Number(data['Min Salary']) : null,
                salaryMax: data['Max Salary'] ? Number(data['Max Salary']) : null,
              });
              setDialog(false);
              notify('Job opening created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create job opening.');
            }
          }}
          fields={[
            { label: 'Job Title', required: true },
            { label: 'Department', type: 'select', options: departments, required: true },
            { label: 'Description' },
            { label: 'Requirements' },
            { label: 'Min Salary', type: 'number' },
            { label: 'Max Salary', type: 'number' },
          ]}
        />
      )}
    </>
  );
}
