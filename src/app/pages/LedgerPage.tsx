import { useEffect, useState } from 'react';
import { DataTable, PageHeader } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';
import { downloadExcel, openPrintDocument, printableTable } from '../../shared/components/exportUtils';

export function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch journal entries from API
    api.get<any>('/journal-entries', { pageSize: 50 })
      .then(res => setEntries(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ledgerRows = entries.flatMap(entry => (entry.lines || []).map((line: any) => ({
    date: formatDate(entry.entryDate),
    reference: entry.reference,
    description: line.description || entry.description,
    debit: line.debit > 0 ? formatCurrency(line.debit) : '',
    credit: line.credit > 0 ? formatCurrency(line.credit) : '',
    balance: '-',
  })));
  const ledgerHeaders = ['Date', 'Reference', 'Description', 'Debit (EGP)', 'Credit (EGP)', 'Running balance'];
  const exportRows = ledgerRows.map(row => [row.date, row.reference || '', row.description || '', row.debit, row.credit, row.balance]);

  return (
    <>
      <PageHeader
        eyebrow="Finance / Accounting"
        title="General ledger"
        description="Review account activity and maintain your financial records."
        action={
          <>
            <button className="soft-button" onClick={() => openPrintDocument('General ledger', `${ledgerRows.length} journal lines`, printableTable(ledgerHeaders, exportRows))}>
              <i className="bi bi-printer" /> Print
            </button>
            <button className="primary-button" onClick={() => downloadExcel({ fileName: 'indigo_general_ledger', sheetName: 'General Ledger', title: 'General ledger', subtitle: `${ledgerRows.length} journal lines · ${new Date().toLocaleDateString()}`, headers: ledgerHeaders, rows: exportRows })}>
              <i className="bi bi-file-earmark-spreadsheet" /> Export Excel
            </button>
          </>
        }
      />
      <section className="filter-strip">
        <button className="select-pill">
          All accounts <i className="bi bi-chevron-down" />
        </button>
        <button className="select-pill">
          <i className="bi bi-calendar3" /> Aug 1 — Aug 31, 2026 <i className="bi bi-chevron-down" />
        </button>
        <button className="select-pill">
          All transactions <i className="bi bi-chevron-down" />
        </button>
      </section>
      
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading ledger entries...</div>
      ) : (
        <DataTable
          search={false}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'reference', label: 'Reference' },
            { key: 'description', label: 'Description' },
            { key: 'debit', label: 'Debit' },
            { key: 'credit', label: 'Credit' },
            { key: 'balance', label: 'Running balance' },
          ]}
          rows={ledgerRows}
        />
      )}
    </>
  );
}
