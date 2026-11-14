namespace IndigoERP.Application.DTOs;

// === Common ===
public record PaginationRequest(int Page = 1, int PageSize = 20, string? Search = null, string? SortBy = null, bool SortDesc = false)
{
    public const int MaxPageSize = 200;

    /// <summary>
    /// Clamps client-supplied paging into a safe range. Without this, page=0
    /// produces a negative SQL OFFSET and pageSize&lt;=0 an invalid FETCH,
    /// both of which surface as HTTP 500.
    /// </summary>
    public PaginationRequest Normalized() => this with
    {
        Page = Page < 1 ? 1 : Page,
        PageSize = PageSize < 1 ? 20 : PageSize > MaxPageSize ? MaxPageSize : PageSize,
        Search = string.IsNullOrWhiteSpace(Search) ? null : Search.Trim(),
    };
}

// === Auth ===
public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, DateTime Expiry, UserDto User);
public record RefreshTokenRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UserDto(string Id, string FullName, string Email, string? Department, IEnumerable<string> Roles, bool IsActive);

// === HR DTOs ===
public record EmployeeDto(Guid Id, string EmployeeCode, string FirstName, string LastName, string Email, string? Phone, string Department, string Position, string EmploymentType, DateTime JoinDate, decimal MonthlySalary, string Status, string? Location, string? ManagerName);
public record CreateEmployeeRequest(string FirstName, string LastName, string Email, string? Phone, Guid DepartmentId, Guid PositionId, string EmploymentType, DateTime JoinDate, decimal MonthlySalary, string? Location, Guid? ManagerId);
public record UpdateEmployeeRequest(string FirstName, string LastName, string Email, string? Phone, Guid DepartmentId, Guid PositionId, string EmploymentType, decimal MonthlySalary, string? Location, Guid? ManagerId, string Status);

public record DepartmentDto(Guid Id, string Name, string? Description, string? ManagerName, decimal AnnualBudget, int EmployeeCount, bool IsActive);
public record CreateDepartmentRequest(string Name, string? Description, Guid? ManagerId, decimal AnnualBudget);
public record UpdateDepartmentRequest(string Name, string? Description, Guid? ManagerId, decimal AnnualBudget, bool IsActive = true);

public record PositionDto(Guid Id, string Title, string? Description, string Department, decimal MinSalary, decimal MaxSalary, int EmployeeCount, bool IsActive);
public record CreatePositionRequest(string Title, string? Description, Guid DepartmentId, decimal MinSalary, decimal MaxSalary);
public record UpdatePositionRequest(string Title, string? Description, Guid DepartmentId, decimal MinSalary, decimal MaxSalary, bool IsActive = true);

public record AttendanceDto(Guid Id, string EmployeeName, string EmployeeCode, DateOnly Date, TimeOnly? CheckIn, TimeOnly? CheckOut, decimal WorkingHours, decimal OvertimeHours, string Status);
public record CreateAttendanceRequest(Guid EmployeeId, DateOnly Date, TimeOnly? CheckIn, TimeOnly? CheckOut, string? Notes);

public record LeaveTypeDto(Guid Id, string Name, int DefaultDaysPerYear, bool IsPaid, bool IsActive);
public record LeaveRequestDto(Guid Id, Guid EmployeeId, string EmployeeName, string LeaveType, DateOnly StartDate, DateOnly EndDate, decimal Duration, string Reason, string Status, string? ApprovedBy, string? RejectionReason);
public record CreateLeaveRequest(Guid EmployeeId, Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string Reason);
public record ApproveLeaveRequest(string? Comments);
public record LeaveBalanceDto(Guid Id, Guid EmployeeId, string LeaveType, int Year, decimal TotalDays, decimal UsedDays, decimal RemainingDays);

public record PayrollPeriodDto(Guid Id, string Name, DateOnly StartDate, DateOnly EndDate, DateOnly PayDate, string Status, int EmployeeCount, decimal TotalGross, decimal TotalNet);
public record CreatePayrollPeriodRequest(string Name, DateOnly StartDate, DateOnly EndDate, DateOnly PayDate);
public record PayrollDto(Guid Id, Guid EmployeeId, string EmployeeName, string EmployeeCode, string PeriodName, decimal BasicSalary, decimal Allowances, decimal OvertimePay, decimal Bonuses, decimal GrossSalary, decimal Deductions, decimal Taxes, decimal BenefitsDeduction, decimal NetSalary, string Status);

public record JobOpeningDto(Guid Id, string Title, string Department, string? Position, int CandidateCount, string? HiringManager, bool IsActive);
public record CreateJobOpeningRequest(string Title, Guid DepartmentId, Guid? PositionId, string? Description, string? Requirements, decimal? SalaryMin, decimal? SalaryMax, Guid? HiringManagerId);
public record CandidateDto(Guid Id, string Name, string Email, string? Phone, string JobTitle, string Stage, string Status, DateTime AppliedDate);
public record CreateCandidateRequest(string Name, string Email, string? Phone, string? Notes);
public record UpdateCandidateStageRequest(string Stage);

public record PerformanceReviewDto(Guid Id, Guid EmployeeId, string EmployeeName, string ReviewPeriod, decimal Score, decimal GoalsCompletePercent, string? ReviewerName, string Status, string? Comments);
public record CreatePerformanceReviewRequest(Guid EmployeeId, string ReviewPeriod, decimal Score, decimal GoalsCompletePercent, Guid? ReviewerId, string? Comments);
public record UpdatePerformanceReviewRequest(string ReviewPeriod, decimal Score, decimal GoalsCompletePercent, Guid? ReviewerId, string? Comments, string Status);

public record BenefitDto(Guid Id, string PlanName, string Provider, string? Description, decimal EmployerCostMonthly, decimal EmployeeCostMonthly, int EnrolledCount, string Status);
public record CreateBenefitRequest(string PlanName, string Provider, string? Description, decimal EmployerCostMonthly, decimal EmployeeCostMonthly);
public record EnrollBenefitRequest(Guid EmployeeId, DateOnly EnrollmentDate);
public record EmployeeBenefitDto(Guid Id, Guid BenefitId, string PlanName, string Provider, decimal EmployeeCostMonthly, decimal EmployerCostMonthly, DateOnly EnrollmentDate, bool IsActive);

public record EmployeeDocumentDto(Guid Id, string Title, Guid EmployeeId, string EmployeeName, string Category, string FileName, long FileSize, DateOnly? ExpirationDate, string Status, DateTime CreatedAt);

// === Admin / user provisioning ===
public record CreateUserRequest(string Email, string FullName, string Password, string Role, string? Department);
public record UpdateUserRequest(string? FullName, string? Role, string? Department, string? Password);
public record UserSummaryDto(string Id, string Email, string FullName, string? Department, IEnumerable<string> Roles, bool IsActive, DateTime? LastLoginAt);

// === Employee profile aggregate (drives the profile page tabs) ===
public record EmploymentDetailDto(string EmployeeCode, string Department, string Position, string EmploymentType, DateTime JoinDate, DateTime? TerminationDate, string Status, string? Location, string? ManagerName, string? CostCenter, decimal MonthlySalary);
public record EmployeeProfileDto(
    EmployeeDto Employee,
    EmploymentDetailDto Employment,
    IReadOnlyList<AttendanceDto> Attendance,
    IReadOnlyList<LeaveRequestDto> LeaveRequests,
    IReadOnlyList<LeaveBalanceDto> LeaveBalances,
    IReadOnlyList<PayrollDto> Payrolls,
    IReadOnlyList<EmployeeBenefitDto> Benefits,
    IReadOnlyList<EmployeeDocumentDto> Documents,
    IReadOnlyList<PerformanceReviewDto> Reviews);

// === Finance DTOs ===
public record AccountDto(Guid Id, string Code, string Name, string Type, string? ParentName, decimal Balance, bool IsActive);
public record CreateAccountRequest(string Code, string Name, string Type, Guid? ParentAccountId, string? Description);

public record JournalEntryDto(Guid Id, string EntryNumber, DateOnly EntryDate, string? Reference, string Description, decimal TotalDebit, decimal TotalCredit, string Status);
public record JournalLineDto(Guid? AccountId, string? AccountName, string? Description, decimal Debit, decimal Credit);
public record CreateJournalEntryRequest(DateOnly EntryDate, string? Reference, string Description, List<JournalLineDto> Lines);

public record CustomerDto(Guid Id, string Name, string? Email, string? Phone, string? Address, decimal OutstandingBalance, bool IsActive);
public record CreateCustomerRequest(string Name, string? Email, string? Phone, string? Address, string? ContactPerson);

public record VendorDto(Guid Id, string Name, string? Email, string? Phone, string? Address, decimal OutstandingBalance, bool IsActive);
public record CreateVendorRequest(string Name, string? Email, string? Phone, string? Address, string? ContactPerson);

public record InvoiceDto(Guid Id, string InvoiceNumber, string CustomerName, DateOnly IssueDate, DateOnly DueDate, decimal SubTotal, decimal TaxAmount, decimal TotalAmount, decimal PaidAmount, decimal Balance, string Status);
public record InvoiceItemDto(string Description, int Quantity, decimal UnitPrice, decimal TaxRate, decimal TaxAmount, decimal Total);
public record CreateInvoiceRequest(Guid CustomerId, DateOnly IssueDate, DateOnly DueDate, string? Notes, List<InvoiceItemDto> Items);

public record PaymentDto(Guid Id, string PaymentNumber, string Method, decimal Amount, DateOnly PaymentDate, string? Reference, string? CustomerName, string? VendorName, string? RelatedRecord, string Status);
public record CreatePaymentRequest(string Method, decimal Amount, DateOnly PaymentDate, string? Reference, Guid? CustomerId, Guid? VendorId, Guid? InvoiceId, Guid? BillId, string? Notes);

public record ExpenseDto(Guid Id, string Title, string? EmployeeName, string Category, decimal Amount, DateOnly ExpenseDate, string? Description, bool HasReceipt, string Status);
public record CreateExpenseRequest(string Title, Guid? EmployeeId, string Category, decimal Amount, DateOnly ExpenseDate, string? Description);

public record BudgetDto(Guid Id, string Name, string? Department, int FiscalYear, decimal TotalBudget, decimal ActualSpend, decimal Variance, decimal UtilizationPercent, string Status);
public record CreateBudgetRequest(string Name, Guid? DepartmentId, int FiscalYear, decimal TotalBudget);

public record TaxRateDto(Guid Id, string Name, decimal Rate, string Category, bool IsActive);

public record ChartPoint(string Label, decimal Value);
public record HrDashboardDto(int TotalEmployees, int ActiveEmployees, int OnLeave, int NewHires, int Exits, decimal AttendanceRate, decimal LeaveDays, decimal OvertimeHours, decimal Payroll, decimal PerformanceScore, int OpenPositions, decimal TurnoverRate, List<ChartPoint> HeadcountTrend, List<ChartPoint> HeadcountByDept);
public record FinanceDashboardDto(decimal Revenue, decimal Expenses, decimal NetProfit, decimal CashBalance, decimal TotalReceivables, decimal TotalPayables, decimal RevenueChange, decimal ExpenseChange, decimal TotalTax, int TransactionCount, List<ChartPoint> RevenueTrend, List<ChartPoint> ExpenseTrend, List<ChartPoint> ExpensesByCategory);

// === Audit ===
public record AuditLogDto(Guid Id, string? UserName, string Action, string Module, string? EntityType, string? EntityId, string? Description, DateTime Timestamp);

// === Settings ===
public record SystemSettingDto(Guid Id, string Key, string Value, string Scope, string? Description);
public record CompanyDto(Guid Id, string Name, string? Address, string? Phone, string? Email, string BaseCurrency, string Timezone);
