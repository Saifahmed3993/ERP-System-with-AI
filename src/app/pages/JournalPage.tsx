import { useEffect, useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatCurrency, formatDate } from '../../infrastructure/api/formatters';

export function JournalPage({ notify }: { notify: (message: string) => void }) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{accountId: string, description: string, debit: number, credit: number}[]>([{ accountId: '', description: '', debit: 0, credit: 0 }, { accountId: '', description: '', debit: 0, credit: 0 }]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };
  
  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };
  
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/accounts', { pageSize: 100 });
      setAccounts(res.items || res);
      
      const entriesRes = await api.get<any>('/journal-entries', { pageSize: 100 });
      setEntries(entriesRes.items || entriesRes);
    } catch (err) {
      notify('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!reference) { notify('Reference is required.'); return; }
    if (!balanced) { notify('Journal entry must be balanced.'); return; }
    
    if (lines.some(l => !l.accountId)) { notify('All lines must have an account.'); return; }

    try {
      await api.post('/journal-entries', {
        entryDate: date,
        reference,
        description,
        lines: lines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        }))
      });
      notify('Journal entry posted successfully.');
      setReference('');
      setDescription('');
      setLines([{ accountId: '', description: '', debit: 0, credit: 0 }, { accountId: '', description: '', debit: 0, credit: 0 }]);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to post entry.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rows = entries.map(e => ({
    date: formatDate(e.entryDate),
    reference: <b className="code">{e.reference}</b>,
    description: e.description,
    status: <StatusBadge status={e.status || 'Posted'} actions={[
      ...((e.status === 'Draft' || !e.status) ? [{ label: 'Post', onClick: () => handleAction(e.id, 'post') }] : []),
      ...(e.status === 'Posted' ? [{ label: 'Reverse', onClick: () => handleAction(e.id, 'reverse') }] : []),
    ]} />,
    amount: formatCurrency(e.lines?.reduce((sum: number, l: any) => sum + (l.debit || 0), 0) || 0),
    _rawId: e.id,
    _status: e.status || 'Posted'
  }));

  const handleAction = async (id: string, action: 'post' | 'reverse') => {
    try {
      await api.post(`/journal-entries/${id}/${action}`);
      notify(`Journal entry ${action}ed successfully.`);
      fetchData();
    } catch (err: any) {
      notify(err.message || `Failed to ${action} entry.`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Finance / Accounting"
        title="Journal entries"
        description="Create, review, and post balanced accounting entries."
        action={
          <button className="primary-button" disabled={!balanced} onClick={handlePost}>
            <i className="bi bi-check2-circle" /> Post entry
          </button>
        }
      />
      <section className="journal-form panel">
        <div className="form-grid">
          <label className="form-field">
            <span>
              Entry date<b>*</b>
            </span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="form-field">
            <span>
              Reference<b>*</b>
            </span>
            <input placeholder="JE-2026-0815" value={reference} onChange={e => setReference(e.target.value)} />
          </label>
          <label className="form-field form-wide">
            <span>
              Description<b>*</b>
            </span>
            <input placeholder="Enter journal description" value={description} onChange={e => setDescription(e.target.value)} />
          </label>
        </div>
        <h2>Journal lines</h2>
        <div className="journal-lines">
          <div className="journal-row header">
            <label>Account</label>
            <label>Description</label>
            <label>Debit</label>
            <label>Credit</label>
            <label></label>
          </div>
          {lines.map((line, idx) => (
            <div className="journal-row" key={idx}>
              <select value={line.accountId} onChange={e => updateLine(idx, 'accountId', e.target.value)}>
                <option value="">Select an account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                ))}
              </select>
              <input placeholder="Line description" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
              <input type="number" value={line.debit} onChange={e => updateLine(idx, 'debit', Number(e.target.value))} />
              <input type="number" value={line.credit} onChange={e => updateLine(idx, 'credit', Number(e.target.value))} />
              <button className="icon-button" onClick={() => removeLine(idx)}><i className="bi bi-x-lg"/></button>
            </div>
          ))}
        </div>
        <button className="text-button" onClick={() => setLines([...lines, { accountId: '', description: '', debit: 0, credit: 0 }])}>
          + Add journal line
        </button>
        <div className="journal-totals">
          <span>
            Total debit <b>{formatCurrency(totalDebit)}</b>
          </span>
          <span>
            Total credit <b>{formatCurrency(totalCredit)}</b>
          </span>
          <strong className={balanced ? 'up' : 'down'}>
            {balanced ? 'Balanced' : `Difference ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
          </strong>
        </div>
      </section>
      
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading journal entries...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'reference', label: 'Reference' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Total Amount' },
            { key: 'status', label: 'Status' }
          ]}
          rows={rows}
          actions={[
            { label: 'Post', icon: 'check2-all', color: 'var(--success)', show: (r: any) => r._status === 'Draft', onClick: (r: any) => handleAction(r._rawId, 'post') },
            { label: 'Reverse', icon: 'arrow-counterclockwise', color: 'var(--danger)', show: (r: any) => r._status === 'Posted', onClick: (r: any) => handleAction(r._rawId, 'reverse') }
          ]}
        />
      )}
    </>
  );
}
