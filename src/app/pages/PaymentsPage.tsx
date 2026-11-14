import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';

export function PaymentsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [payRes, custRes, vendRes] = await Promise.all([
        api.get<any>('/payments', { pageSize: 100 }),
        api.get<any>('/customers', { pageSize: 100 }),
        api.get<any>('/vendors', { pageSize: 100 }),
      ]);
      setPayments(payRes.items || payRes);
      setCustomers((custRes.items || custRes || []).map((c: any) => ({ value: c.id, label: c.name })));
      setVendors((vendRes.items || vendRes || []).map((v: any) => ({ value: v.id, label: v.name })));
    } catch (err) {
      notify('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const rows = payments.map(p => ({
    number: <b>{p.paymentNumber}</b>,
    method: p.method,
    amount: formatCurrency(p.amount || 0),
    date: formatDate(p.paymentDate),
    relatedTo: p.customerName || p.vendorName || '-',
    status: <StatusBadge status={p.status} />,
    _rawId: p.id
  }));

  const methodOptions = [
    { value: 'BankTransfer', label: 'Bank Transfer' },
    { value: 'CorporateCard', label: 'Credit / Corporate Card' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Cheque', label: 'Check / Cheque' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description="Record incoming and outgoing payments."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-credit-card" /> Record Payment
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading payments...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'number', label: 'Payment #' },
            { key: 'method', label: 'Method' },
            { key: 'amount', label: 'Amount' },
            { key: 'date', label: 'Date' },
            { key: 'relatedTo', label: 'Related Entity' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
        />
      )}
      {dialog && (
        <FormDialog
          title="Record Payment"
          close={() => setDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/payments', {
                method: data['Method'],
                amount: Number(data['Amount']),
                paymentDate: data['Date'],
                reference: data['Reference'],
                customerId: data['Customer'] || null,
                vendorId: data['Vendor'] || null,
                notes: data['Notes'],
              });
              setDialog(false);
              notify('Payment recorded successfully.');
              loadData();
            } catch (err: any) {
              notify(err.message || 'Failed to record payment');
            }
          }}
          fields={[
            { label: 'Method', type: 'select', options: methodOptions, required: true },
            { label: 'Amount', type: 'number', required: true },
            { label: 'Date', type: 'date', required: true },
            { label: 'Reference' },
            { label: 'Customer', type: 'select', options: [{ value: '', label: 'None' }, ...customers] },
            { label: 'Vendor', type: 'select', options: [{ value: '', label: 'None' }, ...vendors] },
            { label: 'Notes' },
          ]}
        />
      )}
    </>
  );
}
