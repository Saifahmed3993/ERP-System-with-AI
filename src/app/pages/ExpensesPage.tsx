import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';

export function ExpensesPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [expRes, empRes] = await Promise.all([
        api.get<any>('/expenses', { pageSize: 100 }),
        api.get<any>('/employees', { pageSize: 100 }),
      ]);
      setExpenses(expRes.items || expRes);
      setEmployees((empRes.items || empRes || []).map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })));
    } catch (err) {
      notify('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/expenses/${id}/${action}`);
      notify(`Expense ${action}d successfully.`);
      loadData();
    } catch (err: any) {
      notify(err.message || `Failed to ${action} expense.`);
    }
  };

  const rows = expenses.map(e => ({
    title: <b>{e.title}</b>,
    employee: e.employeeName || '-',
    category: e.category,
    amount: formatCurrency(e.amount || 0),
    date: formatDate(e.expenseDate),
    status: <StatusBadge status={e.status} actions={[
      { label: 'Approve', onClick: () => handleAction(e.id, 'approve') },
      { label: 'Reject', onClick: () => handleAction(e.id, 'reject') },
    ].filter(() => e.status === 'Pending')} />,
    _rawId: e.id,
    _canApprove: e.status === 'Pending'
  }));

  const categoryOptions = [
    { value: 'Travel', label: 'Travel' },
    { value: 'Meals', label: 'Meals & Entertainment' },
    { value: 'Office', label: 'Office Supplies' },
    { value: 'Hardware', label: 'Hardware/Software' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Track and approve corporate expenses."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-receipt" /> Record Expense
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading expenses...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'employee', label: 'Employee' },
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            { label: 'Approve', icon: 'check-lg', color: 'var(--success)', show: (r: any) => r._canApprove, onClick: (r: any) => handleAction(r._rawId, 'approve') },
            { label: 'Reject', icon: 'x-lg', color: 'var(--danger)', show: (r: any) => r._canApprove, onClick: (r: any) => handleAction(r._rawId, 'reject') },
          ]}
        />
      )}
      {dialog && (
        <FormDialog
          title="Record Expense"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/expenses', {
                title: data['Title'],
                employeeId: data['Employee'] || null,
                category: data['Category'],
                amount: Number(data['Amount']),
                expenseDate: data['Date'],
                description: data['Description'],
              });
              setDialog(false);
              notify('Expense recorded successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to record expense');
            }
          }}
          fields={[
            { label: 'Title', required: true },
            { label: 'Employee', type: 'select', options: [{ value: '', label: 'None' }, ...employees] },
            { label: 'Category', type: 'select', options: categoryOptions, required: true },
            { label: 'Amount', type: 'number', required: true },
            { label: 'Date', type: 'date', required: true },
            { label: 'Description' },
          ]}
        />
      )}
    </>
  );
}
