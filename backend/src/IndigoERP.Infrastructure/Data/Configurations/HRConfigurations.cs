using IndigoERP.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndigoERP.Infrastructure.Data.Configurations;

public class EmployeeConfig : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.EmployeeCode).HasMaxLength(20).IsRequired();
        b.HasIndex(e => e.EmployeeCode).IsUnique();
        b.Property(e => e.Email).HasMaxLength(200).IsRequired();
        b.HasIndex(e => e.Email).IsUnique();
        b.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
        b.Property(e => e.LastName).HasMaxLength(100).IsRequired();
        b.Property(e => e.MonthlySalary).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
        b.Ignore(e => e.FullName);
        b.Ignore(e => e.Initials);
        b.HasOne(e => e.Department).WithMany(e => e.Employees).HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.Position).WithMany(e => e.Employees).HasForeignKey(e => e.PositionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.Manager).WithMany().HasForeignKey(e => e.ManagerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DepartmentConfig : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Name).HasMaxLength(200).IsRequired();
        b.HasIndex(e => e.Name).IsUnique();
        b.Property(e => e.AnnualBudget).HasPrecision(18, 2);
        b.HasOne(e => e.Manager).WithMany().HasForeignKey(e => e.ManagerId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class PositionConfig : IEntityTypeConfiguration<Position>
{
    public void Configure(EntityTypeBuilder<Position> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Title).HasMaxLength(200).IsRequired();
        b.Property(e => e.MinSalary).HasPrecision(18, 2);
        b.Property(e => e.MaxSalary).HasPrecision(18, 2);
        b.HasOne(e => e.Department).WithMany(e => e.Positions).HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class AttendanceConfig : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.WorkingHours).HasPrecision(5, 2);
        b.Property(e => e.OvertimeHours).HasPrecision(5, 2);
        b.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
        b.HasOne(e => e.Employee).WithMany(e => e.AttendanceRecords).HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class LeaveRequestConfig : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(EntityTypeBuilder<LeaveRequest> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Duration).HasPrecision(5, 1);
        b.HasOne(e => e.Employee).WithMany(e => e.LeaveRequests).HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.LeaveType).WithMany(e => e.LeaveRequests).HasForeignKey(e => e.LeaveTypeId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class LeaveBalanceConfig : IEntityTypeConfiguration<LeaveBalance>
{
    public void Configure(EntityTypeBuilder<LeaveBalance> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.TotalDays).HasPrecision(5, 1);
        b.Property(e => e.UsedDays).HasPrecision(5, 1);
        b.Ignore(e => e.RemainingDays);
        b.HasIndex(e => new { e.EmployeeId, e.LeaveTypeId, e.Year }).IsUnique();
    }
}

public class PayrollConfig : IEntityTypeConfiguration<Payroll>
{
    public void Configure(EntityTypeBuilder<Payroll> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.BasicSalary).HasPrecision(18, 2);
        b.Property(e => e.Allowances).HasPrecision(18, 2);
        b.Property(e => e.OvertimePay).HasPrecision(18, 2);
        b.Property(e => e.Bonuses).HasPrecision(18, 2);
        b.Property(e => e.GrossSalary).HasPrecision(18, 2);
        b.Property(e => e.Deductions).HasPrecision(18, 2);
        b.Property(e => e.Taxes).HasPrecision(18, 2);
        b.Property(e => e.BenefitsDeduction).HasPrecision(18, 2);
        b.Property(e => e.NetSalary).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
        b.HasOne(e => e.Employee).WithMany(e => e.PayrollRecords).HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.PayrollPeriod).WithMany(e => e.Payrolls).HasForeignKey(e => e.PayrollPeriodId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PayrollItemConfig : IEntityTypeConfiguration<PayrollItem>
{
    public void Configure(EntityTypeBuilder<PayrollItem> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Amount).HasPrecision(18, 2);
        b.HasOne(e => e.Payroll).WithMany(e => e.Items).HasForeignKey(e => e.PayrollId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class JobOpeningConfig : IEntityTypeConfiguration<JobOpening>
{
    public void Configure(EntityTypeBuilder<JobOpening> b)
    {
        b.Property(e => e.SalaryMin).HasPrecision(18, 2);
        b.Property(e => e.SalaryMax).HasPrecision(18, 2);
    }
}

public class BenefitConfig : IEntityTypeConfiguration<Benefit>
{
    public void Configure(EntityTypeBuilder<Benefit> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.EmployerCostMonthly).HasPrecision(18, 2);
        b.Property(e => e.EmployeeCostMonthly).HasPrecision(18, 2);
    }
}

public class PerformanceReviewConfig : IEntityTypeConfiguration<PerformanceReview>
{
    public void Configure(EntityTypeBuilder<PerformanceReview> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Score).HasPrecision(3, 1);
        b.Property(e => e.GoalsCompletePercent).HasPrecision(5, 1);
        b.HasOne(e => e.Employee).WithMany(e => e.PerformanceReviews).HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.Reviewer).WithMany().HasForeignKey(e => e.ReviewerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PerformanceGoalConfig : IEntityTypeConfiguration<PerformanceGoal>
{
    public void Configure(EntityTypeBuilder<PerformanceGoal> b)
    {
        b.Property(e => e.Weight).HasPrecision(18, 2);
        b.Property(e => e.CompletionPercent).HasPrecision(18, 2);
    }
}
