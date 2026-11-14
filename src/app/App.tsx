import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { groups } from '../core/constants/navigation';
import { Avatar, Bars, ChartCard, DataTable, Donut, FormDialog, PageHeader, StatCard, StatusBadge, Toast, TrendChart, useShortcuts } from '../shared/components/ui';

import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeProfilePage } from './pages/EmployeeProfilePage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { PositionsPage } from './pages/PositionsPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { PayrollPage } from './pages/PayrollPage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { PerformancePage } from './pages/PerformancePage';
import { BenefitsPage } from './pages/BenefitsPage';
import { DocumentsPage } from './pages/DocumentsPage';

import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';

import { DashboardPage } from './pages/DashboardPage';
import { LedgerPage } from './pages/LedgerPage';
import { AccountsPage } from './pages/AccountsPage';
import { JournalPage } from './pages/JournalPage';
import { CustomersPage } from './pages/CustomersPage';
import { VendorsPage } from './pages/VendorsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TaxPage } from './pages/TaxPage';

import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './pages/LoginPage';

function Shell() {
  const [collapsed, setCollapsed] = useState(false); const [drawer, setDrawer] = useState(false); const [dark, setDark] = useState(() => localStorage.getItem('indigo-theme') === 'dark'); const [searchOpen, setSearchOpen] = useState(false); const [toast, setToast] = useState<string | null>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const openSearch = useCallback(() => setSearchOpen(true), []); useShortcuts(openSearch); useEffect(() => { const theme = dark ? 'dark' : 'light'; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; localStorage.setItem('indigo-theme', theme); }, [dark]);
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}><Sidebar collapsed={collapsed} open={drawer} close={() => setDrawer(false)} /><main className="main-area"><Topbar toggle={() => window.innerWidth < 992 ? setDrawer(true) : setCollapsed(!collapsed)} dark={dark} setDark={setDark} openSearch={openSearch} notify={notify}/>      <div className="page-content">
        <Routes>
          <Route path="/" element={<DashboardPage notify={notify}/>} />
          <Route path="/dashboard" element={<DashboardPage notify={notify}/>} />
          
          <Route path="/hr/employees" element={<EmployeesPage notify={notify}/>} />
          <Route path="/hr/employees/:id" element={<EmployeeProfilePage notify={notify}/>} />
          <Route path="/hr/departments" element={<DepartmentsPage notify={notify}/>} />
          <Route path="/hr/positions" element={<PositionsPage notify={notify}/>} />
          <Route path="/hr/attendance" element={<AttendancePage notify={notify}/>} />
          <Route path="/hr/leave" element={<LeavePage notify={notify}/>} />
          <Route path="/hr/payroll" element={<PayrollPage notify={notify}/>} />
          <Route path="/hr/recruitment" element={<RecruitmentPage notify={notify}/>} />
          <Route path="/hr/performance" element={<PerformancePage notify={notify}/>} />
          <Route path="/hr/benefits" element={<BenefitsPage notify={notify}/>} />
          <Route path="/hr/documents" element={<DocumentsPage notify={notify}/>} />

          <Route path="/finance/invoices" element={<InvoicesPage notify={notify}/>} />
          <Route path="/finance/invoices/:id" element={<InvoiceDetailPage notify={notify}/>} />
          <Route path="/finance/ledger" element={<LedgerPage/>} />
          <Route path="/finance/accounts" element={<AccountsPage notify={notify}/>} />
          <Route path="/finance/journal" element={<JournalPage notify={notify}/>} />
          <Route path="/finance/receivables" element={<CustomersPage notify={notify}/>} />
          <Route path="/finance/customers" element={<CustomersPage notify={notify}/>} />
          <Route path="/finance/payables" element={<VendorsPage notify={notify}/>} />
          <Route path="/finance/vendors" element={<VendorsPage notify={notify}/>} />
          <Route path="/finance/expenses" element={<ExpensesPage notify={notify}/>} />
          <Route path="/finance/payments" element={<PaymentsPage notify={notify}/>} />
          <Route path="/finance/budgets" element={<BudgetsPage notify={notify}/>} />
          
          <Route path="/finance/dashboard" element={<DashboardPage notify={notify}/>} />
          <Route path="/finance/tax" element={<TaxPage notify={notify} />} />
          <Route path="/finance/reports" element={<ReportsPage notify={notify} />} />
          <Route path="/reports" element={<ReportsPage notify={notify} />} />
          <Route path="/admin/users" element={<UsersPage notify={notify} />} />
          <Route path="/admin/roles" element={<RolesPage notify={notify} />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage notify={notify} />} />
          <Route path="/admin/settings" element={<SettingsPage notify={notify} />} />
          
          <Route path="*" element={<div style={{padding: '40px'}}>Module under construction.</div>} />
        </Routes>
      </div></main>{searchOpen && <GlobalSearch close={() => setSearchOpen(false)}/>}<Toast message={toast}/></div>;
}

function PlaceholderPage({ title, description, notify }: { title: string, description: string, notify: (m: string) => void }) {
  return (
    <>
      <PageHeader title={title} description={description} action={<button className="primary-button" onClick={() => notify('Action not available in current environment.')}><i className="bi bi-plus-lg"/> Add new</button>} />
      <DataTable columns={[{key: 'id', label: 'ID'}, {key: 'name', label: 'Name'}, {key: 'status', label: 'Status'}]} rows={[]} emptyMessage={`No ${title.toLowerCase()} found.`} search={true} />
    </>
  );
}

function Sidebar({ collapsed, open, close }: { collapsed: boolean; open: boolean; close: () => void }) { 
  const location = useLocation(); 
  const { user } = useAuth();

  const isHr = user?.roles?.includes('HR Manager') || user?.roles?.includes('HR Specialist');
  const isFinance = user?.roles?.includes('Finance Manager');
  const isAccountant = user?.roles?.includes('Accountant');
  const isAdmin = !user?.roles?.length || user?.roles?.includes('Administrator');

  const visibleGroups = groups.map(group => {
    if (isAdmin) return group;
    if (group.label === 'Workspace') return group;
    if (group.label === 'Human resources') {
      if (isHr) return group;
      if (isFinance) {
        return {
          ...group,
          items: group.items.filter(item => item.path === '/hr/employees' || item.path === '/hr/payroll')
        };
      }
      return null;
    }
    if (group.label === 'Finance') {
      if (isFinance) return group;
      if (isAccountant) {
        return {
          ...group,
          items: group.items.filter(item => item.path !== '/finance/tax')
        };
      }
      return null;
    }
    if (group.label === 'Control center') {
      if (isHr || isFinance) {
        return {
          ...group,
          items: group.items.filter(item => item.path === '/reports' || item.path === '/admin/audit-logs')
        };
      }
      if (isAccountant) {
        return {
          ...group,
          items: group.items.filter(item => item.path === '/reports')
        };
      }
      return null;
    }
    return group;
  }).filter((g): g is NonNullable<typeof g> => g !== null && g.items.length > 0);

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={close}/>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><i className="bi bi-boxes"/></span>
          <div className="brand-name">indigo <b>ERP</b></div>
          <button className="close-drawer icon-button" onClick={close}><i className="bi bi-x-lg"/></button>
        </div>
        <nav>
          {visibleGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map(item => (
                <NavLink to={item.path} key={item.path} onClick={close} className={({ isActive }) => `nav-link ${isActive || (item.path === '/dashboard' && location.pathname === '/') ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                  <i className={`bi bi-${item.icon}`}/>
                  <span>{item.label}</span>
                  {item.label === 'Leave management' && <em>3</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support">
            <span><i className="bi bi-geo-alt"/></span>
            <div><b>Smart Village</b><small>Cairo Hub</small></div>
          </div>
          <div className="workspace">
            <span className="mini-avatar">{getInitials(user?.fullName)}</span>
            <div><b>{user?.fullName || 'Signed-in user'}</b><small>{user?.roles?.[0] || 'Employee'}</small></div>
            <i className="bi bi-check-circle-fill" style={{ color: 'var(--success)', fontSize: '14px' }}/>
          </div>
        </div>
      </aside>
    </>
  ); 
}
function Topbar({ toggle, dark, setDark, openSearch, notify }: { toggle: () => void; dark: boolean; setDark: (v: boolean) => void; openSearch: () => void; notify: (m: string) => void }) { 
  const navigate = useNavigate();
  const { user, logout } = useAuth(); 
  const [quickNewOpen, setQuickNewOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([
    { id: 1, title: 'Payroll Run Pending', desc: 'Monthly payroll register ready for processing', time: '10m ago', icon: 'cash-stack' },
    { id: 2, title: 'Leave Application', desc: '3 pending leave requests waiting for sign-off', time: '1h ago', icon: 'calendar-check' },
    { id: 3, title: 'System Security Audit', desc: 'Audit log trace verified for SOC2 compliance', time: '3h ago', icon: 'shield-check' }
  ]);

  const userName = user?.fullName || 'User'; 
  const roleName = user?.roles?.[0] || 'Employee'; 
  const initials = getInitials(userName);

  return (
    <header className="topbar">
      <button className="menu-toggle icon-button" onClick={toggle} aria-label="Toggle navigation" id="btn-toggle-sidebar">
        <i className="bi bi-list"/>
      </button>
      <button className="global-search" onClick={openSearch} id="btn-open-search">
        <i className="bi bi-search"/>
        <span>Search employees, invoices, reports...</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="top-actions" style={{ position: 'relative' }}>
        <button className="quick-action" onClick={() => setQuickNewOpen(true)} id="btn-quick-new">
          <i className="bi bi-plus-lg"/>
          <span>New</span>
        </button>

        <button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} id="btn-theme-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <i className={`bi bi-${dark ? 'sun' : 'moon-stars'}`}/>
        </button>

        <button className="icon-button notification" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications" id="btn-notifications" title="Notifications">
          <i className="bi bi-bell"/>
          {notifs.length > 0 && <b/>}
        </button>

        <button className="user-menu" onClick={() => { logout(); navigate('/login'); }} title="Logout" id="btn-user-logout">
          <Avatar initials={initials} name={userName}/>
          <div><b>{userName}</b><small>{roleName}</small></div>
          <i className="bi bi-box-arrow-right"/>
        </button>

        {/* Quick New Modal */}
        {quickNewOpen && (
          <div className="search-modal" role="dialog" style={{ zIndex: 1000 }} onClick={() => setQuickNewOpen(false)}>
            <div className="search-dialog" style={{ width: '420px', padding: '16px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Quick Actions</h3>
                <button className="icon-button" onClick={() => setQuickNewOpen(false)}><i className="bi bi-x-lg"/></button>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <button className="soft-button" style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }} onClick={() => { navigate('/finance/invoices'); setQuickNewOpen(false); }}>
                  <i className="bi bi-receipt" style={{ color: 'var(--primary)', marginRight: 8 }} /> New Customer Invoice
                </button>
                <button className="soft-button" style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }} onClick={() => { navigate('/hr/employees'); setQuickNewOpen(false); }}>
                  <i className="bi bi-person-plus" style={{ color: 'var(--success)', marginRight: 8 }} /> Add New Employee
                </button>
                <button className="soft-button" style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }} onClick={() => { navigate('/finance/journal'); setQuickNewOpen(false); }}>
                  <i className="bi bi-journal-plus" style={{ color: 'var(--primary)', marginRight: 8 }} /> Record Journal Entry
                </button>
                <button className="soft-button" style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }} onClick={() => { navigate('/finance/expenses'); setQuickNewOpen(false); }}>
                  <i className="bi bi-wallet2" style={{ color: 'var(--warning)', marginRight: 8 }} /> Record Operational Expense
                </button>
                <button className="soft-button" style={{ justifyContent: 'flex-start', padding: '10px 14px', width: '100%' }} onClick={() => { navigate('/hr/leave'); setQuickNewOpen(false); }}>
                  <i className="bi bi-calendar-plus" style={{ color: 'var(--primary)', marginRight: 8 }} /> Submit Leave Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Modal */}
        {notifOpen && (
          <div className="search-modal" role="dialog" style={{ zIndex: 1000 }} onClick={() => setNotifOpen(false)}>
            <div className="search-dialog" style={{ width: '380px', padding: '16px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Notifications ({notifs.length})</h3>
                <button className="icon-button" onClick={() => setNotifOpen(false)}><i className="bi bi-x-lg"/></button>
              </div>
              <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {notifs.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: '10px', padding: '10px', borderRadius: '8px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <i className={`bi bi-${n.icon}`} style={{ color: 'var(--primary)', fontSize: '18px' }} />
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: '12px', display: 'block' }}>{n.title}</b>
                      <small style={{ color: 'var(--muted)', fontSize: '11px', display: 'block' }}>{n.desc}</small>
                      <small style={{ color: 'var(--primary)', fontSize: '10px' }}>{n.time}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="soft-button" onClick={() => { setNotifs([]); notify('All notifications marked as read.'); setNotifOpen(false); }}>
                  <i className="bi bi-check2-all" /> Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header> 
  );
}

function getInitials(name?: string): string {
  return (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
function GlobalSearch({ close }: { close: () => void }) { 
  const navigate = useNavigate(); 
  const [q, setQ] = useState(''); 
  const results = ['Maya Khalil — Employee', 'INV-2026-1048 — Invoice', 'August payroll run — Payroll', 'General ledger — Report'].filter(v => v.toLowerCase().includes(q.toLowerCase())); 
  return (
    <div className="search-modal" role="dialog" aria-modal="true" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <div className="search-dialog">
        <div className="search-dialog-input">
          <i className="bi bi-search"/>
          <input 
            autoFocus 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            onKeyDown={e => { if (e.key === 'Escape') close(); }}
            placeholder="Search across Indigo ERP..."
          />
          <kbd onClick={close} style={{ cursor: 'pointer' }}>ESC</kbd>
        </div>
        <div className="search-body">
          <span className="search-caption">{q ? 'Results' : 'Recent searches'}</span>
          {results.map((r, i) => (
            <button key={r} onClick={() => { navigate(i === 1 ? '/finance/invoices' : i === 0 ? '/hr/employees' : '/reports'); close(); }}>
              <i className={`bi bi-${i === 0 ? 'person' : i === 1 ? 'receipt' : 'file-earmark-bar-graph'}`}/>
              <span>{r}</span>
              <small>↵</small>
            </button>
          ))}
          {!results.length && <div className="empty-search"><i className="bi bi-search"/><p>No results found</p></div>}
        </div>
        <div className="search-footer">
          <span><kbd>↑↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
      <button className="modal-close" onClick={close} aria-label="Close search"/>
    </div>
  ); 
}

function AuthApp() {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading application...</div>;
  if (!user) return <LoginPage />;
  return <Shell />;
}

export function App() { return <AuthProvider><BrowserRouter><AuthApp/></BrowserRouter></AuthProvider>; }
