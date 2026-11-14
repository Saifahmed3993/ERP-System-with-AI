using IndigoERP.Domain.Common;
using IndigoERP.Domain.Enums;

namespace IndigoERP.Domain.Entities.HR;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ManagerId { get; set; }
    public decimal AnnualBudget { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Employee? Manager { get; set; }
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Position> Positions { get; set; } = new List<Position>();
}

public class Position : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid DepartmentId { get; set; }
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Department Department { get; set; } = null!;
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

public class Employee : BaseEntity
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid PositionId { get; set; }
    public EmploymentType EmploymentType { get; set; } = EmploymentType.FullTime;
    public DateTime JoinDate { get; set; }
    public DateTime? TerminationDate { get; set; }
    public decimal MonthlySalary { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public string? Location { get; set; }
    public Guid? ManagerId { get; set; }
    public string? CostCenter { get; set; }
    public string? UserId { get; set; }

    // Navigation properties
    public Department Department { get; set; } = null!;
    public Position Position { get; set; } = null!;
    public Employee? Manager { get; set; }
    public ICollection<Attendance> AttendanceRecords { get; set; } = new List<Attendance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveBalance> LeaveBalances { get; set; } = new List<LeaveBalance>();
    public ICollection<Payroll> PayrollRecords { get; set; } = new List<Payroll>();
    public ICollection<PerformanceReview> PerformanceReviews { get; set; } = new List<PerformanceReview>();
    public ICollection<EmployeeBenefit> EmployeeBenefits { get; set; } = new List<EmployeeBenefit>();
    public ICollection<EmployeeDocument> Documents { get; set; } = new List<EmployeeDocument>();

    public string FullName => $"{FirstName} {LastName}";
    public string Initials => $"{FirstName[..1]}{LastName[..1]}".ToUpper();
}

public class Attendance : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? CheckIn { get; set; }
    public TimeOnly? CheckOut { get; set; }
    public decimal WorkingHours { get; set; }
    public decimal OvertimeHours { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Notes { get; set; }

    // Navigation properties
    public Employee Employee { get; set; } = null!;
}

public class LeaveType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DefaultDaysPerYear { get; set; }
    public bool IsPaid { get; set; } = true;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveBalance> LeaveBalances { get; set; } = new List<LeaveBalance>();
}

public class LeaveBalance : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid LeaveTypeId { get; set; }
    public int Year { get; set; }
    public decimal TotalDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal RemainingDays => TotalDays - UsedDays;

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; } = null!;
}

public class LeaveRequest : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid LeaveTypeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Duration { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; } = null!;
}

public class PayrollPeriod : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateOnly PayDate { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

    // Navigation properties
    public ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
}

public class Payroll : BaseEntity
{
    public Guid PayrollPeriodId { get; set; }
    public Guid EmployeeId { get; set; }
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; }
    public decimal OvertimePay { get; set; }
    public decimal Bonuses { get; set; }
    public decimal GrossSalary { get; set; }
    public decimal Deductions { get; set; }
    public decimal Taxes { get; set; }
    public decimal BenefitsDeduction { get; set; }
    public decimal NetSalary { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

    // Navigation properties
    public PayrollPeriod PayrollPeriod { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
    public ICollection<PayrollItem> Items { get; set; } = new List<PayrollItem>();
}

public class PayrollItem : BaseEntity
{
    public Guid PayrollId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Earning, Deduction, Tax
    public decimal Amount { get; set; }

    // Navigation properties
    public Payroll Payroll { get; set; } = null!;
}

public class JobOpening : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public Guid? PositionId { get; set; }
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public Guid? HiringManagerId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Department Department { get; set; } = null!;
    public Position? Position { get; set; }
    public Employee? HiringManager { get; set; }
    public ICollection<Candidate> Candidates { get; set; } = new List<Candidate>();
}

public class Candidate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public Guid JobOpeningId { get; set; }
    public RecruitmentStage Stage { get; set; } = RecruitmentStage.Applied;
    public CandidateStatus Status { get; set; } = CandidateStatus.Pending;
    public DateTime AppliedDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public string? ResumeFileName { get; set; }

    // Navigation properties
    public JobOpening JobOpening { get; set; } = null!;
}

public class PerformanceReview : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public string ReviewPeriod { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public decimal GoalsCompletePercent { get; set; }
    public Guid? ReviewerId { get; set; }
    public PerformanceReviewStatus Status { get; set; } = PerformanceReviewStatus.Draft;
    public string? Comments { get; set; }

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public Employee? Reviewer { get; set; }
    public ICollection<PerformanceGoal> Goals { get; set; } = new List<PerformanceGoal>();
}

public class PerformanceGoal : BaseEntity
{
    public Guid PerformanceReviewId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Weight { get; set; }
    public decimal CompletionPercent { get; set; }

    // Navigation properties
    public PerformanceReview PerformanceReview { get; set; } = null!;
}

public class Benefit : BaseEntity
{
    public string PlanName { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal EmployerCostMonthly { get; set; }
    public decimal EmployeeCostMonthly { get; set; }
    public BenefitStatus Status { get; set; } = BenefitStatus.Active;

    // Navigation properties
    public ICollection<EmployeeBenefit> EmployeeBenefits { get; set; } = new List<EmployeeBenefit>();
}

public class EmployeeBenefit : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid BenefitId { get; set; }
    public DateOnly EnrollmentDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public Benefit Benefit { get; set; } = null!;
}

public class EmployeeDocument : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public Guid EmployeeId { get; set; }
    public DocumentCategory Category { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateOnly? ExpirationDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Active;

    // Navigation properties
    public Employee Employee { get; set; } = null!;
}
