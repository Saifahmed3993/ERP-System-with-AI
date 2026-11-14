using IndigoERP.Application.DTOs;
using IndigoERP.Domain.Interfaces;

namespace IndigoERP.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default);
    Task<UserDto> GetCurrentUserAsync(string userId, CancellationToken ct = default);
}

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<EmployeeDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<EmployeeProfileDto?> GetProfileAsync(Guid id, CancellationToken ct = default);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken ct = default);
    Task<EmployeeDto> UpdateAsync(Guid id, UpdateEmployeeRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IDepartmentService
{
    Task<PagedResult<DepartmentDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<DepartmentDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request, CancellationToken ct = default);
    Task<DepartmentDto> UpdateAsync(Guid id, UpdateDepartmentRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IPositionService
{
    Task<PagedResult<PositionDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PositionDto> CreateAsync(CreatePositionRequest request, CancellationToken ct = default);
    Task<PositionDto> UpdateAsync(Guid id, UpdatePositionRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IAttendanceService
{
    Task<PagedResult<AttendanceDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<AttendanceDto> CheckInAsync(CreateAttendanceRequest request, CancellationToken ct = default);
    Task<AttendanceDto> CheckOutAsync(Guid id, TimeOnly checkOut, CancellationToken ct = default);
}

public interface ILeaveService
{
    Task<PagedResult<LeaveRequestDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<LeaveRequestDto> CreateAsync(CreateLeaveRequest request, CancellationToken ct = default);
    Task<LeaveRequestDto> ApproveAsync(Guid id, string approvedBy, CancellationToken ct = default);
    Task<LeaveRequestDto> RejectAsync(Guid id, string reason, string rejectedBy, CancellationToken ct = default);
    Task<LeaveRequestDto> CancelAsync(Guid id, string cancelledBy, CancellationToken ct = default);
    Task<IEnumerable<LeaveTypeDto>> GetTypesAsync(CancellationToken ct = default);
    Task<IEnumerable<LeaveBalanceDto>> GetBalancesAsync(Guid employeeId, CancellationToken ct = default);
}

public interface IPayrollService
{
    Task<PagedResult<PayrollPeriodDto>> GetPeriodsAsync(PaginationRequest request, CancellationToken ct = default);
    Task<PayrollPeriodDto> CreatePeriodAsync(CreatePayrollPeriodRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<PayrollDto>> GetPayrollsByPeriodAsync(Guid periodId, CancellationToken ct = default);
    Task<PayrollPeriodDto> ProcessPayrollAsync(Guid periodId, CancellationToken ct = default);
    Task<PayrollPeriodDto> PostPayrollAsync(Guid periodId, CancellationToken ct = default);
}

public interface IRecruitmentService
{
    Task<IEnumerable<JobOpeningDto>> GetJobOpeningsAsync(CancellationToken ct = default);
    Task<JobOpeningDto> CreateJobOpeningAsync(CreateJobOpeningRequest request, CancellationToken ct = default);
    Task CloseJobOpeningAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<CandidateDto>> GetCandidatesAsync(Guid jobOpeningId, CancellationToken ct = default);
    Task<CandidateDto> AddCandidateAsync(Guid jobOpeningId, CreateCandidateRequest request, CancellationToken ct = default);
    Task<CandidateDto> UpdateCandidateStageAsync(Guid candidateId, string stage, CancellationToken ct = default);
}

public interface IPerformanceService
{
    Task<IEnumerable<PerformanceReviewDto>> GetReviewsAsync(CancellationToken ct = default);
    Task<PerformanceReviewDto> CreateAsync(CreatePerformanceReviewRequest request, CancellationToken ct = default);
    Task<PerformanceReviewDto> UpdateAsync(Guid id, UpdatePerformanceReviewRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IBenefitsService
{
    Task<IEnumerable<BenefitDto>> GetBenefitsAsync(CancellationToken ct = default);
    Task<BenefitDto> CreateAsync(CreateBenefitRequest request, CancellationToken ct = default);
    Task<BenefitDto> UpdateAsync(Guid id, CreateBenefitRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<EmployeeBenefitDto> EnrollAsync(Guid benefitId, EnrollBenefitRequest request, CancellationToken ct = default);
    Task UnenrollAsync(Guid benefitId, Guid employeeId, CancellationToken ct = default);
}

public interface IDocumentsService
{
    Task<IEnumerable<EmployeeDocumentDto>> GetDocumentsAsync(CancellationToken ct = default);
    Task<EmployeeDocumentDto> UploadAsync(string title, Guid employeeId, string category, DateOnly? expirationDate,
        string fileName, string contentType, long fileSize, Stream content, CancellationToken ct = default);
    Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid id, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

/// <summary>User provisioning — required to operate the role/permission model.</summary>
public interface IUserAdminService
{
    Task<PagedResult<UserSummaryDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<UserSummaryDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserSummaryDto> UpdateAsync(string id, UpdateUserRequest request, CancellationToken ct = default);
    Task SetActiveAsync(string id, bool isActive, CancellationToken ct = default);
    Task<IEnumerable<string>> GetRolesAsync(CancellationToken ct = default);
}

public interface IAccountService
{
    Task<PagedResult<AccountDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<AccountDto> CreateAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IJournalService
{
    Task<PagedResult<JournalEntryDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<JournalEntryDto> CreateAsync(CreateJournalEntryRequest request, CancellationToken ct = default);
    Task<JournalEntryDto> PostAsync(Guid id, string postedBy, CancellationToken ct = default);
    Task<JournalEntryDto> ReverseAsync(Guid id, string reversedBy, CancellationToken ct = default);
}

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<InvoiceDto> CreateAsync(CreateInvoiceRequest request, CancellationToken ct = default);
    Task<InvoiceDto> CancelAsync(Guid id, CancellationToken ct = default);
    Task<InvoiceDto> SendAsync(Guid id, CancellationToken ct = default);
}

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IVendorService
{
    Task<PagedResult<VendorDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<VendorDto> CreateAsync(CreateVendorRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IPaymentService
{
    Task<PagedResult<PaymentDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<PaymentDto> CreateAsync(CreatePaymentRequest request, CancellationToken ct = default);
}

public interface IExpenseService
{
    Task<PagedResult<ExpenseDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<ExpenseDto> CreateAsync(CreateExpenseRequest request, CancellationToken ct = default);
    Task<ExpenseDto> ApproveAsync(Guid id, string approvedBy, CancellationToken ct = default);
    Task<ExpenseDto> RejectAsync(Guid id, CancellationToken ct = default);
}

public interface IBudgetService
{
    Task<PagedResult<BudgetDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);
    Task<BudgetDto> CreateAsync(CreateBudgetRequest request, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<HrDashboardDto> GetHrDashboardAsync(CancellationToken ct = default);
    Task<FinanceDashboardDto> GetFinanceDashboardAsync(CancellationToken ct = default);
}

public interface IAuditService
{
    Task<PagedResult<AuditLogDto>> GetAllAsync(PaginationRequest request, CancellationToken ct = default);

    /// <summary>Writes an audit record immediately (own transaction).</summary>
    Task LogAsync(string? userId, string? userName, string action, string module, string? entityType, string? entityId, string? description, string? oldValues = null, string? newValues = null, CancellationToken ct = default);

    /// <summary>
    /// Stages an audit record on the shared DbContext so it commits atomically with
    /// the business change. Use this from services; the caller's SaveChanges persists it.
    /// </summary>
    void Enqueue(string action, string module, string? entityType, string? entityId, string? description, string? oldValues = null, string? newValues = null);
}
