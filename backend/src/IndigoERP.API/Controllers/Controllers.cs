using System.Security.Claims;
using IndigoERP.Application.Common;
using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IAuthService auth,
    IAuditService audit,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    // These are the deliberately exposed demo identities shown by the login screen.
    // Do not expose the whole user directory before authentication.
    private static readonly string[] DemoAccountEmails =
    [
        "admin@indigo.co",
        "hr@indigo.co",
        "finance@indigo.co",
        "accountant@indigo.co",
        "viewer@indigo.co"
    ];

    [AllowAnonymous, HttpGet("login-accounts"), ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> LoginAccounts(CancellationToken ct)
    {
        var users = await userManager.Users
            .Where(u => u.IsActive && u.Email != null && DemoAccountEmails.Contains(u.Email))
            .OrderBy(u => u.Email)
            .ToListAsync(ct);

        var accounts = new List<object>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            accounts.Add(new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Department,
                Roles = roles
            });
        }

        return Ok(accounts);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await auth.LoginAsync(request, ct);
            await audit.LogAsync(result.User.Id, result.User.FullName, "Login", "Auth", null, null, "User logged in", ct: ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken ct)
    {
        try { return Ok(await auth.RefreshTokenAsync(request, ct)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [Authorize, HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await auth.ChangePasswordAsync(userId, request, ct);
        return Ok(new { message = "Password changed successfully." });
    }

    [Authorize, HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return Ok(await auth.GetCurrentUserAsync(userId, ct));
    }

    /// <summary>
    /// The permissions granted to the caller. The UI uses this to hide controls the
    /// user cannot use; every endpoint still enforces the same rules server-side.
    /// </summary>
    [Authorize, HttpGet("permissions")]
    public IActionResult MyPermissions()
    {
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        var granted = roles
            .SelectMany(r => Permissions.RoleGrants.TryGetValue(r, out var p) ? p : [])
            .Distinct().OrderBy(p => p).ToArray();
        return Ok(new { roles, permissions = granted });
    }
}

[ApiController, Route("api/[controller]"), Authorize]
public class EmployeesController(IEmployeeService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Employees.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpGet("{id:guid}"), Authorize(Policy = "Employees.View")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var r = await svc.GetByIdAsync(id, ct);
        return r == null ? NotFound(new { error = "Employee not found." }) : Ok(r);
    }

    /// <summary>Everything the employee profile page needs, in one round trip.</summary>
    [HttpGet("{id:guid}/profile"), Authorize(Policy = "Employees.View")]
    public async Task<IActionResult> Profile(Guid id, CancellationToken ct)
    {
        var r = await svc.GetProfileAsync(id, ct);
        return r == null ? NotFound(new { error = "Employee not found." }) : Ok(r);
    }

    [HttpPost, Authorize(Policy = "Employees.Create")]
    public async Task<IActionResult> Create(CreateEmployeeRequest req, CancellationToken ct)
    {
        var created = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}"), Authorize(Policy = "Employees.Edit")]
    public async Task<IActionResult> Update(Guid id, UpdateEmployeeRequest req, CancellationToken ct) => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}"), Authorize(Policy = "Employees.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class DepartmentsController(IDepartmentService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Departments.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpGet("{id:guid}"), Authorize(Policy = "Departments.View")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var r = await svc.GetByIdAsync(id, ct);
        return r == null ? NotFound(new { error = "Department not found." }) : Ok(r);
    }

    [HttpPost, Authorize(Policy = "Departments.Create")]
    public async Task<IActionResult> Create(CreateDepartmentRequest req, CancellationToken ct)
    {
        var created = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}"), Authorize(Policy = "Departments.Edit")]
    public async Task<IActionResult> Update(Guid id, UpdateDepartmentRequest req, CancellationToken ct) => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}"), Authorize(Policy = "Departments.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class PositionsController(IPositionService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Positions.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpGet("{id:guid}"), Authorize(Policy = "Positions.View")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var r = await svc.GetByIdAsync(id, ct);
        return r == null ? NotFound(new { error = "Position not found." }) : Ok(r);
    }

    [HttpPost, Authorize(Policy = "Positions.Create")]
    public async Task<IActionResult> Create(CreatePositionRequest req, CancellationToken ct)
    {
        var created = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}"), Authorize(Policy = "Positions.Edit")]
    public async Task<IActionResult> Update(Guid id, UpdatePositionRequest req, CancellationToken ct) => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}"), Authorize(Policy = "Positions.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class AttendanceController(IAttendanceService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Attendance.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpPost("check-in"), Authorize(Policy = "Attendance.Create")]
    public async Task<IActionResult> CheckIn(CreateAttendanceRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CheckInAsync(req, ct));

    [HttpPut("{id:guid}/check-out"), Authorize(Policy = "Attendance.Edit")]
    public async Task<IActionResult> CheckOut(Guid id, [FromBody] TimeOnly checkOut, CancellationToken ct)
        => Ok(await svc.CheckOutAsync(id, checkOut, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class LeaveController(ILeaveService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Leave.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpPost, Authorize(Policy = "Leave.Create")]
    public async Task<IActionResult> Create(CreateLeaveRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreateAsync(req, ct));

    [HttpPost("{id:guid}/approve"), Authorize(Policy = "Leave.Approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
        => Ok(await svc.ApproveAsync(id, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));

    [HttpPost("{id:guid}/reject"), Authorize(Policy = "Leave.Approve")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] string reason, CancellationToken ct)
        => Ok(await svc.RejectAsync(id, reason, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));

    [HttpPost("{id:guid}/cancel"), Authorize(Policy = "Leave.Edit")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
        => Ok(await svc.CancelAsync(id, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));

    [HttpGet("types"), Authorize(Policy = "Leave.View")]
    public async Task<IActionResult> GetTypes(CancellationToken ct) => Ok(await svc.GetTypesAsync(ct));

    [HttpGet("balances/{employeeId:guid}"), Authorize(Policy = "Leave.View")]
    public async Task<IActionResult> GetBalances(Guid employeeId, CancellationToken ct) => Ok(await svc.GetBalancesAsync(employeeId, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class PayrollController(IPayrollService svc) : ControllerBase
{
    [HttpGet("periods"), Authorize(Policy = "Payroll.View")]
    public async Task<IActionResult> GetPeriods([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetPeriodsAsync(req, ct));

    [HttpPost("periods"), Authorize(Policy = "Payroll.Create")]
    public async Task<IActionResult> CreatePeriod(CreatePayrollPeriodRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreatePeriodAsync(req, ct));

    [HttpGet("periods/{periodId:guid}/payrolls"), Authorize(Policy = "Payroll.View")]
    public async Task<IActionResult> GetPayrolls(Guid periodId, CancellationToken ct) => Ok(await svc.GetPayrollsByPeriodAsync(periodId, ct));

    [HttpPost("periods/{periodId:guid}/process"), Authorize(Policy = "Payroll.Approve")]
    public async Task<IActionResult> Process(Guid periodId, CancellationToken ct) => Ok(await svc.ProcessPayrollAsync(periodId, ct));

    [HttpPost("periods/{periodId:guid}/post"), Authorize(Policy = "Payroll.Approve")]
    public async Task<IActionResult> Post(Guid periodId, CancellationToken ct) => Ok(await svc.PostPayrollAsync(periodId, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class RecruitmentController(IRecruitmentService svc) : ControllerBase
{
    [HttpGet("job-openings"), Authorize(Policy = "Recruitment.View")]
    public async Task<IActionResult> GetJobOpenings(CancellationToken ct) => Ok(await svc.GetJobOpeningsAsync(ct));

    [HttpPost("job-openings"), Authorize(Policy = "Recruitment.Create")]
    public async Task<IActionResult> CreateJobOpening(CreateJobOpeningRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreateJobOpeningAsync(req, ct));

    [HttpPost("job-openings/{id:guid}/close"), Authorize(Policy = "Recruitment.Edit")]
    public async Task<IActionResult> CloseJobOpening(Guid id, CancellationToken ct) { await svc.CloseJobOpeningAsync(id, ct); return NoContent(); }

    [HttpGet("job-openings/{id:guid}/candidates"), Authorize(Policy = "Recruitment.View")]
    public async Task<IActionResult> GetCandidates(Guid id, CancellationToken ct) => Ok(await svc.GetCandidatesAsync(id, ct));

    [HttpPost("job-openings/{id:guid}/candidates"), Authorize(Policy = "Recruitment.Create")]
    public async Task<IActionResult> AddCandidate(Guid id, CreateCandidateRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.AddCandidateAsync(id, req, ct));

    [HttpPut("candidates/{candidateId:guid}/stage"), Authorize(Policy = "Recruitment.Edit")]
    public async Task<IActionResult> UpdateStage(Guid candidateId, UpdateCandidateStageRequest req, CancellationToken ct)
        => Ok(await svc.UpdateCandidateStageAsync(candidateId, req.Stage, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class PerformanceController(IPerformanceService svc) : ControllerBase
{
    [HttpGet("reviews"), Authorize(Policy = "Performance.View")]
    public async Task<IActionResult> GetReviews(CancellationToken ct) => Ok(await svc.GetReviewsAsync(ct));

    [HttpPost("reviews"), Authorize(Policy = "Performance.Create")]
    public async Task<IActionResult> Create(CreatePerformanceReviewRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreateAsync(req, ct));

    [HttpPut("reviews/{id:guid}"), Authorize(Policy = "Performance.Edit")]
    public async Task<IActionResult> Update(Guid id, UpdatePerformanceReviewRequest req, CancellationToken ct)
        => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpDelete("reviews/{id:guid}"), Authorize(Policy = "Performance.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class BenefitsController(IBenefitsService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Benefits.View")]
    public async Task<IActionResult> GetBenefits(CancellationToken ct) => Ok(await svc.GetBenefitsAsync(ct));

    [HttpPost, Authorize(Policy = "Benefits.Create")]
    public async Task<IActionResult> Create(CreateBenefitRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreateAsync(req, ct));

    [HttpPut("{id:guid}"), Authorize(Policy = "Benefits.Edit")]
    public async Task<IActionResult> Update(Guid id, CreateBenefitRequest req, CancellationToken ct) => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpDelete("{id:guid}"), Authorize(Policy = "Benefits.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }

    [HttpPost("{id:guid}/enroll"), Authorize(Policy = "Benefits.Edit")]
    public async Task<IActionResult> Enroll(Guid id, EnrollBenefitRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.EnrollAsync(id, req, ct));

    [HttpDelete("{id:guid}/enroll/{employeeId:guid}"), Authorize(Policy = "Benefits.Edit")]
    public async Task<IActionResult> Unenroll(Guid id, Guid employeeId, CancellationToken ct)
    { await svc.UnenrollAsync(id, employeeId, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class DocumentsController(IDocumentsService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Documents.View")]
    public async Task<IActionResult> GetDocuments(CancellationToken ct) => Ok(await svc.GetDocumentsAsync(ct));

    /// <summary>Real multipart upload — the bytes go to storage and the metadata to SQL.</summary>
    [HttpPost, Authorize(Policy = "Documents.Create"), RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] string title,
        [FromForm] Guid employeeId,
        [FromForm] string category,
        [FromForm] DateOnly? expirationDate,
        IFormFile? file,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "A file is required.", errors = new { file = new[] { "A file is required." } } });
        await using var stream = file.OpenReadStream();
        var created = await svc.UploadAsync(title, employeeId, category, expirationDate,
            file.FileName, file.ContentType ?? "application/octet-stream", file.Length, stream, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("{id:guid}/download"), Authorize(Policy = "Documents.View")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var (content, contentType, fileName) = await svc.DownloadAsync(id, ct);
        return File(content, contentType, fileName);
    }

    [HttpDelete("{id:guid}"), Authorize(Policy = "Documents.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/admin/users"), Authorize]
public class UsersController(IUserAdminService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Users.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));

    [HttpGet("roles"), Authorize(Policy = "Users.View")]
    public async Task<IActionResult> GetRoles(CancellationToken ct) => Ok(await svc.GetRolesAsync(ct));

    [HttpPost, Authorize(Policy = "Users.Create")]
    public async Task<IActionResult> Create(CreateUserRequest req, CancellationToken ct)
        => StatusCode(StatusCodes.Status201Created, await svc.CreateAsync(req, ct));

    [HttpPut("{id}"), Authorize(Policy = "Users.Edit")]
    public async Task<IActionResult> Update(string id, UpdateUserRequest req, CancellationToken ct)
        => Ok(await svc.UpdateAsync(id, req, ct));

    [HttpPost("{id}/enable"), Authorize(Policy = "Users.Edit")]
    public async Task<IActionResult> Enable(string id, CancellationToken ct) { await svc.SetActiveAsync(id, true, ct); return NoContent(); }

    [HttpPost("{id}/disable"), Authorize(Policy = "Users.Edit")]
    public async Task<IActionResult> Disable(string id, CancellationToken ct) { await svc.SetActiveAsync(id, false, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class AccountsController(IAccountService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Accounts.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Accounts.Create")]
    public async Task<IActionResult> Create(CreateAccountRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpDelete("{id:guid}"), Authorize(Policy = "Accounts.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/journal-entries"), Authorize]
public class JournalEntriesController(IJournalService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "JournalEntries.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "JournalEntries.Create")]
    public async Task<IActionResult> Create(CreateJournalEntryRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpPost("{id:guid}/post"), Authorize(Policy = "JournalEntries.Approve")]
    public async Task<IActionResult> Post(Guid id, CancellationToken ct) => Ok(await svc.PostAsync(id, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));
    [HttpPost("{id:guid}/reverse"), Authorize(Policy = "JournalEntries.Approve")]
    public async Task<IActionResult> Reverse(Guid id, CancellationToken ct) => Ok(await svc.ReverseAsync(id, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class InvoicesController(IInvoiceService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Invoices.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpGet("{id:guid}"), Authorize(Policy = "Invoices.View")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) { var r = await svc.GetByIdAsync(id, ct); return r == null ? NotFound(new { error = "Invoice not found." }) : Ok(r); }
    [HttpPost, Authorize(Policy = "Invoices.Create")]
    public async Task<IActionResult> Create(CreateInvoiceRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpPost("{id:guid}/cancel"), Authorize(Policy = "Invoices.Edit")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct) => Ok(await svc.CancelAsync(id, ct));
    [HttpPost("{id:guid}/send"), Authorize(Policy = "Invoices.Edit")]
    public async Task<IActionResult> Send(Guid id, CancellationToken ct) => Ok(await svc.SendAsync(id, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class CustomersController(ICustomerService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Customers.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Customers.Create")]
    public async Task<IActionResult> Create(CreateCustomerRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpDelete("{id:guid}"), Authorize(Policy = "Customers.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class VendorsController(IVendorService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Vendors.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Vendors.Create")]
    public async Task<IActionResult> Create(CreateVendorRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpDelete("{id:guid}"), Authorize(Policy = "Vendors.Delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await svc.DeleteAsync(id, ct); return NoContent(); }
}

[ApiController, Route("api/[controller]"), Authorize]
public class PaymentsController(IPaymentService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Payments.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Payments.Create")]
    public async Task<IActionResult> Create(CreatePaymentRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class ExpensesController(IExpenseService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Expenses.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Expenses.Create")]
    public async Task<IActionResult> Create(CreateExpenseRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
    [HttpPost("{id:guid}/approve"), Authorize(Policy = "Expenses.Approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct) => Ok(await svc.ApproveAsync(id, User.FindFirstValue(ClaimTypes.Name) ?? "System", ct));
    [HttpPost("{id:guid}/reject"), Authorize(Policy = "Expenses.Approve")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct) => Ok(await svc.RejectAsync(id, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class BudgetsController(IBudgetService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "Budgets.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
    [HttpPost, Authorize(Policy = "Budgets.Create")]
    public async Task<IActionResult> Create(CreateBudgetRequest req, CancellationToken ct) => Created("", await svc.CreateAsync(req, ct));
}

[ApiController, Route("api/[controller]"), Authorize]
public class DashboardController(IDashboardService svc) : ControllerBase
{
    [HttpGet("hr"), Authorize(Policy = "Employees.View")]
    public async Task<IActionResult> Hr(CancellationToken ct) => Ok(await svc.GetHrDashboardAsync(ct));

    [HttpGet("finance"), Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> Finance(CancellationToken ct) => Ok(await svc.GetFinanceDashboardAsync(ct));
}

[ApiController, Route("api/audit-logs"), Authorize]
public class AuditLogsController(IAuditService svc) : ControllerBase
{
    [HttpGet, Authorize(Policy = "AuditLogs.View")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationRequest req, CancellationToken ct) => Ok(await svc.GetAllAsync(req, ct));
}
