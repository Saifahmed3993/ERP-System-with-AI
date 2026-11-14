import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FormDialog, PageHeader, StatCard, StatusBadge } from '../../shared/components/ui';
import { invoiceService } from '../../infrastructure/services/invoiceService';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';
import type { InvoiceDto } from '../../infrastructure/api/types';

export function InvoicesPage({ notify }: { notify: (m: string) => void }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await invoiceService.getAll({ pageSize: 100 });
      setInvoices(res.items);
      const custRes = await api.get<any>('/customers');
      setCustomers(custRes.items || custRes);
    } catch (err) {
      notify('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const invoiceRows = invoices.map((i) => ({
    invoice: <b className="code">{i.invoiceNumber}</b>,
    customer: i.customerName,
    issued: formatDate(i.issueDate),
    due: formatDate(i.dueDate),
    amount: <b>{formatCurrency(i.totalAmount)}</b>,
    balance: formatCurrency(i.totalAmount - i.paidAmount),
    status: <StatusBadge status={i.status} actions={[
      ...(i.status === 'Draft' ? [{ label: 'Send', onClick: () => handleAction(i.id, 'send') }] : []),
      ...(['Draft', 'Sent'].includes(i.status) ? [{ label: 'Cancel', onClick: () => handleAction(i.id, 'cancel') }] : []),
    ]} />,
    _rawId: i.id,
    _status: i.status,
  }));

  const handleAction = async (id: string, action: 'send' | 'cancel') => {
    try {
      await invoiceService[action](id);
      notify(`Invoice ${action === 'send' ? 'sent' : 'cancelled'} successfully.`);
      loadData();
    } catch (err: any) {
      notify(err.message || `Failed to ${action} invoice.`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Finance / Receivables"
        title="Invoices"
        description="Create, send, and track customer invoices in one place."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-plus-lg" /> New invoice
          </button>
        }
      />
      <section className="stats-grid finance-stats">
        <StatCard label="Total Invoices" value={invoices.length.toString()} delta="" icon="receipt" />
        <StatCard
          label="Drafts"
          value={invoices.filter((i) => i.status === 'Draft').length.toString()}
          delta=""
          icon="file-earmark"
          accent="purple"
        />
        <StatCard
          label="Unpaid"
          value={invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length.toString()}
          delta=""
          icon="hourglass-split"
          accent="sky"
        />
        <StatCard
          label="Paid"
          value={invoices.filter((i) => i.status === 'Paid').length.toString()}
          delta=""
          icon="check2-circle"
          accent="green"
        />
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading invoices...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'invoice', label: 'Invoice number' },
            { key: 'customer', label: 'Customer' },
            { key: 'issued', label: 'Issue date' },
            { key: 'due', label: 'Due date' },
            { key: 'amount', label: 'Amount' },
            { key: 'balance', label: 'Balance' },
            { key: 'status', label: 'Status' },
          ]}
          rows={invoiceRows}
          actions={[
            { label: 'View details', icon: 'eye', onClick: (r: any) => navigate(`/finance/invoices/${r._rawId}`) },
            { label: 'Send', icon: 'send', color: 'var(--primary)', show: (r: any) => r._status === 'Draft', onClick: (r: any) => handleAction(r._rawId, 'send') },
            { label: 'Cancel', icon: 'slash-circle', color: 'var(--danger)', show: (r: any) => ['Draft', 'Sent'].includes(r._status), onClick: (r: any) => handleAction(r._rawId, 'cancel') },
          ]}
        />
      )}

      {dialog && (
        <FormDialog
          title="Create invoice"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              const customerId = customers.find(c => c.name === data['Customer'])?.id;
              if (!customerId) { notify('Customer is required.'); return; }
              await api.post('/invoices', {
                customerId,
                issueDate: data['Issue date'],
                dueDate: data['Due date'],
                items: [
                  { 
                    description: data['Item description'] || 'Standard Service', 
                    quantity: 1, 
                    unitPrice: Number(data['Amount'] || 0), 
                    taxRate: Number(data['Tax rate %'] || 0) 
                  }
                ]
              });
              setDialog(false);
              notify('Invoice created successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to create invoice');
            }
          }}
          fields={[
            { label: 'Customer', required: true, options: customers.map(c => c.name) },
            { label: 'Issue date', type: 'date', required: true },
            { label: 'Due date', type: 'date', required: true },
            { label: 'Item description', required: true },
            { label: 'Amount', type: 'number', required: true },
            { label: 'Tax rate %', type: 'number', required: true },
          ]}
        />
      )}
    </>
  );
}
