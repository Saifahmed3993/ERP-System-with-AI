using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Domain.Entities.Finance;
using IndigoERP.Domain.Entities.HR;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.Infrastructure.Data;

/// <summary>
/// Main database context for the Indigo ERP system.
/// Uses ASP.NET Core Identity with custom ApplicationUser and ApplicationRole.
/// </summary>
public class IndigoDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
{
    public IndigoDbContext(DbContextOptions<IndigoDbContext> options) : base(options) { }

    // HR
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PayrollPeriod> PayrollPeriods => Set<PayrollPeriod>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<PayrollItem> PayrollItems => Set<PayrollItem>();
    public DbSet<JobOpening> JobOpenings => Set<JobOpening>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<PerformanceReview> PerformanceReviews => Set<PerformanceReview>();
    public DbSet<PerformanceGoal> PerformanceGoals => Set<PerformanceGoal>();
    public DbSet<Benefit> Benefits => Set<Benefit>();
    public DbSet<EmployeeBenefit> EmployeeBenefits => Set<EmployeeBenefit>();
    public DbSet<EmployeeDocument> EmployeeDocuments => Set<EmployeeDocument>();

    // Finance
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalLine> JournalLines => Set<JournalLine>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<BudgetLine> BudgetLines => Set<BudgetLine>();
    public DbSet<TaxRate> TaxRates => Set<TaxRate>();

    // Admin
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IndigoDbContext).Assembly);

        // Global query filter for soft delete
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (entityType.ClrType.IsSubclassOf(typeof(Domain.Common.BaseEntity)))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var propertyMethodInfo = typeof(Microsoft.EntityFrameworkCore.EF).GetMethod("Property")!.MakeGenericMethod(typeof(bool));
                var isDeletedProperty = System.Linq.Expressions.Expression.Call(propertyMethodInfo, parameter, System.Linq.Expressions.Expression.Constant(nameof(Domain.Common.BaseEntity.IsDeleted)));
                var compareExpression = System.Linq.Expressions.Expression.Equal(isDeletedProperty, System.Linq.Expressions.Expression.Constant(false));
                
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(
                    System.Linq.Expressions.Expression.Lambda(compareExpression, parameter)
                );
            }
        }
    }
}
