using IndigoERP.Application.Common;
using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.HR;
using IndigoERP.Domain.Enums;
using IndigoERP.Domain.Interfaces;
using IndigoERP.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.Infrastructure.Services;

public class PositionService : IPositionService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public PositionService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    public async Task<PagedResult<PositionDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Positions.Include(p => p.Department).Include(p => p.Employees).AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(s) || p.Department.Name.ToLower().Contains(s));
        }
        query = req.SortBy?.ToLower() switch
        {
            "department" => req.SortDesc ? query.OrderByDescending(p => p.Department.Name) : query.OrderBy(p => p.Department.Name),
            "minsalary" => req.SortDesc ? query.OrderByDescending(p => p.MinSalary) : query.OrderBy(p => p.MinSalary),
            _ => req.SortDesc ? query.OrderByDescending(p => p.Title) : query.OrderBy(p => p.Title),
        };
        var total = await query.CountAsync(ct);
        var items = await query.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(p => new PositionDto(p.Id, p.Title, p.Description, p.Department.Name, p.MinSalary, p.MaxSalary,
                p.Employees.Count(e => !e.IsDeleted), p.IsActive)).ToListAsync(ct);
        return new PagedResult<PositionDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.Positions.Include(x => x.Department).Include(x => x.Employees).FirstOrDefaultAsync(x => x.Id == id, ct);
        return p == null ? null : new PositionDto(p.Id, p.Title, p.Description, p.Department.Name, p.MinSalary, p.MaxSalary,
            p.Employees.Count(e => !e.IsDeleted), p.IsActive);
    }

    private async Task ValidateAsync(Validator v, string title, Guid departmentId, decimal min, decimal max, Guid? excludeId, CancellationToken ct)
    {
        v.Name("title", title, 200);
        v.Money("minSalary", min, 0, Validator.MaxMonthlySalary);
        v.Money("maxSalary", max, 0, Validator.MaxMonthlySalary);
        if (max < min) v.Add("maxSalary", "Maximum salary must be greater than or equal to minimum salary.");
        if (departmentId == Guid.Empty) v.Add("departmentId", "Department is required.");
        else if (!await _db.Departments.AnyAsync(d => d.Id == departmentId, ct))
            v.Add("departmentId", "The selected department does not exist.");
        var normalized = title?.Trim().ToLower();
        if (!string.IsNullOrEmpty(normalized) && departmentId != Guid.Empty &&
            await _db.Positions.AnyAsync(p => p.Title.ToLower() == normalized && p.DepartmentId == departmentId
                && (excludeId == null || p.Id != excludeId), ct))
            v.Add("title", "This department already has a position with that title.");
    }

    public async Task<PositionDto> CreateAsync(CreatePositionRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        await ValidateAsync(v, req.Title, req.DepartmentId, req.MinSalary, req.MaxSalary, null, ct);
        v.ThrowIfInvalid();

        var pos = new Position
        {
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            DepartmentId = req.DepartmentId, MinSalary = req.MinSalary, MaxSalary = req.MaxSalary,
        };
        await _db.Positions.AddAsync(pos, ct);
        _audit.Enqueue("Create", "Positions", nameof(Position), pos.Id.ToString(), $"Created position {pos.Title}");
        await _uow.SaveChangesAsync(ct);
        return (await GetByIdAsync(pos.Id, ct))!;
    }

    public async Task<PositionDto> UpdateAsync(Guid id, UpdatePositionRequest req, CancellationToken ct = default)
    {
        var pos = await _db.Positions.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Position not found.");
        var v = new Validator();
        await ValidateAsync(v, req.Title, req.DepartmentId, req.MinSalary, req.MaxSalary, id, ct);
        v.ThrowIfInvalid();

        if (!req.IsActive && await _db.Employees.AnyAsync(e => e.PositionId == id, ct))
            throw new ConflictException("Cannot deactivate a position that still has employees assigned.");
        // Moving a position between departments would strand its employees in a
        // department that no longer matches their position.
        if (req.DepartmentId != pos.DepartmentId && await _db.Employees.AnyAsync(e => e.PositionId == id, ct))
            throw new ConflictException("Cannot move this position to another department while employees are assigned to it.");

        var before = $"{pos.Title} | {pos.MinSalary}-{pos.MaxSalary} | active={pos.IsActive}";
        pos.Title = req.Title.Trim();
        pos.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        pos.DepartmentId = req.DepartmentId;
        pos.MinSalary = req.MinSalary;
        pos.MaxSalary = req.MaxSalary;
        pos.IsActive = req.IsActive;
        _audit.Enqueue("Update", "Positions", nameof(Position), id.ToString(), $"Updated position {pos.Title}",
            before, $"{pos.Title} | {pos.MinSalary}-{pos.MaxSalary} | active={pos.IsActive}");
        await _uow.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var pos = await _db.Positions.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Position not found.");
        var count = await _db.Employees.CountAsync(e => e.PositionId == id, ct);
        if (count > 0)
            throw new ConflictException($"Cannot delete this position — {count} employee(s) currently hold it.");
        if (await _db.JobOpenings.AnyAsync(j => j.PositionId == id, ct))
            throw new ConflictException("Cannot delete this position — job openings still reference it.");

        pos.IsDeleted = true;
        pos.IsActive = false;
        _audit.Enqueue("Delete", "Positions", nameof(Position), id.ToString(), $"Deleted position {pos.Title}");
        await _uow.SaveChangesAsync(ct);
    }
}

public class AttendanceService : IAttendanceService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public AttendanceService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    /// <summary>Standard shift start; a later check-in is flagged Late.</summary>
    private static readonly TimeOnly ShiftStart = new(9, 0);
    /// <summary>Contracted hours per day; anything beyond counts as overtime.</summary>
    private const decimal StandardDayHours = 8m;

    public async Task<PagedResult<AttendanceDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Attendances.Include(a => a.Employee).AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(a => a.Employee.FirstName.ToLower().Contains(s)
                || a.Employee.LastName.ToLower().Contains(s)
                || a.Employee.EmployeeCode.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.Date).ThenBy(a => a.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(a => new AttendanceDto(a.Id, a.Employee.FirstName + " " + a.Employee.LastName,
                a.Employee.EmployeeCode, a.Date, a.CheckIn, a.CheckOut, a.WorkingHours, a.OvertimeHours, a.Status.ToString()))
            .ToListAsync(ct);
        return new PagedResult<AttendanceDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<AttendanceDto> CheckInAsync(CreateAttendanceRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == req.EmployeeId, ct);
        if (emp == null) v.Add("employeeId", "The selected employee does not exist.");
        else if (emp.Status == EmployeeStatus.Terminated)
            v.Add("employeeId", "Cannot record attendance for a terminated employee.");

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (req.Date > today) v.Add("date", "Attendance cannot be recorded for a future date.");
        if (req.Date < today.AddYears(-5)) v.Add("date", "Attendance date is unreasonably far in the past.");
        if (emp != null && req.Date < DateOnly.FromDateTime(emp.JoinDate))
            v.Add("date", "Attendance cannot be recorded before the employee's join date.");

        var checkIn = req.CheckIn ?? TimeOnly.FromDateTime(DateTime.Now);
        if (req.CheckOut.HasValue && req.CheckOut.Value < checkIn)
            v.Add("checkOut", "Check-out time cannot be earlier than check-in time.");
        v.ThrowIfInvalid();

        if (await _db.Attendances.AnyAsync(a => a.EmployeeId == req.EmployeeId && a.Date == req.Date, ct))
            throw new ConflictException("Attendance has already been recorded for this employee on this date.");

        var att = new Attendance
        {
            EmployeeId = req.EmployeeId, Date = req.Date, CheckIn = checkIn,
            Status = checkIn > ShiftStart ? AttendanceStatus.Late : AttendanceStatus.Present,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
        };
        // A check-in request may also carry the check-out (importing a full day).
        if (req.CheckOut.HasValue) ApplyCheckOut(att, req.CheckOut.Value);

        await _db.Attendances.AddAsync(att, ct);
        _audit.Enqueue("Create", "Attendance", nameof(Attendance), att.Id.ToString(),
            $"Check-in {emp!.EmployeeCode} on {att.Date:yyyy-MM-dd} at {checkIn}");
        try { await _uow.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (EmployeeService.IsUniqueViolation(ex))
        {
            throw new ConflictException("Attendance has already been recorded for this employee on this date.");
        }
        return new AttendanceDto(att.Id, $"{emp.FirstName} {emp.LastName}", emp.EmployeeCode, att.Date,
            att.CheckIn, att.CheckOut, att.WorkingHours, att.OvertimeHours, att.Status.ToString());
    }

    /// <summary>
    /// Computes working/overtime hours. Callers must have already rejected a
    /// check-out earlier than the check-in, so hours can never go negative.
    /// </summary>
    private static void ApplyCheckOut(Attendance att, TimeOnly checkOut)
    {
        att.CheckOut = checkOut;
        if (!att.CheckIn.HasValue) return;
        var span = checkOut.ToTimeSpan() - att.CheckIn.Value.ToTimeSpan();
        att.WorkingHours = Math.Max(0m, Math.Round((decimal)span.TotalHours, 2));
        att.OvertimeHours = att.WorkingHours > StandardDayHours
            ? Math.Round(att.WorkingHours - StandardDayHours, 2) : 0m;
    }

    public async Task<AttendanceDto> CheckOutAsync(Guid id, TimeOnly checkOut, CancellationToken ct = default)
    {
        var att = await _db.Attendances.Include(a => a.Employee).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Attendance record not found.");

        if (att.CheckOut.HasValue)
            throw new ConflictException($"This attendance record was already checked out at {att.CheckOut}.");
        if (!att.CheckIn.HasValue)
            throw new ConflictException("Cannot check out an attendance record that has no check-in.");
        if (checkOut < att.CheckIn.Value)
            throw new ValidationException($"Check-out time ({checkOut}) cannot be earlier than check-in time ({att.CheckIn}).");

        ApplyCheckOut(att, checkOut);
        _audit.Enqueue("Update", "Attendance", nameof(Attendance), att.Id.ToString(),
            $"Check-out {att.Employee.EmployeeCode} on {att.Date:yyyy-MM-dd} at {checkOut} ({att.WorkingHours}h)");
        await _uow.SaveChangesAsync(ct);
        return new AttendanceDto(att.Id, $"{att.Employee.FirstName} {att.Employee.LastName}", att.Employee.EmployeeCode,
            att.Date, att.CheckIn, att.CheckOut, att.WorkingHours, att.OvertimeHours, att.Status.ToString());
    }
}

public class LeaveService : ILeaveService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public LeaveService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    private static LeaveRequestDto Map(LeaveRequest l, Employee e, LeaveType t) => new(
        l.Id, l.EmployeeId, $"{e.FirstName} {e.LastName}", t.Name, l.StartDate, l.EndDate,
        l.Duration, l.Reason, l.Status.ToString(), l.ApprovedBy, l.RejectionReason);

    public async Task<PagedResult<LeaveRequestDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.LeaveRequests.Include(l => l.Employee).Include(l => l.LeaveType).AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(l => l.Employee.FirstName.ToLower().Contains(s)
                || l.Employee.LastName.ToLower().Contains(s)
                || l.LeaveType.Name.ToLower().Contains(s)
                || l.Reason.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(l => l.CreatedAt).ThenBy(l => l.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(l => new LeaveRequestDto(l.Id, l.EmployeeId, l.Employee.FirstName + " " + l.Employee.LastName,
                l.LeaveType.Name, l.StartDate, l.EndDate, l.Duration, l.Reason, l.Status.ToString(),
                l.ApprovedBy, l.RejectionReason)).ToListAsync(ct);
        return new PagedResult<LeaveRequestDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    /// <summary>Inclusive calendar-day duration: a Mon–Fri request is 5 days.</summary>
    private static decimal DurationOf(DateOnly start, DateOnly end) => end.DayNumber - start.DayNumber + 1;

    /// <summary>
    /// Returns the employee's balance row for the type/year, creating it from the
    /// leave type's annual entitlement if it does not exist yet. Guaranteeing a row
    /// means the balance rule is always enforced instead of skipped.
    /// </summary>
    private async Task<LeaveBalance> EnsureBalanceAsync(Guid employeeId, LeaveType type, int year, CancellationToken ct)
    {
        var balance = await _db.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.LeaveTypeId == type.Id && b.Year == year, ct);
        if (balance != null) return balance;
        balance = new LeaveBalance
        {
            EmployeeId = employeeId, LeaveTypeId = type.Id, Year = year,
            TotalDays = type.DefaultDaysPerYear, UsedDays = 0,
        };
        _db.LeaveBalances.Add(balance);
        return balance;
    }

    public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("reason", req.Reason, 500);
        v.DateOrder("startDate", req.StartDate, "endDate", req.EndDate);
        v.WorkDate("startDate", req.StartDate, maxYearsAhead: 2);
        v.WorkDate("endDate", req.EndDate, maxYearsAhead: 2);

        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == req.EmployeeId, ct);
        if (emp == null) v.Add("employeeId", "The selected employee does not exist.");
        else if (emp.Status == EmployeeStatus.Terminated)
            v.Add("employeeId", "Cannot create leave for a terminated employee.");

        var type = await _db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == req.LeaveTypeId, ct);
        if (type == null) v.Add("leaveTypeId", "The selected leave type does not exist.");
        else if (!type.IsActive) v.Add("leaveTypeId", "The selected leave type is no longer active.");
        v.ThrowIfInvalid();

        var duration = DurationOf(req.StartDate, req.EndDate);
        if (duration > 365) throw new ValidationException("A single leave request cannot exceed 365 days.");

        if (await _db.LeaveRequests.AnyAsync(l => l.EmployeeId == req.EmployeeId
                && l.Status != LeaveRequestStatus.Rejected && l.Status != LeaveRequestStatus.Cancelled
                && l.StartDate <= req.EndDate && l.EndDate >= req.StartDate, ct))
            throw new ConflictException("This employee already has a pending or approved leave request that overlaps these dates.");

        var year = req.StartDate.Year;
        var balance = await EnsureBalanceAsync(req.EmployeeId, type!, year, ct);
        // Count days already committed to other open requests in the same year so
        // several pending requests cannot collectively exceed the entitlement.
        var pendingDays = await _db.LeaveRequests
            .Where(l => l.EmployeeId == req.EmployeeId && l.LeaveTypeId == type!.Id
                && l.Status == LeaveRequestStatus.Pending && l.StartDate.Year == year)
            .SumAsync(l => l.Duration, ct);
        var available = balance.TotalDays - balance.UsedDays - pendingDays;
        if (duration > available)
            throw new ConflictException($"Insufficient {type!.Name} balance: {available} day(s) available for {year}, {duration} requested.");

        var lr = new LeaveRequest
        {
            EmployeeId = req.EmployeeId, LeaveTypeId = req.LeaveTypeId,
            StartDate = req.StartDate, EndDate = req.EndDate, Duration = duration,
            Reason = req.Reason.Trim(), Status = LeaveRequestStatus.Pending,
        };
        await _db.LeaveRequests.AddAsync(lr, ct);
        _audit.Enqueue("Create", "Leave", nameof(LeaveRequest), lr.Id.ToString(),
            $"Leave requested by {emp!.EmployeeCode}: {type!.Name} {req.StartDate:yyyy-MM-dd}–{req.EndDate:yyyy-MM-dd} ({duration}d)");
        await _uow.SaveChangesAsync(ct);
        return Map(lr, emp, type);
    }

    private async Task<LeaveRequest> LoadAsync(Guid id, CancellationToken ct) =>
        await _db.LeaveRequests.Include(l => l.Employee).Include(l => l.LeaveType).FirstOrDefaultAsync(l => l.Id == id, ct)
        ?? throw new NotFoundException("Leave request not found.");

    /// <summary>
    /// Enforces the leave state machine. Only Pending requests can be approved or
    /// rejected; Pending and Approved can be cancelled. Everything else is terminal.
    /// </summary>
    private static void RequirePending(LeaveRequest lr, string action)
    {
        if (lr.Status != LeaveRequestStatus.Pending)
            throw new ConflictException($"Cannot {action} a leave request that is already {lr.Status}. Only pending requests can be {action}d.");
    }

    public async Task<LeaveRequestDto> ApproveAsync(Guid id, string approvedBy, CancellationToken ct = default)
    {
        await _uow.BeginTransactionAsync(ct);
        try
        {
            var lr = await LoadAsync(id, ct);
            RequirePending(lr, "approve");

            var year = lr.StartDate.Year;
            var balance = await EnsureBalanceAsync(lr.EmployeeId, lr.LeaveType, year, ct);
            if (balance.TotalDays - balance.UsedDays < lr.Duration)
                throw new ConflictException($"Insufficient {lr.LeaveType.Name} balance to approve: {balance.TotalDays - balance.UsedDays} day(s) remaining, {lr.Duration} required.");

            lr.Status = LeaveRequestStatus.Approved;
            lr.ApprovedBy = approvedBy;
            lr.ApprovedAt = DateTime.UtcNow;
            lr.RejectionReason = null;
            balance.UsedDays += lr.Duration;

            _audit.Enqueue("Approve", "Leave", nameof(LeaveRequest), lr.Id.ToString(),
                $"Approved {lr.Duration}d {lr.LeaveType.Name} for {lr.Employee.EmployeeCode}; balance now {balance.UsedDays}/{balance.TotalDays}");
            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);
            return Map(lr, lr.Employee, lr.LeaveType);
        }
        catch { await _uow.RollbackTransactionAsync(ct); throw; }
    }

    public async Task<LeaveRequestDto> RejectAsync(Guid id, string reason, string rejectedBy, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ValidationException("A rejection reason is required.");

        var lr = await LoadAsync(id, ct);
        RequirePending(lr, "reject");

        lr.Status = LeaveRequestStatus.Rejected;
        lr.RejectionReason = reason.Trim();
        lr.ApprovedBy = rejectedBy;
        lr.ApprovedAt = DateTime.UtcNow;
        // Never approved, so no balance was consumed and none needs restoring.
        _audit.Enqueue("Reject", "Leave", nameof(LeaveRequest), lr.Id.ToString(),
            $"Rejected {lr.Duration}d {lr.LeaveType.Name} for {lr.Employee.EmployeeCode}: {reason.Trim()}");
        await _uow.SaveChangesAsync(ct);
        return Map(lr, lr.Employee, lr.LeaveType);
    }

    public async Task<LeaveRequestDto> CancelAsync(Guid id, string cancelledBy, CancellationToken ct = default)
    {
        await _uow.BeginTransactionAsync(ct);
        try
        {
            var lr = await LoadAsync(id, ct);
            if (lr.Status is LeaveRequestStatus.Rejected or LeaveRequestStatus.Cancelled)
                throw new ConflictException($"Cannot cancel a leave request that is already {lr.Status}.");

            // Cancelling an approved request returns the days to the balance.
            if (lr.Status == LeaveRequestStatus.Approved)
            {
                var balance = await EnsureBalanceAsync(lr.EmployeeId, lr.LeaveType, lr.StartDate.Year, ct);
                balance.UsedDays = Math.Max(0m, balance.UsedDays - lr.Duration);
            }
            lr.Status = LeaveRequestStatus.Cancelled;
            _audit.Enqueue("Cancel", "Leave", nameof(LeaveRequest), lr.Id.ToString(),
                $"Cancelled {lr.Duration}d {lr.LeaveType.Name} for {lr.Employee.EmployeeCode} by {cancelledBy}");
            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);
            return Map(lr, lr.Employee, lr.LeaveType);
        }
        catch { await _uow.RollbackTransactionAsync(ct); throw; }
    }

    public async Task<IEnumerable<LeaveTypeDto>> GetTypesAsync(CancellationToken ct = default) =>
        await _db.LeaveTypes.Where(t => t.IsActive).OrderBy(t => t.Name)
            .Select(t => new LeaveTypeDto(t.Id, t.Name, t.DefaultDaysPerYear, t.IsPaid, t.IsActive)).ToListAsync(ct);

    public async Task<IEnumerable<LeaveBalanceDto>> GetBalancesAsync(Guid employeeId, CancellationToken ct = default)
    {
        if (!await _db.Employees.AnyAsync(e => e.Id == employeeId, ct))
            throw new NotFoundException("Employee not found.");
        return await _db.LeaveBalances.Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == employeeId)
            .OrderByDescending(b => b.Year).ThenBy(b => b.LeaveType.Name)
            .Select(b => new LeaveBalanceDto(b.Id, b.EmployeeId, b.LeaveType.Name, b.Year, b.TotalDays, b.UsedDays, b.TotalDays - b.UsedDays))
            .ToListAsync(ct);
    }
}

public class PayrollService : IPayrollService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public PayrollService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    // Payroll policy constants. Kept explicit and reflected in PayrollItem lines
    // so every figure on a payslip can be traced back to a rule.
    private const decimal AllowanceRate = 0.10m;   // 10% of basic
    private const decimal TaxRate = 0.12m;         // 12% of gross
    private const decimal DeductionRate = 0.02m;   // 2% of gross (social insurance)
    private const decimal OvertimeMultiplier = 1.5m;
    private const decimal MonthlyWorkHours = 176m; // 22 days x 8h

    private static PayrollPeriodDto MapPeriod(PayrollPeriod p) => new(
        p.Id, p.Name, p.StartDate, p.EndDate, p.PayDate, p.Status.ToString(),
        p.Payrolls.Count, p.Payrolls.Sum(x => x.GrossSalary), p.Payrolls.Sum(x => x.NetSalary));

    public async Task<PagedResult<PayrollPeriodDto>> GetPeriodsAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.PayrollPeriods.Include(p => p.Payrolls).AsQueryable();
        if (req.Search is not null)
            query = query.Where(p => p.Name.ToLower().Contains(req.Search.ToLower()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.EndDate).ThenBy(p => p.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(p => new PayrollPeriodDto(p.Id, p.Name, p.StartDate, p.EndDate, p.PayDate, p.Status.ToString(),
                p.Payrolls.Count, p.Payrolls.Sum(x => x.GrossSalary), p.Payrolls.Sum(x => x.NetSalary)))
            .ToListAsync(ct);
        return new PagedResult<PayrollPeriodDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<PayrollPeriodDto> CreatePeriodAsync(CreatePayrollPeriodRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("name", req.Name, 200);
        v.DateOrder("startDate", req.StartDate, "endDate", req.EndDate);
        v.WorkDate("startDate", req.StartDate, maxYearsAhead: 2);
        v.WorkDate("endDate", req.EndDate, maxYearsAhead: 2);
        if (req.PayDate < req.EndDate)
            v.Add("payDate", "Pay date must be on or after the period end date.");
        if (req.EndDate.DayNumber - req.StartDate.DayNumber > 366)
            v.Add("endDate", "A payroll period cannot span more than one year.");
        v.ThrowIfInvalid();

        var name = req.Name.Trim();
        if (await _db.PayrollPeriods.AnyAsync(p => p.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException("A payroll period with this name already exists.");
        // Overlapping periods would pay the same days twice.
        var clash = await _db.PayrollPeriods
            .FirstOrDefaultAsync(p => p.StartDate <= req.EndDate && p.EndDate >= req.StartDate, ct);
        if (clash != null)
            throw new ConflictException($"This period overlaps the existing period '{clash.Name}' ({clash.StartDate:yyyy-MM-dd}–{clash.EndDate:yyyy-MM-dd}).");

        var period = new PayrollPeriod
        {
            Name = name, StartDate = req.StartDate, EndDate = req.EndDate, PayDate = req.PayDate,
            Status = PayrollStatus.Draft,
        };
        await _db.PayrollPeriods.AddAsync(period, ct);
        _audit.Enqueue("Create", "Payroll", nameof(PayrollPeriod), period.Id.ToString(),
            $"Created payroll period {name} ({req.StartDate:yyyy-MM-dd}–{req.EndDate:yyyy-MM-dd})");
        await _uow.SaveChangesAsync(ct);
        return new PayrollPeriodDto(period.Id, period.Name, period.StartDate, period.EndDate, period.PayDate,
            period.Status.ToString(), 0, 0, 0);
    }

    public async Task<IReadOnlyList<PayrollDto>> GetPayrollsByPeriodAsync(Guid periodId, CancellationToken ct = default)
    {
        if (!await _db.PayrollPeriods.AnyAsync(p => p.Id == periodId, ct))
            throw new NotFoundException("Payroll period not found.");
        return await _db.Payrolls.Where(p => p.PayrollPeriodId == periodId)
            .Include(p => p.Employee).Include(p => p.PayrollPeriod)
            .OrderBy(p => p.Employee.EmployeeCode)
            .Select(p => new PayrollDto(p.Id, p.EmployeeId, p.Employee.FirstName + " " + p.Employee.LastName,
                p.Employee.EmployeeCode, p.PayrollPeriod.Name, p.BasicSalary, p.Allowances, p.OvertimePay, p.Bonuses,
                p.GrossSalary, p.Deductions, p.Taxes, p.BenefitsDeduction, p.NetSalary, p.Status.ToString()))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Calculates and persists payroll for every employee active during the period.
    /// Runs inside a transaction that takes an update lock on the period row, so
    /// concurrent or repeated calls cannot double-process.
    /// </summary>
    public async Task<PayrollPeriodDto> ProcessPayrollAsync(Guid periodId, CancellationToken ct = default)
    {
        await _uow.BeginTransactionAsync(ct);
        try
        {
            // UPDLOCK serialises concurrent process attempts on this period; the
            // status check below then rejects every attempt after the first.
            var period = await _db.PayrollPeriods
                .FromSql($"SELECT * FROM PayrollPeriods WITH (UPDLOCK, ROWLOCK) WHERE Id = {periodId}")
                .FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("Payroll period not found.");

            if (period.Status != PayrollStatus.Draft)
                throw new ConflictException($"This payroll period is already {period.Status} and cannot be processed again.");
            if (await _db.Payrolls.AnyAsync(p => p.PayrollPeriodId == periodId, ct))
                throw new ConflictException("Payroll rows already exist for this period.");

            var periodStart = period.StartDate;
            var periodEnd = period.EndDate;
            var periodDays = periodEnd.DayNumber - periodStart.DayNumber + 1;

            // Anyone employed for at least one day of the period is paid, including
            // mid-period joiners and leavers (pro-rated below).
            var employees = await _db.Employees
                .Where(e => e.Status != EmployeeStatus.Terminated || e.TerminationDate == null
                            || e.TerminationDate >= periodStart.ToDateTime(TimeOnly.MinValue))
                .Where(e => e.JoinDate <= periodEnd.ToDateTime(TimeOnly.MaxValue))
                .ToListAsync(ct);

            var newPayrolls = new List<Payroll>();
            foreach (var emp in employees)
            {
                var joinDate = DateOnly.FromDateTime(emp.JoinDate);
                var leaveDate = emp.TerminationDate.HasValue ? DateOnly.FromDateTime(emp.TerminationDate.Value.Date) : (DateOnly?)null;
                var from = joinDate > periodStart ? joinDate : periodStart;
                var to = leaveDate.HasValue && leaveDate.Value < periodEnd ? leaveDate.Value : periodEnd;
                var payableDays = to.DayNumber - from.DayNumber + 1;
                if (payableDays <= 0) continue;

                // Pro-rate basic pay for partial employment within the period.
                var proration = payableDays >= periodDays ? 1m : (decimal)payableDays / periodDays;
                var basic = Math.Round(emp.MonthlySalary * proration, 2);
                var allowances = Math.Round(basic * AllowanceRate, 2);

                var overtimeHours = await _db.Attendances
                    .Where(a => a.EmployeeId == emp.Id && a.Date >= periodStart && a.Date <= periodEnd)
                    .SumAsync(a => a.OvertimeHours, ct);
                var hourlyRate = emp.MonthlySalary / MonthlyWorkHours;
                var overtimePay = Math.Round(overtimeHours * hourlyRate * OvertimeMultiplier, 2);

                // Employee-paid share of every benefit they are enrolled in.
                var benefitsDeduction = Math.Round(await _db.EmployeeBenefits
                    .Where(b => b.EmployeeId == emp.Id && b.IsActive)
                    .SumAsync(b => b.Benefit.EmployeeCostMonthly, ct), 2);

                const decimal bonuses = 0m; // No bonus source in the current product.
                var gross = Math.Round(basic + allowances + overtimePay + bonuses, 2);
                var taxes = Math.Round(gross * TaxRate, 2);
                var deductions = Math.Round(gross * DeductionRate, 2);
                // Invariant: Net == Gross - Deductions - Taxes - BenefitsDeduction.
                var net = Math.Round(gross - taxes - deductions - benefitsDeduction, 2);

                var payroll = new Payroll
                {
                    PayrollPeriodId = period.Id, EmployeeId = emp.Id,
                    BasicSalary = basic, Allowances = allowances, OvertimePay = overtimePay, Bonuses = bonuses,
                    GrossSalary = gross, Taxes = taxes, Deductions = deductions,
                    BenefitsDeduction = benefitsDeduction, NetSalary = net,
                    Status = PayrollStatus.Processing,
                };
                // Add through the DbSet, not the parent's navigation collection:
                // BaseEntity assigns its own Id, so graph-discovered children are
                // classified Modified and EF would emit UPDATEs against rows that
                // do not exist yet.
                newPayrolls.Add(payroll);

                payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = "Basic salary", Category = "Earning", Amount = basic });
                if (allowances > 0) payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = $"Allowances ({AllowanceRate:P0} of basic)", Category = "Earning", Amount = allowances });
                if (overtimePay > 0) payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = $"Overtime ({overtimeHours}h @ {OvertimeMultiplier}x)", Category = "Earning", Amount = overtimePay });
                if (taxes > 0) payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = $"Income tax ({TaxRate:P0} of gross)", Category = "Tax", Amount = taxes });
                if (deductions > 0) payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = $"Social insurance ({DeductionRate:P0} of gross)", Category = "Deduction", Amount = deductions });
                if (benefitsDeduction > 0) payroll.Items.Add(new PayrollItem { PayrollId = payroll.Id, Description = "Benefit contributions", Category = "Deduction", Amount = benefitsDeduction });
            }

            if (newPayrolls.Count == 0)
                throw new ConflictException("No employees were active during this period, so there is nothing to process.");

            await _db.Payrolls.AddRangeAsync(newPayrolls, ct);
            period.Status = PayrollStatus.Processing;

            _audit.Enqueue("Post", "Payroll", nameof(PayrollPeriod), period.Id.ToString(),
                $"Processed payroll {period.Name}: {newPayrolls.Count} employee(s), gross {newPayrolls.Sum(p => p.GrossSalary):N2}, net {newPayrolls.Sum(p => p.NetSalary):N2}");

            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);

            return new PayrollPeriodDto(period.Id, period.Name, period.StartDate, period.EndDate, period.PayDate,
                period.Status.ToString(), newPayrolls.Count, newPayrolls.Sum(p => p.GrossSalary), newPayrolls.Sum(p => p.NetSalary));
        }
        catch { await _uow.RollbackTransactionAsync(ct); throw; }
    }

    public async Task<PayrollPeriodDto> PostPayrollAsync(Guid periodId, CancellationToken ct = default)
    {
        await _uow.BeginTransactionAsync(ct);
        try
        {
            var period = await _db.PayrollPeriods
                .FromSql($"SELECT * FROM PayrollPeriods WITH (UPDLOCK, ROWLOCK) WHERE Id = {periodId}")
                .FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("Payroll period not found.");

            if (period.Status == PayrollStatus.Posted)
                throw new ConflictException("This payroll period has already been posted.");
            if (period.Status != PayrollStatus.Processing)
                throw new ConflictException($"Payroll must be processed before it can be posted (current status: {period.Status}).");

            var payrolls = await _db.Payrolls.Where(p => p.PayrollPeriodId == periodId).ToListAsync(ct);
            if (payrolls.Count == 0)
                throw new ConflictException("This period has no payroll rows to post.");

            foreach (var p in payrolls) p.Status = PayrollStatus.Posted;
            period.Status = PayrollStatus.Posted;

            _audit.Enqueue("Post", "Payroll", nameof(PayrollPeriod), period.Id.ToString(),
                $"Posted payroll {period.Name}: {payrolls.Count} payslip(s), net {payrolls.Sum(p => p.NetSalary):N2}");

            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);
            return new PayrollPeriodDto(period.Id, period.Name, period.StartDate, period.EndDate, period.PayDate,
                period.Status.ToString(), payrolls.Count, payrolls.Sum(p => p.GrossSalary), payrolls.Sum(p => p.NetSalary));
        }
        catch { await _uow.RollbackTransactionAsync(ct); throw; }
    }
}

public class RecruitmentService : IRecruitmentService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public RecruitmentService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    /// <summary>
    /// Allowed forward transitions in the hiring pipeline. Rejected is reachable
    /// from any live stage; nothing moves backwards, and Hired/Rejected are terminal.
    /// </summary>
    private static readonly Dictionary<RecruitmentStage, RecruitmentStage[]> Transitions = new()
    {
        [RecruitmentStage.Applied] = [RecruitmentStage.Screening, RecruitmentStage.Rejected],
        [RecruitmentStage.Screening] = [RecruitmentStage.Interview, RecruitmentStage.Rejected],
        [RecruitmentStage.Interview] = [RecruitmentStage.Offer, RecruitmentStage.Rejected],
        [RecruitmentStage.Offer] = [RecruitmentStage.Hired, RecruitmentStage.Rejected],
        [RecruitmentStage.Hired] = [],
        [RecruitmentStage.Rejected] = [],
    };

    public async Task<IEnumerable<JobOpeningDto>> GetJobOpeningsAsync(CancellationToken ct = default) =>
        await _db.JobOpenings.Include(j => j.Department).Include(j => j.Position).Include(j => j.HiringManager)
            .Include(j => j.Candidates).OrderByDescending(j => j.CreatedAt)
            .Select(j => new JobOpeningDto(j.Id, j.Title, j.Department.Name,
                j.Position != null ? j.Position.Title : null, j.Candidates.Count(c => !c.IsDeleted),
                j.HiringManager != null ? j.HiringManager.FirstName + " " + j.HiringManager.LastName : null, j.IsActive))
            .ToListAsync(ct);

    public async Task<JobOpeningDto> CreateJobOpeningAsync(CreateJobOpeningRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Name("title", req.Title, 200);
        if (req.DepartmentId == Guid.Empty) v.Add("departmentId", "Department is required.");
        else if (!await _db.Departments.AnyAsync(d => d.Id == req.DepartmentId, ct))
            v.Add("departmentId", "The selected department does not exist.");
        if (req.PositionId.HasValue && !await _db.Positions.AnyAsync(p => p.Id == req.PositionId.Value, ct))
            v.Add("positionId", "The selected position does not exist.");
        if (req.HiringManagerId.HasValue && !await _db.Employees.AnyAsync(e => e.Id == req.HiringManagerId.Value, ct))
            v.Add("hiringManagerId", "The selected hiring manager does not exist.");
        if (req.SalaryMin.HasValue) v.Money("salaryMin", req.SalaryMin.Value, 0, Validator.MaxMonthlySalary);
        if (req.SalaryMax.HasValue) v.Money("salaryMax", req.SalaryMax.Value, 0, Validator.MaxMonthlySalary);
        if (req.SalaryMin.HasValue && req.SalaryMax.HasValue && req.SalaryMax < req.SalaryMin)
            v.Add("salaryMax", "Maximum salary must be greater than or equal to minimum salary.");
        v.ThrowIfInvalid();

        var job = new JobOpening
        {
            Title = req.Title.Trim(), DepartmentId = req.DepartmentId, PositionId = req.PositionId,
            Description = req.Description?.Trim(), Requirements = req.Requirements?.Trim(),
            SalaryMin = req.SalaryMin, SalaryMax = req.SalaryMax, HiringManagerId = req.HiringManagerId,
        };
        await _db.JobOpenings.AddAsync(job, ct);
        _audit.Enqueue("Create", "Recruitment", nameof(JobOpening), job.Id.ToString(), $"Created job opening {job.Title}");
        await _uow.SaveChangesAsync(ct);
        return (await GetJobOpeningsAsync(ct)).First(j => j.Id == job.Id);
    }

    public async Task CloseJobOpeningAsync(Guid id, CancellationToken ct = default)
    {
        var job = await _db.JobOpenings.FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Job opening not found.");
        if (!job.IsActive) throw new ConflictException("This job opening is already closed.");
        job.IsActive = false;
        _audit.Enqueue("Update", "Recruitment", nameof(JobOpening), id.ToString(), $"Closed job opening {job.Title}");
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<CandidateDto>> GetCandidatesAsync(Guid jobOpeningId, CancellationToken ct = default)
    {
        if (!await _db.JobOpenings.AnyAsync(j => j.Id == jobOpeningId, ct))
            throw new NotFoundException("Job opening not found.");
        return await _db.Candidates.Include(c => c.JobOpening).Where(c => c.JobOpeningId == jobOpeningId)
            .OrderByDescending(c => c.AppliedDate)
            .Select(c => new CandidateDto(c.Id, c.Name, c.Email, c.Phone, c.JobOpening.Title,
                c.Stage.ToString(), c.Status.ToString(), c.AppliedDate)).ToListAsync(ct);
    }

    public async Task<CandidateDto> AddCandidateAsync(Guid jobOpeningId, CreateCandidateRequest req, CancellationToken ct = default)
    {
        var job = await _db.JobOpenings.FirstOrDefaultAsync(j => j.Id == jobOpeningId, ct)
            ?? throw new NotFoundException("Job opening not found.");
        if (!job.IsActive) throw new ConflictException("Cannot add candidates to a closed job opening.");

        var v = new Validator();
        v.Name("name", req.Name, 200).Email("email", req.Email).OptionalPhone("phone", req.Phone);
        v.ThrowIfInvalid();

        var email = req.Email.Trim().ToLower();
        if (await _db.Candidates.AnyAsync(c => c.JobOpeningId == jobOpeningId && c.Email.ToLower() == email, ct))
            throw new ConflictException("This candidate has already applied to this opening.");

        var cand = new Candidate
        {
            Name = req.Name.Trim(), Email = req.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            JobOpeningId = jobOpeningId, Notes = req.Notes?.Trim(),
            Stage = RecruitmentStage.Applied, Status = CandidateStatus.Active,
            AppliedDate = DateTime.UtcNow,
        };
        await _db.Candidates.AddAsync(cand, ct);
        _audit.Enqueue("Create", "Recruitment", nameof(Candidate), cand.Id.ToString(),
            $"Candidate {cand.Name} applied for {job.Title}");
        await _uow.SaveChangesAsync(ct);
        return new CandidateDto(cand.Id, cand.Name, cand.Email, cand.Phone, job.Title,
            cand.Stage.ToString(), cand.Status.ToString(), cand.AppliedDate);
    }

    public async Task<CandidateDto> UpdateCandidateStageAsync(Guid candidateId, string stage, CancellationToken ct = default)
    {
        var cand = await _db.Candidates.Include(c => c.JobOpening).FirstOrDefaultAsync(c => c.Id == candidateId, ct)
            ?? throw new NotFoundException("Candidate not found.");

        var v = new Validator();
        if (!v.TryEnum<RecruitmentStage>("stage", stage, out var target)) v.ThrowIfInvalid();

        if (target == cand.Stage)
            throw new ConflictException($"Candidate is already at the {cand.Stage} stage.");
        if (!Transitions[cand.Stage].Contains(target))
            throw new ConflictException($"Cannot move a candidate from {cand.Stage} to {target}. Allowed next stage(s): " +
                (Transitions[cand.Stage].Length == 0 ? "none — this stage is final." : string.Join(", ", Transitions[cand.Stage])));

        var previous = cand.Stage;
        cand.Stage = target;
        cand.Status = target switch
        {
            RecruitmentStage.Hired => CandidateStatus.Approved,
            RecruitmentStage.Rejected => CandidateStatus.Rejected,
            _ => CandidateStatus.Active,
        };
        _audit.Enqueue(target == RecruitmentStage.Rejected ? "Reject" : "Update", "Recruitment", nameof(Candidate),
            cand.Id.ToString(), $"Candidate {cand.Name}: {previous} → {target}");
        await _uow.SaveChangesAsync(ct);
        return new CandidateDto(cand.Id, cand.Name, cand.Email, cand.Phone, cand.JobOpening.Title,
            cand.Stage.ToString(), cand.Status.ToString(), cand.AppliedDate);
    }
}

public class PerformanceService : IPerformanceService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public PerformanceService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    /// <summary>Reviews are scored on a 5-point scale.</summary>
    private const decimal MaxScore = 5m;

    public async Task<IEnumerable<PerformanceReviewDto>> GetReviewsAsync(CancellationToken ct = default) =>
        await _db.PerformanceReviews.Include(r => r.Employee).Include(r => r.Reviewer)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new PerformanceReviewDto(r.Id, r.EmployeeId, r.Employee.FirstName + " " + r.Employee.LastName,
                r.ReviewPeriod, r.Score, r.GoalsCompletePercent,
                r.Reviewer != null ? r.Reviewer.FirstName + " " + r.Reviewer.LastName : null,
                r.Status.ToString(), r.Comments)).ToListAsync(ct);

    public async Task<PerformanceReviewDto> CreateAsync(CreatePerformanceReviewRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("reviewPeriod", req.ReviewPeriod, 100);
        v.Range("score", req.Score, 0, MaxScore);
        v.Percent("goalsCompletePercent", req.GoalsCompletePercent);
        if (!await _db.Employees.AnyAsync(e => e.Id == req.EmployeeId, ct))
            v.Add("employeeId", "The selected employee does not exist.");
        if (req.ReviewerId.HasValue)
        {
            if (req.ReviewerId.Value == req.EmployeeId) v.Add("reviewerId", "An employee cannot review themselves.");
            else if (!await _db.Employees.AnyAsync(e => e.Id == req.ReviewerId.Value, ct))
                v.Add("reviewerId", "The selected reviewer does not exist.");
        }
        v.ThrowIfInvalid();

        var period = req.ReviewPeriod.Trim();
        if (await _db.PerformanceReviews.AnyAsync(r => r.EmployeeId == req.EmployeeId && r.ReviewPeriod.ToLower() == period.ToLower(), ct))
            throw new ConflictException($"This employee already has a review for {period}.");

        var review = new PerformanceReview
        {
            EmployeeId = req.EmployeeId, ReviewPeriod = period, Score = req.Score,
            GoalsCompletePercent = req.GoalsCompletePercent, ReviewerId = req.ReviewerId,
            Comments = req.Comments?.Trim(), Status = PerformanceReviewStatus.Draft,
        };
        await _db.PerformanceReviews.AddAsync(review, ct);
        _audit.Enqueue("Create", "Performance", nameof(PerformanceReview), review.Id.ToString(),
            $"Created {period} review (score {req.Score})");
        await _uow.SaveChangesAsync(ct);
        return (await GetReviewsAsync(ct)).First(r => r.Id == review.Id);
    }

    public async Task<PerformanceReviewDto> UpdateAsync(Guid id, UpdatePerformanceReviewRequest req, CancellationToken ct = default)
    {
        var review = await _db.PerformanceReviews.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Performance review not found.");

        var v = new Validator();
        v.Required("reviewPeriod", req.ReviewPeriod, 100);
        v.Range("score", req.Score, 0, MaxScore);
        v.Percent("goalsCompletePercent", req.GoalsCompletePercent);
        v.TryEnum<PerformanceReviewStatus>("status", req.Status, out var status);
        if (req.ReviewerId.HasValue)
        {
            if (req.ReviewerId.Value == review.EmployeeId) v.Add("reviewerId", "An employee cannot review themselves.");
            else if (!await _db.Employees.AnyAsync(e => e.Id == req.ReviewerId.Value, ct))
                v.Add("reviewerId", "The selected reviewer does not exist.");
        }
        v.ThrowIfInvalid();

        // An approved review is a signed record; reopening it would rewrite history.
        if (review.Status == PerformanceReviewStatus.Approved && status != PerformanceReviewStatus.Approved)
            throw new ConflictException("An approved review cannot be reopened.");

        var before = $"{review.ReviewPeriod} | score={review.Score} | {review.Status}";
        review.ReviewPeriod = req.ReviewPeriod.Trim();
        review.Score = req.Score;
        review.GoalsCompletePercent = req.GoalsCompletePercent;
        review.ReviewerId = req.ReviewerId;
        review.Comments = req.Comments?.Trim();
        review.Status = status;
        _audit.Enqueue(status == PerformanceReviewStatus.Approved ? "Approve" : "Update", "Performance",
            nameof(PerformanceReview), id.ToString(), $"Updated review {review.ReviewPeriod}",
            before, $"{review.ReviewPeriod} | score={review.Score} | {review.Status}");
        await _uow.SaveChangesAsync(ct);
        return (await GetReviewsAsync(ct)).First(r => r.Id == id);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var review = await _db.PerformanceReviews.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Performance review not found.");
        if (review.Status == PerformanceReviewStatus.Approved)
            throw new ConflictException("An approved review cannot be deleted.");
        review.IsDeleted = true;
        _audit.Enqueue("Delete", "Performance", nameof(PerformanceReview), id.ToString(),
            $"Deleted review {review.ReviewPeriod}");
        await _uow.SaveChangesAsync(ct);
    }
}

public class BenefitsService : IBenefitsService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow; private readonly IAuditService _audit;
    public BenefitsService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit) { _db = db; _uow = uow; _audit = audit; }

    public async Task<IEnumerable<BenefitDto>> GetBenefitsAsync(CancellationToken ct = default) =>
        await _db.Benefits.Include(b => b.EmployeeBenefits).OrderBy(b => b.PlanName)
            .Select(b => new BenefitDto(b.Id, b.PlanName, b.Provider, b.Description, b.EmployerCostMonthly,
                b.EmployeeCostMonthly, b.EmployeeBenefits.Count(e => !e.IsDeleted && e.IsActive), b.Status.ToString()))
            .ToListAsync(ct);

    private async Task ValidateAsync(Validator v, CreateBenefitRequest req, Guid? excludeId, CancellationToken ct)
    {
        v.Name("planName", req.PlanName, 200);
        v.Name("provider", req.Provider, 200);
        v.Money("employerCostMonthly", req.EmployerCostMonthly, 0, Validator.MaxMonthlySalary);
        v.Money("employeeCostMonthly", req.EmployeeCostMonthly, 0, Validator.MaxMonthlySalary);
        var name = req.PlanName?.Trim().ToLower();
        if (!string.IsNullOrEmpty(name) &&
            await _db.Benefits.AnyAsync(b => b.PlanName.ToLower() == name && (excludeId == null || b.Id != excludeId), ct))
            v.Add("planName", "A benefit plan with this name already exists.");
    }

    public async Task<BenefitDto> CreateAsync(CreateBenefitRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        await ValidateAsync(v, req, null, ct);
        v.ThrowIfInvalid();

        var benefit = new Benefit
        {
            PlanName = req.PlanName.Trim(), Provider = req.Provider.Trim(),
            Description = req.Description?.Trim(),
            EmployerCostMonthly = req.EmployerCostMonthly, EmployeeCostMonthly = req.EmployeeCostMonthly,
            Status = BenefitStatus.Active,
        };
        await _db.Benefits.AddAsync(benefit, ct);
        _audit.Enqueue("Create", "Benefits", nameof(Benefit), benefit.Id.ToString(), $"Created benefit plan {benefit.PlanName}");
        await _uow.SaveChangesAsync(ct);
        return (await GetBenefitsAsync(ct)).First(b => b.Id == benefit.Id);
    }

    public async Task<BenefitDto> UpdateAsync(Guid id, CreateBenefitRequest req, CancellationToken ct = default)
    {
        var benefit = await _db.Benefits.FirstOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new NotFoundException("Benefit plan not found.");
        var v = new Validator();
        await ValidateAsync(v, req, id, ct);
        v.ThrowIfInvalid();

        var before = $"{benefit.PlanName} | {benefit.EmployeeCostMonthly}/{benefit.EmployerCostMonthly}";
        benefit.PlanName = req.PlanName.Trim();
        benefit.Provider = req.Provider.Trim();
        benefit.Description = req.Description?.Trim();
        benefit.EmployerCostMonthly = req.EmployerCostMonthly;
        benefit.EmployeeCostMonthly = req.EmployeeCostMonthly;
        _audit.Enqueue("Update", "Benefits", nameof(Benefit), id.ToString(), $"Updated benefit plan {benefit.PlanName}",
            before, $"{benefit.PlanName} | {benefit.EmployeeCostMonthly}/{benefit.EmployerCostMonthly}");
        await _uow.SaveChangesAsync(ct);
        return (await GetBenefitsAsync(ct)).First(b => b.Id == id);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var benefit = await _db.Benefits.FirstOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new NotFoundException("Benefit plan not found.");
        var enrolled = await _db.EmployeeBenefits.CountAsync(e => e.BenefitId == id && e.IsActive, ct);
        if (enrolled > 0)
            throw new ConflictException($"Cannot delete this plan — {enrolled} employee(s) are still enrolled.");
        benefit.IsDeleted = true;
        benefit.Status = BenefitStatus.Inactive;
        _audit.Enqueue("Delete", "Benefits", nameof(Benefit), id.ToString(), $"Deleted benefit plan {benefit.PlanName}");
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<EmployeeBenefitDto> EnrollAsync(Guid benefitId, EnrollBenefitRequest req, CancellationToken ct = default)
    {
        var benefit = await _db.Benefits.FirstOrDefaultAsync(b => b.Id == benefitId, ct)
            ?? throw new NotFoundException("Benefit plan not found.");
        if (benefit.Status != BenefitStatus.Active)
            throw new ConflictException("Cannot enroll in an inactive benefit plan.");

        var v = new Validator();
        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == req.EmployeeId, ct);
        if (emp == null) v.Add("employeeId", "The selected employee does not exist.");
        else if (emp.Status == EmployeeStatus.Terminated)
            v.Add("employeeId", "Cannot enroll a terminated employee.");
        v.WorkDate("enrollmentDate", req.EnrollmentDate);
        v.ThrowIfInvalid();

        if (await _db.EmployeeBenefits.AnyAsync(e => e.BenefitId == benefitId && e.EmployeeId == req.EmployeeId && e.IsActive, ct))
            throw new ConflictException("This employee is already enrolled in this benefit plan.");

        var enrollment = new EmployeeBenefit
        {
            BenefitId = benefitId, EmployeeId = req.EmployeeId,
            EnrollmentDate = req.EnrollmentDate, IsActive = true,
        };
        await _db.EmployeeBenefits.AddAsync(enrollment, ct);
        _audit.Enqueue("Create", "Benefits", nameof(EmployeeBenefit), enrollment.Id.ToString(),
            $"Enrolled {emp!.EmployeeCode} in {benefit.PlanName}");
        await _uow.SaveChangesAsync(ct);
        return new EmployeeBenefitDto(enrollment.Id, benefitId, benefit.PlanName, benefit.Provider,
            benefit.EmployeeCostMonthly, benefit.EmployerCostMonthly, enrollment.EnrollmentDate, true);
    }

    public async Task UnenrollAsync(Guid benefitId, Guid employeeId, CancellationToken ct = default)
    {
        var enrollment = await _db.EmployeeBenefits.Include(e => e.Benefit)
            .FirstOrDefaultAsync(e => e.BenefitId == benefitId && e.EmployeeId == employeeId && e.IsActive, ct)
            ?? throw new NotFoundException("This employee is not enrolled in that benefit plan.");
        enrollment.IsActive = false;
        enrollment.EndDate = DateOnly.FromDateTime(DateTime.UtcNow);
        _audit.Enqueue("Delete", "Benefits", nameof(EmployeeBenefit), enrollment.Id.ToString(),
            $"Removed enrollment in {enrollment.Benefit.PlanName}");
        await _uow.SaveChangesAsync(ct);
    }
}

public class DocumentsService : IDocumentsService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow;
    private readonly IFileStorageService _storage; private readonly IAuditService _audit;
    public DocumentsService(IndigoDbContext db, IUnitOfWork uow, IFileStorageService storage, IAuditService audit)
    { _db = db; _uow = uow; _storage = storage; _audit = audit; }

    /// <summary>10 MB ceiling — enough for contracts and scans, small enough to stay safe.</summary>
    private const long MaxFileSize = 10 * 1024 * 1024;

    private static readonly string[] AllowedExtensions =
        [".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx", ".xls", ".xlsx"];

    public async Task<IEnumerable<EmployeeDocumentDto>> GetDocumentsAsync(CancellationToken ct = default) =>
        await _db.EmployeeDocuments.Include(d => d.Employee).OrderByDescending(d => d.CreatedAt)
            .Select(d => new EmployeeDocumentDto(d.Id, d.Title, d.EmployeeId,
                d.Employee.FirstName + " " + d.Employee.LastName, d.Category.ToString(), d.FileName,
                d.FileSize, d.ExpirationDate, d.Status.ToString(), d.CreatedAt)).ToListAsync(ct);

    public async Task<EmployeeDocumentDto> UploadAsync(string title, Guid employeeId, string category,
        DateOnly? expirationDate, string fileName, string contentType, long fileSize, Stream content,
        CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("title", title, 200);
        v.TryEnum<DocumentCategory>("category", category, out var cat);

        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, ct);
        if (emp == null) v.Add("employeeId", "The selected employee does not exist.");

        if (string.IsNullOrWhiteSpace(fileName)) v.Add("file", "A file is required.");
        else
        {
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                v.Add("file", $"File type '{ext}' is not allowed. Allowed types: {string.Join(", ", AllowedExtensions)}.");
        }
        if (fileSize <= 0) v.Add("file", "The uploaded file is empty.");
        else if (fileSize > MaxFileSize) v.Add("file", $"File exceeds the {MaxFileSize / 1024 / 1024} MB limit.");
        if (expirationDate.HasValue && expirationDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
            v.Add("expirationDate", "Expiration date cannot be in the past.");
        v.ThrowIfInvalid();

        // Store the bytes first; if metadata then fails we delete the orphan below.
        var storagePath = await _storage.UploadAsync(fileName, content, contentType, ct);
        try
        {
            var doc = new EmployeeDocument
            {
                Title = title.Trim(), EmployeeId = employeeId, Category = cat,
                FileName = Path.GetFileName(fileName), StoragePath = storagePath,
                FileSize = fileSize, ContentType = contentType,
                ExpirationDate = expirationDate, Status = DocumentStatus.Active,
            };
            await _db.EmployeeDocuments.AddAsync(doc, ct);
            _audit.Enqueue("Create", "Documents", nameof(EmployeeDocument), doc.Id.ToString(),
                $"Uploaded '{doc.Title}' ({doc.FileName}, {fileSize} bytes) for {emp!.EmployeeCode}");
            await _uow.SaveChangesAsync(ct);
            return new EmployeeDocumentDto(doc.Id, doc.Title, doc.EmployeeId, $"{emp.FirstName} {emp.LastName}",
                doc.Category.ToString(), doc.FileName, doc.FileSize, doc.ExpirationDate, doc.Status.ToString(), doc.CreatedAt);
        }
        catch
        {
            // Don't leave a file on disk with no database row pointing at it.
            await _storage.DeleteAsync(storagePath, ct);
            throw;
        }
    }

    public async Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await _db.EmployeeDocuments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Document not found.");
        var stream = await _storage.DownloadAsync(doc.StoragePath, ct)
            ?? throw new NotFoundException("The stored file for this document is missing.");
        return (stream, string.IsNullOrWhiteSpace(doc.ContentType) ? "application/octet-stream" : doc.ContentType, doc.FileName);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await _db.EmployeeDocuments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Document not found.");
        doc.IsDeleted = true;
        doc.Status = DocumentStatus.Archived;
        _audit.Enqueue("Delete", "Documents", nameof(EmployeeDocument), id.ToString(),
            $"Deleted document '{doc.Title}' ({doc.FileName})");
        await _uow.SaveChangesAsync(ct);
        await _storage.DeleteAsync(doc.StoragePath, ct);
    }
}

public class ExpenseService : IExpenseService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow;
    public ExpenseService(IndigoDbContext db, IUnitOfWork uow) { _db = db; _uow = uow; }

    public async Task<PagedResult<ExpenseDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Expenses.AsQueryable();
        if (req.Search is not null) query = query.Where(e => e.Title.ToLower().Contains(req.Search.ToLower()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(e => e.ExpenseDate).ThenBy(e => e.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(e => new ExpenseDto(e.Id, e.Title, e.Employee != null ? e.Employee.FirstName + " " + e.Employee.LastName : null, e.Category, e.Amount, e.ExpenseDate, e.Description,
                e.ReceiptFileName != null, e.Status.ToString())).ToListAsync(ct);
        return new PagedResult<ExpenseDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<ExpenseDto> CreateAsync(CreateExpenseRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("title", req.Title, 200).Required("category", req.Category, 100);
        v.Money("amount", req.Amount, 0, Validator.MaxBudget, allowZero: false);
        v.WorkDate("expenseDate", req.ExpenseDate);
        if (req.EmployeeId.HasValue && !await _db.Employees.AnyAsync(e => e.Id == req.EmployeeId.Value, ct))
            v.Add("employeeId", "The selected employee does not exist.");
        v.ThrowIfInvalid();

        var exp = new Domain.Entities.Finance.Expense
        {
            Title = req.Title.Trim(), EmployeeId = req.EmployeeId, Category = req.Category.Trim(),
            Amount = req.Amount, ExpenseDate = req.ExpenseDate, Description = req.Description?.Trim(),
        };
        await _db.Expenses.AddAsync(exp, ct); await _uow.SaveChangesAsync(ct);
        if (exp.EmployeeId.HasValue) await _db.Entry(exp).Reference(e => e.Employee).LoadAsync(ct);
        return new ExpenseDto(exp.Id, exp.Title, exp.Employee != null ? exp.Employee.FirstName + " " + exp.Employee.LastName : null, exp.Category, exp.Amount, exp.ExpenseDate, exp.Description, false, exp.Status.ToString());
    }

    public async Task<ExpenseDto> ApproveAsync(Guid id, string approvedBy, CancellationToken ct = default)
    {
        var exp = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("Expense not found.");
        if (exp.Status is ExpenseStatus.Approved or ExpenseStatus.Rejected or ExpenseStatus.Paid)
            throw new ConflictException($"Cannot approve an expense that is already {exp.Status}.");
        exp.Status = ExpenseStatus.Approved; exp.ApprovedBy = approvedBy; exp.ApprovedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync(ct);
        await _db.Entry(exp).Reference(e => e.Employee).LoadAsync(ct);
        return new ExpenseDto(exp.Id, exp.Title, exp.Employee != null ? exp.Employee.FirstName + " " + exp.Employee.LastName : null, exp.Category, exp.Amount, exp.ExpenseDate, exp.Description, exp.ReceiptFileName != null, exp.Status.ToString());
    }

    public async Task<ExpenseDto> RejectAsync(Guid id, CancellationToken ct = default)
    {
        var exp = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("Expense not found.");
        if (exp.Status is ExpenseStatus.Approved or ExpenseStatus.Rejected or ExpenseStatus.Paid)
            throw new ConflictException($"Cannot reject an expense that is already {exp.Status}.");
        exp.Status = ExpenseStatus.Rejected;
        await _uow.SaveChangesAsync(ct);
        return new ExpenseDto(exp.Id, exp.Title, null, exp.Category, exp.Amount, exp.ExpenseDate, exp.Description, exp.ReceiptFileName != null, exp.Status.ToString());
    }
}

public class CustomerService : ICustomerService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow;
    public CustomerService(IndigoDbContext db, IUnitOfWork uow) { _db = db; _uow = uow; }

    public async Task<PagedResult<CustomerDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Customers.AsQueryable();
        if (req.Search is not null) query = query.Where(c => c.Name.ToLower().Contains(req.Search.ToLower()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.Name).ThenBy(c => c.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(c => new CustomerDto(c.Id, c.Name, c.Email, c.Phone, c.Address, c.OutstandingBalance, c.IsActive)).ToListAsync(ct);
        return new PagedResult<CustomerDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Name("name", req.Name, 200).OptionalPhone("phone", req.Phone);
        if (!string.IsNullOrWhiteSpace(req.Email)) v.Email("email", req.Email);
        v.ThrowIfInvalid();
        var c = new Domain.Entities.Finance.Customer
        {
            Name = req.Name.Trim(), Email = req.Email?.Trim(), Phone = req.Phone?.Trim(),
            Address = req.Address?.Trim(), ContactPerson = req.ContactPerson?.Trim(),
        };
        await _db.Customers.AddAsync(c, ct); await _uow.SaveChangesAsync(ct);
        return new CustomerDto(c.Id, c.Name, c.Email, c.Phone, c.Address, 0, true);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Customer not found.");
        if (await _db.Invoices.AnyAsync(i => i.CustomerId == id, ct))
            throw new ConflictException("Cannot delete a customer that still has invoices.");
        c.IsDeleted = true; await _uow.SaveChangesAsync(ct);
    }
}

public class VendorService : IVendorService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow;
    public VendorService(IndigoDbContext db, IUnitOfWork uow) { _db = db; _uow = uow; }

    public async Task<PagedResult<VendorDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Vendors.AsQueryable();
        if (req.Search is not null) query = query.Where(v => v.Name.ToLower().Contains(req.Search.ToLower()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(v => v.Name).ThenBy(v => v.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(v => new VendorDto(v.Id, v.Name, v.Email, v.Phone, v.Address, v.OutstandingBalance, v.IsActive)).ToListAsync(ct);
        return new PagedResult<VendorDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<VendorDto> CreateAsync(CreateVendorRequest req, CancellationToken ct = default)
    {
        var val = new Validator();
        val.Name("name", req.Name, 200).OptionalPhone("phone", req.Phone);
        if (!string.IsNullOrWhiteSpace(req.Email)) val.Email("email", req.Email);
        val.ThrowIfInvalid();
        var v = new Domain.Entities.Finance.Vendor
        {
            Name = req.Name.Trim(), Email = req.Email?.Trim(), Phone = req.Phone?.Trim(),
            Address = req.Address?.Trim(), ContactPerson = req.ContactPerson?.Trim(),
        };
        await _db.Vendors.AddAsync(v, ct); await _uow.SaveChangesAsync(ct);
        return new VendorDto(v.Id, v.Name, v.Email, v.Phone, v.Address, 0, true);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var v = await _db.Vendors.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Vendor not found.");
        if (await _db.Bills.AnyAsync(b => b.VendorId == id, ct))
            throw new ConflictException("Cannot delete a vendor that still has bills.");
        v.IsDeleted = true; await _uow.SaveChangesAsync(ct);
    }
}

public class BudgetService : IBudgetService
{
    private readonly IndigoDbContext _db; private readonly IUnitOfWork _uow;
    public BudgetService(IndigoDbContext db, IUnitOfWork uow) { _db = db; _uow = uow; }

    public async Task<PagedResult<BudgetDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Budgets.AsQueryable();
        if (req.Search is not null) query = query.Where(b => b.Name.ToLower().Contains(req.Search.ToLower()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(b => b.FiscalYear).ThenBy(b => b.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(b => new BudgetDto(b.Id, b.Name, null, b.FiscalYear, b.TotalBudget, b.ActualSpend,
                b.TotalBudget - b.ActualSpend,
                b.TotalBudget > 0 ? Math.Round(b.ActualSpend / b.TotalBudget * 100, 1) : 0, b.Status.ToString())).ToListAsync(ct);
        return new PagedResult<BudgetDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<BudgetDto> CreateAsync(CreateBudgetRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Required("name", req.Name, 200);
        v.Money("totalBudget", req.TotalBudget, 0, Validator.MaxBudget, allowZero: false);
        v.Range("fiscalYear", req.FiscalYear, 1950, DateTime.UtcNow.Year + 10);
        if (req.DepartmentId.HasValue && !await _db.Departments.AnyAsync(d => d.Id == req.DepartmentId.Value, ct))
            v.Add("departmentId", "The selected department does not exist.");
        v.ThrowIfInvalid();
        var b = new Domain.Entities.Finance.Budget
        {
            Name = req.Name.Trim(), DepartmentId = req.DepartmentId,
            FiscalYear = req.FiscalYear, TotalBudget = req.TotalBudget,
        };
        await _db.Budgets.AddAsync(b, ct); await _uow.SaveChangesAsync(ct);
        return new BudgetDto(b.Id, b.Name, null, b.FiscalYear, b.TotalBudget, 0, b.TotalBudget, 0, b.Status.ToString());
    }
}

public class AuditService : IAuditService
{
    private readonly IndigoDbContext _db;
    private readonly ICurrentUserService _user;
    public AuditService(IndigoDbContext db, ICurrentUserService user) { _db = db; _user = user; }

    public async Task<PagedResult<AuditLogDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.AuditLogs.AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(a => (a.UserName != null && a.UserName.ToLower().Contains(s))
                || a.Module.ToLower().Contains(s)
                || (a.Description != null && a.Description.ToLower().Contains(s)));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.Timestamp).ThenBy(a => a.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(a => new AuditLogDto(a.Id, a.UserName, a.Action.ToString(), a.Module, a.EntityType, a.EntityId,
                a.Description, a.Timestamp)).ToListAsync(ct);
        return new PagedResult<AuditLogDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    /// <summary>Unknown action names must never take down the calling operation.</summary>
    private static AuditAction ParseAction(string action) =>
        Enum.TryParse<AuditAction>(action, true, out var parsed) ? parsed : AuditAction.Update;

    public void Enqueue(string action, string module, string? entityType, string? entityId, string? description,
        string? oldValues = null, string? newValues = null)
    {
        _db.AuditLogs.Add(new Domain.Entities.Admin.AuditLog
        {
            UserId = _user.UserId, UserName = _user.UserName ?? "System",
            Action = ParseAction(action), Module = module, EntityType = entityType, EntityId = entityId,
            Description = description, OldValues = oldValues, NewValues = newValues, IpAddress = _user.IpAddress,
        });
    }

    public async Task LogAsync(string? userId, string? userName, string action, string module, string? entityType,
        string? entityId, string? description, string? oldValues = null, string? newValues = null, CancellationToken ct = default)
    {
        _db.AuditLogs.Add(new Domain.Entities.Admin.AuditLog
        {
            UserId = userId, UserName = userName, Action = ParseAction(action), Module = module,
            EntityType = entityType, EntityId = entityId, Description = description,
            OldValues = oldValues, NewValues = newValues, IpAddress = _user.IpAddress,
        });
        await _db.SaveChangesAsync(ct);
    }
}
