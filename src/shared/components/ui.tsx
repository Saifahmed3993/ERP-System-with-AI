import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { Status, TableRow } from '../../core/types/domain';
import { downloadExcel, openPrintDocument, printableTable } from './exportUtils';

export function StatusBadge({ status, actions }: { status: Status | string; actions?: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const tone = /active|paid|approved|posted/i.test(status) ? 'success' : /overdue|rejected|terminated|inactive|closed|cancelled/i.test(status) ? 'danger' : /leave|pending|draft|processing|sent/i.test(status) ? 'warning' : 'neutral';
  
  if (!actions || actions.length === 0) {
    return <span className={`status ${tone}`}>{status}</span>;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        type="button" 
        className={`status ${tone}`} 
        style={{ cursor: 'pointer', outline: 'none' }} 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        {status} <i className="bi bi-chevron-down" style={{ fontSize: '0.8em', marginLeft: 4 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="column-menu" style={{ left: 0, top: '100%', marginTop: 4, zIndex: 10, minWidth: 120 }}>
            {actions.map(a => (
              <button
                key={a.label}
                type="button"
                className="text-button"
                style={{ padding: '6px 10px', textAlign: 'left', width: '100%' }}
                onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function Avatar({ initials, name }: { initials: string; name: string }) { return <span className={`avatar avatar-${initials.charCodeAt(0) % 4}`} aria-label={name}>{initials}</span>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow || 'Workspace'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</div>; }
export function StatCard({ label, value, delta, icon, accent = 'indigo', detail }: { label: string; value: string; delta: string; icon: string; accent?: string; detail?: string }) { return <article className={`stat-card ${accent}`}><div className="stat-icon"><i className={`bi bi-${icon}`} /></div><span className="stat-label">{label}</span><strong>{value}</strong><div className="stat-foot"><span className={delta.startsWith('+') ? 'up' : 'down'}><i className={`bi bi-arrow-${delta.startsWith('+') ? 'up' : 'down'}-right`} /> {delta}</span><small>{detail || 'vs. last month'}</small></div></article>; }
export function ChartCard({ title, subtitle, children, action = true }: { title: string; subtitle?: string; children: ReactNode; action?: boolean }) { return <section className="panel chart-card"><div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="icon-button" aria-label={`More options for ${title}`}><i className="bi bi-three-dots" /></button>}</div>{children}</section>; }
export function TrendChart({ data, kind = 'revenue' }: { data?: { label: string, value: number }[], kind?: 'revenue' | 'employee' }) { 
  const defaultPoints = kind === 'revenue' ? '0,122 44,96 86,108 129,65 173,80 216,42 260,55 303,15 347,34 390,1' : '0,130 44,117 86,118 129,93 173,95 216,68 260,74 303,46 347,50 390,21';
  let pointsStr = defaultPoints;
  let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  
  if (data && data.length > 0) {
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min;
    const step = 390 / Math.max(data.length - 1, 1);
    
    pointsStr = data.map((d, i) => {
      const x = (i * step).toFixed(0);
      const y = (150 - ((d.value - min) / (range || 1)) * 140).toFixed(0);
      return `${x},${y}`;
    }).join(' ');
    labels = data.map(d => d.label.split('-')[1] || d.label).slice(-9);
  }
  
  return <div className="line-chart"><div className="chart-grid"><span /><span /><span /><span /></div><svg viewBox="0 0 390 150" role="img" aria-label={kind === 'revenue' ? 'Revenue trend' : 'Employee growth trend'} preserveAspectRatio="none"><defs><linearGradient id={`fill-${kind}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="currentColor" stopOpacity=".18"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path className="area" d={`M${pointsStr} L390,150 L0,150 Z`} fill={`url(#fill-${kind})`} /><polyline points={pointsStr} /></svg><div className="x-axis">{labels.map((l, i) => <span key={i}>{l}</span>)}</div></div>; 
}
export function Bars({ labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'] }: { labels?: string[] }) { const values = [46, 62, 54, 78, 64, 88, 73, 96]; return <div className="bars">{values.map((v, i) => <div className="bar-item" key={labels[i]}><div className="bar" style={{ height: `${v}%` }}><span /></div><small>{labels[i]}</small></div>)}</div>; }
export function Donut({ value = '42%' }: { value?: string }) { return <div className="donut-wrap"><div className="donut"><div><strong>{value}</strong><small>Engineering</small></div></div><div className="legend"><span><i className="dot indigo"/>Engineering <b>42%</b></span><span><i className="dot sky"/>Product <b>24%</b></span><span><i className="dot green"/>Operations <b>18%</b></span><span><i className="dot lilac"/>Other <b>16%</b></span></div></div>; }
export function ActionMenu({ actions, row }: { actions: { label: string; icon: string; onClick: (row: any) => void; show?: (row: any) => boolean; color?: string }[]; row: any }) {
  const [open, setOpen] = useState(false);
  const available = actions.filter(a => a.show ? a.show(row) : true);
  if (!available.length) return <td></td>;
  return (
    <td style={{ position: 'relative' }}>
      <button className="icon-button" onClick={() => setOpen(!open)} aria-label="Record actions">
        <i className="bi bi-three-dots-vertical" />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
          <div className="column-menu" style={{ right: 40, top: 10, zIndex: 10, minWidth: 140 }}>
            {available.map(a => (
              <button
                key={a.label}
                className="text-button"
                style={{ padding: '6px 10px', textAlign: 'left', width: '100%', color: a.color || 'var(--text)' }}
                onClick={() => { setOpen(false); a.onClick(row); }}
              >
                <i className={`bi bi-${a.icon}`} style={{ marginRight: 8 }} /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </td>
  );
}

export function extractText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.props) {
      if (val.props.status) return String(val.props.status);
      if (val.props.children) {
        if (Array.isArray(val.props.children)) {
          return val.props.children.map(extractText).join(' ');
        }
        return extractText(val.props.children);
      }
    }
  }
  return '';
}

export function DataTable({
  columns,
  rows,
  search = true,
  onAction,
  actions,
  emptyMessage = 'No records found.'
}: {
  columns: { key: string; label: string }[];
  rows: TableRow[];
  search?: boolean;
  onAction?: (row: TableRow) => void;
  actions?: { label: string; icon: string; onClick: (row: TableRow) => void; show?: (row: TableRow) => boolean; color?: string }[];
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [visible, setVisible] = useState<string[]>(columns.map(c => c.key));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      Object.entries(row).some(([key, val]) => {
        if (key.startsWith('_')) return false;
        return extractText(val).toLowerCase().includes(q);
      })
    );
  }, [rows, query]);

  const ordered = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const rawA = extractText(a[sortKey]).trim();
      const rawB = extractText(b[sortKey]).trim();

      const numA = parseFloat(rawA.replace(/[^0-9.-]+/g, ''));
      const numB = parseFloat(rawB.replace(/[^0-9.-]+/g, ''));
      const isNumA = !isNaN(numA) && /[0-9]/.test(rawA);
      const isNumB = !isNaN(numB) && /[0-9]/.test(rawB);

      let cmp = 0;
      if (isNumA && isNumB && !rawA.includes('-') && !rawB.includes('-') && !rawA.includes('/')) {
        cmp = numA - numB;
      } else {
        cmp = rawA.localeCompare(rawB, undefined, { numeric: true, sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return ordered.slice(start, start + pageSize);
  }, [ordered, safePage, pageSize]);

  const shownColumns = columns.filter(c => visible.includes(c.key));
  const toggleAll = () => setSelected(selected.length === ordered.length ? [] : ordered.map((_, i) => i));

  return (
    <section className="panel table-panel">
      {search && (
        <div className="table-tools">
          <div className="search-field">
            <i className="bi bi-search" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search records..."
              aria-label="Search records"
            />
          </div>
          <button className="soft-button" onClick={() => setToolsOpen(!toolsOpen)}>
            <i className="bi bi-sliders" /> Columns
          </button>
          <button className="soft-button" onClick={() => {
            const headers = shownColumns.map(column => column.label);
            const values = ordered.map(row => shownColumns.map(column => extractText(row[column.key])));
            const title = document.querySelector('.page-header h1')?.textContent?.trim() || 'Indigo ERP Report';
            openPrintDocument(title, `${values.length} records · ${new Date().toLocaleDateString()}`, printableTable(headers, values));
          }}>
            <i className="bi bi-printer" /> Print / PDF
          </button>
          <button className="soft-button" onClick={() => {
            const headers = shownColumns.map(column => column.label);
            const values = ordered.map(row => shownColumns.map(column => extractText(row[column.key])));
            const title = document.querySelector('.page-header h1')?.textContent?.trim() || 'Indigo ERP Report';
            const baseName = location.pathname.split('/').filter(Boolean).join('_') || 'erp_report';
            downloadExcel({ fileName: `indigo_${baseName}`, sheetName: title, title, subtitle: `${values.length} records · ${new Date().toLocaleDateString()}`, headers, rows: values });
          }}>
            <i className="bi bi-file-earmark-spreadsheet" /> Export Excel
          </button>
          {selected.length > 0 && (
            <button className="soft-button bulk-action" onClick={() => setSelected([])}>
              <i className="bi bi-x-lg" /> Clear {selected.length}
            </button>
          )}
          {toolsOpen && (
            <div className="column-menu">
              {columns.map(c => (
                <label key={c.key}>
                  <input
                    type="checkbox"
                    checked={visible.includes(c.key)}
                    onChange={() =>
                      setVisible(current =>
                        current.includes(c.key) ? current.filter(k => k !== c.key) : [...current, c.key]
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === ordered.length}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {shownColumns.map(c => (
                <th key={c.key}>
                  <button className="sort-button" onClick={() => handleSort(c.key)}>
                    {c.label}
                    <i
                      className={`bi ${
                        sortKey === c.key
                          ? sortDir === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up sort'
                      }`}
                    />
                  </button>
                </th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => {
              const globalIdx = (safePage - 1) * pageSize + idx;
              return (
                <tr key={globalIdx}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(globalIdx)}
                      onChange={() =>
                        setSelected(current =>
                          current.includes(globalIdx)
                            ? current.filter(i => i !== globalIdx)
                            : [...current, globalIdx]
                        )
                      }
                      aria-label={`Select record ${globalIdx + 1}`}
                    />
                  </td>
                  {shownColumns.map(c => (
                    <td key={c.key}>{row[c.key] as ReactNode}</td>
                  ))}
                  {actions ? (
                    <ActionMenu actions={actions} row={row} />
                  ) : onAction ? (
                    <td>
                      <button className="icon-button" onClick={() => onAction(row)} aria-label="Record actions">
                        <i className="bi bi-three-dots-vertical" />
                      </button>
                    </td>
                  ) : (
                    <td />
                  )}
                </tr>
              );
            })}
            {!ordered.length && (
              <tr>
                <td colSpan={shownColumns.length + 2}>
                  <div className="table-empty">
                    <i className="bi bi-search" />
                    <b>{emptyMessage}</b>
                    <span>Try adjusting your search or filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>
          Showing <b>{ordered.length ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, ordered.length)}` : 0}</b> of <b>{ordered.length}</b> records
        </span>
        <div>
          <button
            className="page-btn"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <i className="bi bi-chevron-left" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .map(p => (
              <button
                key={p}
                className={`page-btn ${p === safePage ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          <button
            className="page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </div>
    </section>
  );
}

type FormField = {
  label: string;
  type?: string;
  required?: boolean;
  options?: any[];
  value?: string;
  readonly?: boolean;
  accept?: string;
  helpText?: string;
};

export function FormDialog({
  title,
  fields,
  close,
  submit
}: {
  title: string;
  fields: FormField[];
  close: () => void;
  submit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(field => [field.label, field.value ?? ''])),
  );
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [close]);

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={close}>
      <form
        className="form-dialog"
        onClick={e => e.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          const form = event.currentTarget;
          const missing = fields
            .filter(f => f.required && (f.type === 'file'
              ? !form.querySelector<HTMLInputElement>('#doc-file-input')?.files?.length
              : values[f.label] === undefined || values[f.label] === null || values[f.label] === ''))
            .map(f => f.label);
          if (missing.length) {
            setErrors(missing);
            return;
          }
          submit(values);
        }}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Indigo ERP</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={close} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="form-grid">
          {fields.map(field => (
            <label key={field.label} className="form-field">
              <span>
                {field.label}
                {field.required && <b>*</b>}
              </span>
              {field.options ? (
                <select
                  value={values[field.label] ?? ''}
                  onChange={e => setValues({ ...values, [field.label]: e.target.value })}
                  disabled={field.readonly}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {field.options.map((option, idx) => {
                    const isObj = typeof option === 'object';
                    return (
                      <option key={`${isObj ? option.value : option}-${idx}`} value={isObj ? option.value : option}>
                        {isObj ? option.label : option}
                      </option>
                    );
                  })}
                </select>
              ) : field.type === 'file' ? (
                <input type="file" id="doc-file-input" accept={field.accept} aria-label={field.label} />
              ) : (
                <input
                  type={field.type ?? 'text'}
                  value={values[field.label] ?? ''}
                  onChange={e => setValues({ ...values, [field.label]: e.target.value })}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  readOnly={field.readonly}
                />
              )}
              {errors.includes(field.label) && <small className="field-error">{field.label} is required.</small>}
              {field.helpText && <small className="field-help">{field.helpText}</small>}
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="soft-button" onClick={close}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
export function Toast({ message }: { message: string | null }) { return message ? <div className="toast-message"><i className="bi bi-check2-circle"/>{message}</div> : null; }
export function ConnectionError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="panel connection-error"><div className="empty-icon"><i className="bi bi-wifi-off"/></div><h2>Unable to connect to the server</h2><p>{message}</p><button className="primary-button" onClick={onRetry}><i className="bi bi-arrow-clockwise"/> Retry</button></div>; }
export function LoadingState({ label = 'Loading...' }: { label?: string }) { return <div className="panel loading-state"><div className="empty-icon"><i className="bi bi-arrow-repeat"/></div><p>{label}</p></div>; }
export function useShortcuts(openSearch: () => void) { useEffect(() => { const callback = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); } }; window.addEventListener('keydown', callback); return () => window.removeEventListener('keydown', callback); }, [openSearch]); }
