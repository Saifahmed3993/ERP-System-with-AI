import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { invoiceService } from '../../infrastructure/services/invoiceService';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';
import type { InvoiceDto } from '../../infrastructure/api/types';
import { downloadExcel } from '../../shared/components/exportUtils';

export function InvoiceDetailPage({ notify }: { notify: (message: string) => void }) {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  
  const loadInvoice = () => {
    if (id) {
      setLoading(true);
      invoiceService.getById(id)
        .then(setInvoice)
        .catch(() => notify('Failed to load invoice details.'))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id, notify]);

  const handleSend = async () => {
    try {
      await invoiceService.send(id!);
      notify('Invoice sent to customer.');
      loadInvoice();
    } catch (err: any) {
      notify(err.message || 'Failed to send invoice.');
    }
  };



  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading invoice...</div>;
  if (!invoice) return <div style={{ padding: '40px', textAlign: 'center' }}>Invoice not found.</div>;

  return (
    <>
      <PageHeader
        eyebrow="Finance / Invoices"
        title={invoice.invoiceNumber}
        description={`Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        action={
          <>
            <button className="soft-button" onClick={() => window.print()}>
              <i className="bi bi-printer" /> Print
            </button>
            <button className="soft-button" onClick={() => downloadExcel({
              fileName: `invoice_${invoice.invoiceNumber}`,
              sheetName: 'Invoice',
              title: `Invoice ${invoice.invoiceNumber}`,
              subtitle: `${invoice.customerName} · ${formatDate(invoice.issueDate)} · ${invoice.status}`,
              headers: ['Invoice', 'Customer', 'Status', 'Issue date', 'Due date', 'Subtotal (EGP)', 'Tax (EGP)', 'Total (EGP)', 'Paid (EGP)', 'Balance due (EGP)'],
              rows: [[invoice.invoiceNumber, invoice.customerName, invoice.status, formatDate(invoice.issueDate), formatDate(invoice.dueDate), invoice.totalAmount - invoice.taxAmount, invoice.taxAmount, invoice.totalAmount, invoice.paidAmount, invoice.totalAmount - invoice.paidAmount]],
              totalRows: [0],
            })}>
              <i className="bi bi-file-earmark-spreadsheet" /> Export Excel
            </button>
            <button className="primary-button" onClick={handleSend} disabled={invoice.status !== 'Draft'}>
              <i className="bi bi-send" /> Send invoice
            </button>
          </>
        }
      />
      <section className="invoice-document panel">
        <div className="invoice-brand">
          <span className="brand-mark">
            <i className="bi bi-boxes" />
          </span>
          <div>
            <b>indigo ERP</b>
            <small>Nile Horizon Technologies S.A.E · Smart Village Giza, Egypt</small>
          </div>
          <div className="invoice-status">
            <span>Invoice</span>
            <strong>{invoice.invoiceNumber}</strong>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="invoice-address">
          <div>
            <small>Billed to</small>
            <b>{invoice.customerName}</b>
            <span>
              Finance Department
              <br />
              Enterprise District, Cairo
            </span>
          </div>
          <div>
            <small>Invoice date</small>
            <b>{formatDate(invoice.issueDate)}</b>
            <small>Due date</small>
            <b>{formatDate(invoice.dueDate)}</b>
          </div>
        </div>
        <table className="invoice-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Enterprise platform subscription — August</td>
              <td>1</td>
              <td>{formatCurrency(invoice.totalAmount - invoice.taxAmount)}</td>
              <td>{formatCurrency(invoice.taxAmount)}</td>
              <td>{formatCurrency(invoice.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="invoice-total">
          <span>
            Subtotal <b>{formatCurrency(invoice.totalAmount - invoice.taxAmount)}</b>
          </span>
          <span>
            Tax <b>{formatCurrency(invoice.taxAmount)}</b>
          </span>
          <strong>
            Total <b>{formatCurrency(invoice.totalAmount)}</b>
          </strong>
        </div>
        <div className="payment-history">
          <h2>Payment history</h2>
          <p>
            Payments recorded: <b>{formatCurrency(invoice.paidAmount)}</b>. Balance due:{' '}
            <b>{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</b>
          </p>
          <button className="soft-button" onClick={() => setPaymentDialog(true)} disabled={invoice.status === 'Paid' || invoice.status === 'Cancelled'}>
            Record payment
          </button>
        </div>
      </section>
      
      {paymentDialog && (
        <FormDialog
          title="Record Payment"
          close={() => setPaymentDialog(false)}
          submit={async (data) => {
            try {
              await api.post('/payments', {
                method: data['Method'],
                amount: Number(data['Amount']),
                paymentDate: data['Date'],
                reference: data['Reference'],
                invoiceId: invoice.id,
                customerId: invoice.customerName ? null : null, // Backend can look up Customer from Invoice if needed, or we just pass InvoiceId
                notes: data['Notes']
              });
              setPaymentDialog(false);
              notify('Payment recorded successfully.');
              loadInvoice();
            } catch (err: any) {
              notify(err.message || 'Failed to record payment');
            }
          }}
          fields={[
            {
              label: 'Method',
              type: 'select',
              required: true,
              options: [
                { value: 'BankTransfer', label: 'Bank Transfer' },
                { value: 'CorporateCard', label: 'Credit / Corporate Card' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Cheque', label: 'Check / Cheque' },
                { value: 'Other', label: 'Other' },
              ]
            },
            { label: 'Amount', type: 'number', required: true },
            { label: 'Date', type: 'date', required: true },
            { label: 'Reference' },
            { label: 'Notes' },
          ]}
        />
      )}
    </>
  );
}
