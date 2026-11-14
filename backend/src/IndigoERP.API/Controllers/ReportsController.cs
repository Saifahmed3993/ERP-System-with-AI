using IndigoERP.Domain.Entities.Finance;
using IndigoERP.Domain.Enums;
using IndigoERP.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController(IndigoDbContext db) : ControllerBase
{
    /// <summary>
    /// Trial Balance: Lists all accounts with total debit and credit balances,
    /// ensuring total debits equals total credits according to standard accounting rules.
    /// </summary>
    [HttpGet("trial-balance"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> GetTrialBalance(CancellationToken ct)
    {
        var accounts = await db.Accounts
            .Where(a => !a.IsDeleted)
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        // Fetch journal lines from posted journal entries
        var lineTotals = await db.JournalLines
            .Where(l => !l.IsDeleted && l.JournalEntry.Status == JournalEntryStatus.Posted)
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.Debit),
                TotalCredit = g.Sum(x => x.Credit)
            })
            .ToDictionaryAsync(x => x.AccountId, ct);

        var rows = new List<object>();
        decimal grandTotalDebit = 0;
        decimal grandTotalCredit = 0;

        foreach (var acc in accounts)
        {
            lineTotals.TryGetValue(acc.Id, out var totals);
            decimal debitFromLines = totals?.TotalDebit ?? 0;
            decimal creditFromLines = totals?.TotalCredit ?? 0;

            // If account has balance stored on the entity itself (master seed/opening balance)
            decimal debit = debitFromLines;
            decimal credit = creditFromLines;

            // Normalize based on AccountType if journal lines are zero but account has initial balance
            if (debit == 0 && credit == 0 && acc.Balance != 0)
            {
                if (acc.Type == AccountType.Asset || acc.Type == AccountType.Expense)
                {
                    if (acc.Balance > 0) debit = acc.Balance;
                    else credit = Math.Abs(acc.Balance);
                }
                else
                {
                    if (acc.Balance > 0) credit = acc.Balance;
                    else debit = Math.Abs(acc.Balance);
                }
            }

            // In trial balance: net balance per account
            decimal netDebit = 0;
            decimal netCredit = 0;
            if (acc.Type == AccountType.Asset || acc.Type == AccountType.Expense)
            {
                decimal net = debit - credit;
                if (net >= 0) netDebit = net;
                else netCredit = Math.Abs(net);
            }
            else
            {
                decimal net = credit - debit;
                if (net >= 0) netCredit = net;
                else netDebit = Math.Abs(net);
            }

            grandTotalDebit += netDebit;
            grandTotalCredit += netCredit;

            rows.Add(new
            {
                id = acc.Id,
                code = acc.Code,
                name = acc.Name,
                type = acc.Type.ToString(),
                debit = netDebit,
                credit = netCredit
            });
        }

        return Ok(new
        {
            generatedAt = DateTime.UtcNow,
            isBalanced = Math.Abs(grandTotalDebit - grandTotalCredit) < 0.01m,
            variance = grandTotalDebit - grandTotalCredit,
            totalDebit = grandTotalDebit,
            totalCredit = grandTotalCredit,
            items = rows
        });
    }

    /// <summary>
    /// Income Statement (Profit & Loss): Revenue minus Cost of Goods and Operating Expenses
    /// to calculate Gross Profit and Net Income.
    /// </summary>
    [HttpGet("income-statement"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> GetIncomeStatement(CancellationToken ct)
    {
        var accounts = await db.Accounts
            .Where(a => !a.IsDeleted && (a.Type == AccountType.Revenue || a.Type == AccountType.Expense))
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        var revenues = new List<object>();
        var expenses = new List<object>();
        decimal totalRevenue = 0;
        decimal totalExpense = 0;

        foreach (var acc in accounts)
        {
            decimal amt = Math.Abs(acc.Balance);
            if (acc.Type == AccountType.Revenue)
            {
                totalRevenue += amt;
                revenues.Add(new { code = acc.Code, name = acc.Name, amount = amt });
            }
            else
            {
                totalExpense += amt;
                expenses.Add(new { code = acc.Code, name = acc.Name, amount = amt });
            }
        }

        // Calculate metrics
        decimal netIncome = totalRevenue - totalExpense;
        decimal netMargin = totalRevenue > 0 ? Math.Round((netIncome / totalRevenue) * 100, 2) : 0;

        return Ok(new
        {
            generatedAt = DateTime.UtcNow,
            totalRevenue,
            totalExpense,
            netIncome,
            netMargin,
            revenues,
            expenses
        });
    }

    /// <summary>
    /// Balance Sheet: Current Assets, Liabilities, and Equity.
    /// Assets = Liabilities + Equity
    /// </summary>
    [HttpGet("balance-sheet"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> GetBalanceSheet(CancellationToken ct)
    {
        var accounts = await db.Accounts
            .Where(a => !a.IsDeleted && (a.Type == AccountType.Asset || a.Type == AccountType.Liability || a.Type == AccountType.Equity))
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        var assets = new List<object>();
        var liabilities = new List<object>();
        var equity = new List<object>();

        decimal totalAssets = 0;
        decimal totalLiabilities = 0;
        decimal totalEquity = 0;

        foreach (var acc in accounts)
        {
            decimal amt = Math.Abs(acc.Balance);
            if (acc.Type == AccountType.Asset)
            {
                totalAssets += amt;
                assets.Add(new { code = acc.Code, name = acc.Name, amount = amt });
            }
            else if (acc.Type == AccountType.Liability)
            {
                totalLiabilities += amt;
                liabilities.Add(new { code = acc.Code, name = acc.Name, amount = amt });
            }
            else
            {
                totalEquity += amt;
                equity.Add(new { code = acc.Code, name = acc.Name, amount = amt });
            }
        }

        // Add net income from P&L to equity as retained earnings if not explicitly in equity
        var revSum = await db.Accounts.Where(a => !a.IsDeleted && a.Type == AccountType.Revenue).SumAsync(a => Math.Abs(a.Balance), ct);
        var expSum = await db.Accounts.Where(a => !a.IsDeleted && a.Type == AccountType.Expense).SumAsync(a => Math.Abs(a.Balance), ct);
        decimal currentYearEarnings = revSum - expSum;

        if (currentYearEarnings != 0)
        {
            equity.Add(new { code = "RE-CURR", name = "Current Year Net Earnings", amount = currentYearEarnings });
            totalEquity += currentYearEarnings;
        }

        decimal totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        return Ok(new
        {
            generatedAt = DateTime.UtcNow,
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalLiabilitiesAndEquity,
            isBalanced = Math.Abs(totalAssets - totalLiabilitiesAndEquity) < 1.0m,
            assets,
            liabilities,
            equity
        });
    }

    /// <summary>
    /// Payroll Summary Report
    /// </summary>
    [HttpGet("payroll-summary"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> GetPayrollSummary(CancellationToken ct)
    {
        var periods = await db.PayrollPeriods
            .Where(p => !p.IsDeleted)
            .Include(p => p.Payrolls)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync(ct);

        var periodDtos = periods.Select(p =>
        {
            decimal gross = p.Payrolls.Sum(py => py.GrossSalary);
            decimal net = p.Payrolls.Sum(py => py.NetSalary);
            return new
            {
                p.Id,
                p.Name,
                p.StartDate,
                p.EndDate,
                p.PayDate,
                p.Status,
                TotalGross = gross,
                TotalNet = net,
                TotalDeductions = gross - net,
                EmployeeCount = p.Payrolls.Count
            };
        }).ToList();

        decimal totalGrossPaid = periodDtos.Sum(p => p.TotalGross);
        decimal totalNetPaid = periodDtos.Sum(p => p.TotalNet);
        decimal totalDeductions = totalGrossPaid - totalNetPaid;

        return Ok(new
        {
            totalGrossPaid,
            totalNetPaid,
            totalDeductions,
            periodsCount = periodDtos.Count,
            periods = periodDtos
        });
    }

    /// <summary>
    /// HR Workforce Summary Report
    /// </summary>
    [HttpGet("hr-summary"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> GetHrSummary(CancellationToken ct)
    {
        var employees = await db.Employees
            .Where(e => !e.IsDeleted)
            .Include(e => e.Department)
            .Include(e => e.Position)
            .ToListAsync(ct);

        var byDepartment = employees
            .GroupBy(e => e.Department?.Name ?? "Unassigned")
            .Select(g => new { department = g.Key, count = g.Count(), totalSalary = g.Sum(e => e.MonthlySalary) })
            .OrderByDescending(x => x.count)
            .ToList();

        var byStatus = employees
            .GroupBy(e => e.Status.ToString())
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToList();

        var byType = employees
            .GroupBy(e => e.EmploymentType.ToString())
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToList();

        int totalEmployees = employees.Count;
        int activeEmployees = employees.Count(e => e.Status == EmployeeStatus.Active);
        decimal totalMonthlyPayroll = employees.Where(e => e.Status == EmployeeStatus.Active).Sum(e => e.MonthlySalary);
        decimal avgSalary = activeEmployees > 0 ? Math.Round(totalMonthlyPayroll / activeEmployees, 2) : 0;

        return Ok(new
        {
            totalEmployees,
            activeEmployees,
            totalMonthlyPayroll,
            avgSalary,
            byDepartment,
            byStatus,
            byType
        });
    }
}
