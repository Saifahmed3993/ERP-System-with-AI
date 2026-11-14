import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authService } from '../../infrastructure/services/authService';
import type { LoginAccountDto } from '../../infrastructure/api/types';

const ROLE_STYLES: Record<string, { icon: string; bg: string; desc: string }> = {
  Administrator: { icon: 'shield-lock-fill', bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', desc: 'Full system access · Users, Roles & Settings' },
  'HR Manager': { icon: 'people-fill', bg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', desc: 'Employees, Payroll, Leave & Benefits' },
  'Finance Manager': { icon: 'graph-up-arrow', bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', desc: 'Invoices, Payments, Budgets & Tax' },
  Accountant: { icon: 'journal-bookmark-fill', bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', desc: 'Journal Entries, Ledger & Reports' },
  Viewer: { icon: 'eye-fill', bg: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', desc: 'Read-only access · View all modules without editing' },
};

const DEFAULT_ROLE_STYLE = { icon: 'person-fill', bg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', desc: 'Access based on assigned role' };

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

export function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<LoginAccountDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void authService.getLoginAccounts()
      .then(data => {
        if (active) setAccounts(data);
      })
      .catch(() => {
        if (active) setAccountsError('Account directory is unavailable. You can still sign in with your email and password.');
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });

    return () => { active = false; };
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === selectedId) ?? null,
    [accounts, selectedId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error is handled in context
    }
  };

  const selectAccount = (acc: LoginAccountDto) => {
    setSelectedId(acc.id);
    setEmail(acc.email);
    setPassword('');
  };



  return (
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf4 50%, #f5f3ff 100%)',
      padding: '20px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '960px',
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '580px',
      }}>
        {/* Left Panel — Account Selector */}
        <div style={{
          background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          padding: '40px 32px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <i className="bi bi-boxes" style={{ fontSize: '28px', opacity: 0.9 }} />
              <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>Indigo ERP</span>
            </div>
            <p style={{ fontSize: '13px', opacity: 0.6, margin: '0 0 32px 0', lineHeight: 1.6 }}>
              Nile Horizon Technologies S.A.E<br />
              Enterprise Resource Planning System
            </p>

            <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.5, margin: '0 0 16px 0' }}>
              Select Account to Sign In
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {accountsLoading && <div style={{ fontSize: '13px', opacity: 0.7, padding: '16px 0', textAlign: 'center' }}>Loading accounts…</div>}
              {accounts.map(acc => {
                const roleName = acc.roles[0] || 'Employee';
                const appearance = ROLE_STYLES[roleName] || DEFAULT_ROLE_STYLE;
                const selected = selectedId === acc.id;
                return (
                <button
                  key={acc.id}
                  type="button"
                  id={`btn-select-${roleName.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => selectAccount(acc)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    background: selected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${selected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    color: '#fff',
                    width: '100%',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: appearance.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}>
                    {getInitials(acc.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{acc.fullName}</div>
                    <div style={{ fontSize: '11px', opacity: 0.55 }}>{roleName} · {appearance.desc}</div>
                  </div>
                  {selected && (
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '18px', color: '#a5b4fc', flexShrink: 0 }} />
                  )}
                </button>
                );
              })}
            </div>

            <p style={{ fontSize: '11px', opacity: 0.35, margin: '20px 0 0 0', textAlign: 'center' }}>
              Choose an account to prefill its email, then enter its password
            </p>
            {accountsError && <p style={{ fontSize: '11px', color: '#fecaca', margin: '10px 0 0', textAlign: 'center' }}>{accountsError}</p>}
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div style={{
          padding: '48px 40px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(79,70,229,0.25)',
            }}>
              <i className="bi bi-boxes" style={{ fontSize: '24px', color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: '#1e1b4b', letterSpacing: '-0.5px' }}>
              Welcome Back
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Sign in to your enterprise portal
            </p>
          </div>

          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              color: '#991b1b', padding: '12px 16px', borderRadius: '12px',
              marginBottom: '20px', fontSize: '13px',
              border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} />
              {error}
            </div>
          )}

          {selectedAccount && (
            <div style={{
              background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
              border: '1px solid #ddd6fe',
              borderRadius: '14px', padding: '16px',
              marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: ROLE_STYLES[selectedAccount.roles[0]]?.bg || DEFAULT_ROLE_STYLE.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0,
              }}>
                {getInitials(selectedAccount.fullName)}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e1b4b' }}>{selectedAccount.fullName}</div>
                <div style={{ fontSize: '12px', color: '#6d28d9' }}>{selectedAccount.roles[0] || 'Employee'} · {selectedAccount.email}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                id="input-login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                placeholder="Enter your email"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                  border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '14px',
                  background: '#fafbfc', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s',
                  color: '#111827',
                }}
                onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <input
                id="input-login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                  border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '14px',
                  background: '#fafbfc', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s',
                  color: '#111827',
                }}
                onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 6px 20px rgba(79,70,229,0.3)',
                transition: 'all 0.2s ease', marginTop: '4px',
                opacity: !email ? 0.5 : 1,
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="bi bi-box-arrow-in-right" />
                  Sign in
                </span>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '12px', color: '#9ca3af' }}>
            <span>Powered by </span>
            <b style={{ color: '#6b7280' }}>Nile Horizon Tech S.A.E</b>
            <span> · Smart Village, Giza</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .login-container > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
