import { useEffect, useState } from 'react';
import { PageHeader, StatCard, ChartCard, TrendChart, Donut, Bars, Avatar } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { downloadExcel, openPrintDocument, printableTable } from '../../shared/components/exportUtils';

export function DashboardPage({ notify }: { notify: (m: string) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hr, setHr] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = () => {
      Promise.allSettled([
        api.get('/dashboard/hr'),
        api.get('/dashboard/finance')
      ]).then(([hrRes, finRes]) => {
        if (hrRes.status === 'fulfilled') setHr(hrRes.value);
        else setHr({});
        
        if (finRes.status === 'fulfilled') setFinance(finRes.value);
        else setFinance({});
      }).catch(() => {
        // Catch unexpected errors
      });
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (val: number) => {
    if (!val) return '0 EGP';
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M EGP`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K EGP`;
    return `${val.toLocaleString()} EGP`;
  };

  if (!hr && !finance) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;
  const hasHr = hr && Object.keys(hr).length > 0;
  const hasFinance = finance && Object.keys(finance).length > 0;

  return (
    <>
      <PageHeader
        eyebrow={`${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        title={`Good morning, ${user?.fullName || 'User'}`}
        description="Here’s what’s happening across Nile Horizon Technologies S.A.E today."
        action={
          <div className="header-action">
            <button className="soft-button" onClick={() => {
              const rows: (string | number)[][] = [
                ['Human resources', 'Total Employees', hr.totalEmployees],
                ['Human resources', 'Active Employees', hr.activeEmployees],
                ['Human resources', 'Turnover Rate', hr.turnoverRate],
                ['Human resources', 'Average Attendance', hr.attendanceRate],
                ['Human resources', 'Average Performance', hr.performanceScore],
                ['Finance', 'Revenue (EGP)', finance.revenue],
                ['Finance', 'Expenses (EGP)', finance.expenses],
                ['Finance', 'Net Profit (EGP)', finance.netProfit],
                ['Finance', 'Cash Balance (EGP)', finance.cashBalance],
                ['Finance', 'Receivables (EGP)', finance.totalReceivables],
                ['Finance', 'Payables (EGP)', finance.totalPayables],
              ];
              openPrintDocument('Executive dashboard', 'Human resources and finance snapshot', printableTable(['Area', 'Metric', 'Value'], rows));
            }}><i className="bi bi-printer" /> Print / PDF</button>
            <button className="primary-button" onClick={() => {
              const rows = [
                ['Human resources', 'Total Employees', hr.totalEmployees], ['Human resources', 'Active Employees', hr.activeEmployees],
                ['Human resources', 'Turnover Rate (%)', hr.turnoverRate], ['Human resources', 'Average Attendance (%)', hr.attendanceRate],
                ['Human resources', 'Average Performance (%)', hr.performanceScore], ['Finance', 'Revenue (EGP)', finance.revenue],
                ['Finance', 'Expenses (EGP)', finance.expenses], ['Finance', 'Net Profit (EGP)', finance.netProfit],
                ['Finance', 'Cash Balance (EGP)', finance.cashBalance], ['Finance', 'Receivables (EGP)', finance.totalReceivables],
                ['Finance', 'Payables (EGP)', finance.totalPayables],
              ];
              downloadExcel({ fileName: 'indigo_executive_dashboard', sheetName: 'Dashboard', title: 'Executive dashboard', subtitle: new Date().toLocaleDateString(), headers: ['Area', 'Metric', 'Value'], rows });
            }}><i className="bi bi-file-earmark-spreadsheet" /> Export Excel</button>
          </div>
        }
      />
      {hasHr && (
      <section className="stats-grid">
        <StatCard label="Total Employees" value={hr.totalEmployees?.toString() || '0'} delta={`${hr.newHires || 0} new hires`} icon="people" />
        <StatCard label="Turnover Rate" value={`${hr.turnoverRate || 0}%`} delta={`${hr.exits || 0} exits`} icon="graph-down-arrow" accent="red" />
        <StatCard label="Avg Attendance Rate" value={`${hr.attendanceRate || 0}%`} delta={`+${hr.overtimeHours || 0} overtime`} icon="clock" accent="sky" />
        <StatCard label="Avg Performance" value={`${hr.performanceScore || 0}%`} delta={`${hr.openPositions || 0} open positions`} icon="star" accent="purple" />
      </section>
      )}
      
      {hasFinance && (
      <section className="stats-grid" style={{ marginTop: '20px' }}>
        <StatCard label="Revenue" value={formatCurrency(finance.revenue)} delta={`${finance.revenueChange > 0 ? '+' : ''}${finance.revenueChange || 0}%`} icon="graph-up-arrow" accent="sky" />
        <StatCard label="Expenses" value={formatCurrency(finance.expenses)} delta={`${finance.expenseChange > 0 ? '+' : ''}${finance.expenseChange || 0}%`} icon="arrow-down-right" accent="red" />
        <StatCard label="Net Profit" value={formatCurrency(finance.netProfit)} delta={`${finance.revenueChange > 0 ? '+' : ''}${finance.revenueChange || 0}%`} icon="currency-dollar" accent="green" />
        <StatCard label="Cash Balance" value={formatCurrency(finance.cashBalance)} delta={`${finance.transactionCount || 0} transactions`} icon="wallet2" accent="purple" />
      </section>
      )}

      <section className="dashboard-grid main-charts">
        {hasFinance && (
        <ChartCard title="Revenue & expenses" subtitle="January — August 2026">
          <div className="chart-metric">
            <strong>{formatCurrency(finance.revenue)}</strong>
            <span className={(finance.revenueChange || 0) >= 0 ? "up" : "down"}>
              <i className={`bi bi-arrow-${(finance.revenueChange || 0) >= 0 ? 'up' : 'down'}-right`} /> {Math.abs(finance.revenueChange || 0)}%
            </span>
          </div>
          <TrendChart data={finance.revenueTrend || []} />
        </ChartCard>
        )}
        {hasHr && (
        <ChartCard title="Headcount Trend" subtitle="2026 Employee Growth">
          <div className="chart-metric">
            <strong>{hr.totalEmployees}</strong>
            <span className="up">
              <i className="bi bi-arrow-up-right" /> Active
            </span>
          </div>
          <TrendChart data={hr.headcountTrend || []} kind="employee" />
        </ChartCard>
        )}
        {hasFinance && (
        <ChartCard title="Cash flow" subtitle="Monthly overview">
          <div className="cash-summary">
            <span>
              <i className="dot green" />
              Inflow <b>{formatCurrency(finance.revenue)}</b>
            </span>
            <span>
              <i className="dot indigo" />
              Outflow <b>{formatCurrency(finance.expenses)}</b>
            </span>
          </div>
          <Bars />
        </ChartCard>
        )}
      </section>
      <section className="dashboard-grid lower-charts">
        {hasFinance && (
        <ChartCard title="Expense Distribution" subtitle="Top categories by spending">
          <div className="cash-summary">
            {finance.expensesByCategory?.slice(0,4).map((c: any, i: number) => (
              <span key={c.label}>
                <i className={`dot ${['indigo', 'sky', 'green', 'lilac'][i%4]}`} />
                {c.label} <b>{formatCurrency(c.value)}</b>
              </span>
            ))}
          </div>
          <Donut value={formatCurrency(finance.expenses)} />
        </ChartCard>
        )}
        {hasHr && (
        <ChartCard title="Department Headcount" subtitle={`${hr.activeEmployees || 0} active employees`}>
          <div className="cash-summary">
            {hr.headcountByDept?.slice(0,4).map((c: any, i: number) => (
              <span key={c.label}>
                <i className={`dot ${['indigo', 'sky', 'green', 'lilac'][i%4]}`} />
                {c.label} <b>{c.value}</b>
              </span>
            ))}
          </div>
          <Donut value={hr.activeEmployees?.toString() || '0'} />
        </ChartCard>
        )}
        <Activity />
        <Upcoming navigate={navigate} hr={hr} finance={finance} formatCurrency={formatCurrency} />
      </section>
    </>
  );
}

function Activity() {
  return (
    <section className="panel activity">
      <div className="panel-head">
        <div>
          <h2>Recent activity</h2>
          <p>Latest updates from your workspace</p>
        </div>
        <button className="text-button">View all</button>
      </div>
      {[
        ['MK', 'Maya Khalil', 'submitted a leave request', '12 min ago'],
        ['OF', 'Omar Farouk', 'completed onboarding checklist', '43 min ago'],
        ['IN', 'Invoice INV-1048', 'was created for Nexora Labs', '1 hr ago'],
        ['KA', 'Karim Adel', 'posted journal entry JE-0814', '2 hrs ago'],
      ].map((a, i) => (
        <div className="activity-row" key={i}>
          <Avatar initials={a[0]} name={a[1]} />
          <div>
            <b>{a[1]}</b> <span>{a[2]}</span>
            <small>{a[3]}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
function Upcoming({ navigate, hr, finance, formatCurrency }: { navigate: any, hr: any, finance: any, formatCurrency: (v: number) => string }) {
  return (
    <section className="panel upcoming">
      <div className="panel-head">
        <div>
          <h2>Needs your attention</h2>
          <p>Prioritized across the business</p>
        </div>
        <span className="count">3</span>
      </div>
      <div className="attention">
        <i className="bi bi-calendar-week" />
        <div>
          <b>Leave requests pending</b>
          <small>{hr?.pendingLeaveRequests || 0} requests need approval</small>
        </div>
        <button onClick={() => navigate('/hr/leave')}>
          <i className="bi bi-arrow-right" />
        </button>
      </div>
      <div className="attention">
        <i className="bi bi-exclamation-circle" />
        <div>
          <b>Total Receivables</b>
          <small>{formatCurrency(finance?.totalReceivables || 0)}</small>
        </div>
        <button onClick={() => navigate('/finance/receivables')}>
          <i className="bi bi-arrow-right" />
        </button>
      </div>
      <div className="attention">
        <i className="bi bi-wallet2" />
        <div>
          <b>Total Payables</b>
          <small>{formatCurrency(finance?.totalPayables || 0)}</small>
        </div>
        <button onClick={() => navigate('/finance/payables')}>
          <i className="bi bi-arrow-right" />
        </button>
      </div>
    </section>
  );
}
