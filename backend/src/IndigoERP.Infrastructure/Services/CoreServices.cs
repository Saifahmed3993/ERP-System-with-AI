using IndigoERP.Application.Common;
using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.HR;
using IndigoERP.Domain.Enums;
using IndigoERP.Domain.Interfaces;
using IndigoERP.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly ISequenceGenerator _seq;
    private readonly IAuditService _audit;

    public EmployeeService(IndigoDbContext db, IUnitOfWork uow, ISequenceGenerator seq, IAuditService audit)
    { _db = db; _uow = uow; _seq = seq; _audit = audit; }

    private static EmployeeDto Map(Employee e) => new(
        e.Id, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Phone,
        e.Department?.Name ?? string.Empty, e.Position?.Title ?? string.Empty,
        e.EmploymentType.ToString(), e.JoinDate, e.MonthlySalary, e.Status.ToString(),
        e.Location, e.Manager == null ? null : $"{e.Manager.FirstName} {e.Manager.LastName}");

    public async Task<PagedResult<EmployeeDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        // IgnoreQueryFilters on the joined Department/Position would resurrect deleted
        // rows; instead the delete path guarantees no employee references a dead one.
        var query = _db.Employees.Include(e => e.Department).Include(e => e.Position).Include(e => e.Manager).AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(e => e.FirstName.ToLower().Contains(s) || e.LastName.ToLower().Contains(s)
                || e.EmployeeCode.ToLower().Contains(s) || e.Email.ToLower().Contains(s));
        }
        query = req.SortBy?.ToLower() switch
        {
            "name" => req.SortDesc ? query.OrderByDescending(e => e.LastName).ThenByDescending(e => e.FirstName)
                                   : query.OrderBy(e => e.LastName).ThenBy(e => e.FirstName),
            "code" => req.SortDesc ? query.OrderByDescending(e => e.EmployeeCode) : query.OrderBy(e => e.EmployeeCode),
            "department" => req.SortDesc ? query.OrderByDescending(e => e.Department.Name) : query.OrderBy(e => e.Department.Name),
            "position" => req.SortDesc ? query.OrderByDescending(e => e.Position.Title) : query.OrderBy(e => e.Position.Title),
            "salary" => req.SortDesc ? query.OrderByDescending(e => e.MonthlySalary) : query.OrderBy(e => e.MonthlySalary),
            "status" => req.SortDesc ? query.OrderByDescending(e => e.Status) : query.OrderBy(e => e.Status),
            "joindate" => req.SortDesc ? query.OrderByDescending(e => e.JoinDate) : query.OrderBy(e => e.JoinDate),
            // Stable tiebreaker on Id — without it, rows with identical CreatedAt can
            // reshuffle between page requests and appear duplicated or missing.
            _ => req.SortDesc ? query.OrderBy(e => e.CreatedAt).ThenBy(e => e.Id)
                              : query.OrderByDescending(e => e.CreatedAt).ThenBy(e => e.Id),
        };
        var total = await query.CountAsync(ct);
        var items = await query.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToListAsync(ct);
        return new PagedResult<EmployeeDto>
        {
            Items = items.Select(Map).ToList(), TotalCount = total, Page = req.Page, PageSize = req.PageSize,
        };
    }

    public async Task<EmployeeDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var e = await _db.Employees.Include(x => x.Department).Include(x => x.Position).Include(x => x.Manager)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return e == null ? null : Map(e);
    }

    public async Task<EmployeeProfileDto?> GetProfileAsync(Guid id, CancellationToken ct = default)
    {
        var e = await _db.Employees.Include(x => x.Department).Include(x => x.Position).Include(x => x.Manager)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return null;

        var attendance = await _db.Attendances.Where(a => a.EmployeeId == id)
            .OrderByDescending(a => a.Date).Take(60)
            .Select(a => new AttendanceDto(a.Id, e.FirstName + " " + e.LastName, e.EmployeeCode, a.Date,
                a.CheckIn, a.CheckOut, a.WorkingHours, a.OvertimeHours, a.Status.ToString()))
            .ToListAsync(ct);

        var leave = await _db.LeaveRequests.Include(l => l.LeaveType).Where(l => l.EmployeeId == id)
            .OrderByDescending(l => l.StartDate)
            .Select(l => new LeaveRequestDto(l.Id, l.EmployeeId, e.FirstName + " " + e.LastName, l.LeaveType.Name,
                l.StartDate, l.EndDate, l.Duration, l.Reason, l.Status.ToString(), l.ApprovedBy, l.RejectionReason))
            .ToListAsync(ct);

        var balances = await _db.LeaveBalances.Include(b => b.LeaveType).Where(b => b.EmployeeId == id)
            .OrderBy(b => b.LeaveType.Name)
            .Select(b => new LeaveBalanceDto(b.Id, b.EmployeeId, b.LeaveType.Name, b.Year, b.TotalDays, b.UsedDays, b.TotalDays - b.UsedDays))
            .ToListAsync(ct);

        var payrolls = await _db.Payrolls.Include(p => p.PayrollPeriod).Where(p => p.EmployeeId == id)
            .OrderByDescending(p => p.PayrollPeriod.EndDate)
            .Select(p => new PayrollDto(p.Id, p.EmployeeId, e.FirstName + " " + e.LastName, e.EmployeeCode,
                p.PayrollPeriod.Name, p.BasicSalary, p.Allowances, p.OvertimePay, p.Bonuses, p.GrossSalary,
                p.Deductions, p.Taxes, p.BenefitsDeduction, p.NetSalary, p.Status.ToString()))
            .ToListAsync(ct);

        var benefits = await _db.EmployeeBenefits.Include(b => b.Benefit).Where(b => b.EmployeeId == id)
            .Select(b => new EmployeeBenefitDto(b.Id, b.BenefitId, b.Benefit.PlanName, b.Benefit.Provider,
                b.Benefit.EmployeeCostMonthly, b.Benefit.EmployerCostMonthly, b.EnrollmentDate, b.IsActive))
            .ToListAsync(ct);

        var docs = await _db.EmployeeDocuments.Where(d => d.EmployeeId == id)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new EmployeeDocumentDto(d.Id, d.Title, d.EmployeeId, e.FirstName + " " + e.LastName,
                d.Category.ToString(), d.FileName, d.FileSize, d.ExpirationDate, d.Status.ToString(), d.CreatedAt))
            .ToListAsync(ct);

        var reviews = await _db.PerformanceReviews.Include(r => r.Reviewer).Where(r => r.EmployeeId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new PerformanceReviewDto(r.Id, r.EmployeeId, e.FirstName + " " + e.LastName, r.ReviewPeriod,
                r.Score, r.GoalsCompletePercent,
                r.Reviewer == null ? null : r.Reviewer.FirstName + " " + r.Reviewer.LastName,
                r.Status.ToString(), r.Comments))
            .ToListAsync(ct);

        var employment = new EmploymentDetailDto(e.EmployeeCode, e.Department?.Name ?? string.Empty,
            e.Position?.Title ?? string.Empty, e.EmploymentType.ToString(), e.JoinDate, e.TerminationDate,
            e.Status.ToString(), e.Location, e.Manager == null ? null : $"{e.Manager.FirstName} {e.Manager.LastName}",
            e.CostCenter, e.MonthlySalary);

        return new EmployeeProfileDto(Map(e), employment, attendance, leave, balances, payrolls, benefits, docs, reviews);
    }

    /// <summary>
    /// Validates every field the client can influence, including the existence of
    /// every foreign key. Without the FK checks a bad id reaches SQL Server and
    /// surfaces as an opaque 500 instead of an actionable 400.
    /// </summary>
    private async Task ValidateAsync(Validator v, string firstName, string lastName, string email, string? phone,
        Guid departmentId, Guid positionId, Guid? managerId, decimal salary, Guid? excludeId, CancellationToken ct)
    {
        v.Name("firstName", firstName).Name("lastName", lastName).Email("email", email).OptionalPhone("phone", phone);
        v.Money("monthlySalary", salary, 0, Validator.MaxMonthlySalary, allowZero: false);

        if (!v.HasErrors || true)
        {
            var normalizedEmail = email?.Trim().ToLower();
            if (!string.IsNullOrEmpty(normalizedEmail) &&
                await _db.Employees.AnyAsync(e => e.Email.ToLower() == normalizedEmail && (excludeId == null || e.Id != excludeId), ct))
                v.Add("email", "Another employee already uses this email address.");

            if (departmentId == Guid.Empty) v.Add("departmentId", "Department is required.");
            else if (!await _db.Departments.AnyAsync(d => d.Id == departmentId, ct))
                v.Add("departmentId", "The selected department does not exist.");

            if (positionId == Guid.Empty) v.Add("positionId", "Position is required.");
            else if (!await _db.Positions.AnyAsync(p => p.Id == positionId, ct))
                v.Add("positionId", "The selected position does not exist.");
            else if (departmentId != Guid.Empty &&
                     !await _db.Positions.AnyAsync(p => p.Id == positionId && p.DepartmentId == departmentId, ct))
                v.Add("positionId", "The selected position does not belong to the selected department.");

            if (managerId.HasValue)
            {
                if (excludeId.HasValue && managerId.Value == excludeId.Value)
                    v.Add("managerId", "An employee cannot be their own manager.");
                else if (!await _db.Employees.AnyAsync(e => e.Id == managerId.Value, ct))
                    v.Add("managerId", "The selected manager does not exist.");
                else if (excludeId.HasValue && await IsInManagementChainAsync(managerId.Value, excludeId.Value, ct))
                    v.Add("managerId", "That manager reports to this employee — the reporting line would form a cycle.");
            }
        }
    }

    /// <summary>Walks up the reporting line looking for <paramref name="target"/>.</summary>
    private async Task<bool> IsInManagementChainAsync(Guid startId, Guid target, CancellationToken ct)
    {
        var seen = new HashSet<Guid>();
        Guid? current = startId;
        while (current.HasValue && seen.Add(current.Value))
        {
            if (current.Value == target) return true;
            current = await _db.Employees.Where(e => e.Id == current!.Value).Select(e => e.ManagerId).FirstOrDefaultAsync(ct);
        }
        return false;
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.TryEnum<EmploymentType>("employmentType", req.EmploymentType, out var employmentType);
        v.WorkDate("joinDate", req.JoinDate);
        await ValidateAsync(v, req.FirstName, req.LastName, req.Email, req.Phone,
            req.DepartmentId, req.PositionId, req.ManagerId, req.MonthlySalary, null, ct);
        v.ThrowIfInvalid();

        var emp = new Employee
        {
            EmployeeCode = await _seq.NextAsync("EMP", ct),
            FirstName = req.FirstName.Trim(), LastName = req.LastName.Trim(), Email = req.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            DepartmentId = req.DepartmentId, PositionId = req.PositionId,
            EmploymentType = employmentType, JoinDate = req.JoinDate.Date, MonthlySalary = req.MonthlySalary,
            Location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim(),
            ManagerId = req.ManagerId,
        };
        await _db.Employees.AddAsync(emp, ct);

        // Provision this year's leave entitlement so balance rules are enforceable
        // from day one rather than silently skipped for lack of a balance row.
        var year = DateTime.UtcNow.Year;
        var leaveTypes = await _db.LeaveTypes.Where(t => t.IsActive).ToListAsync(ct);
        foreach (var type in leaveTypes)
        {
            _db.LeaveBalances.Add(new LeaveBalance
            {
                EmployeeId = emp.Id, LeaveTypeId = type.Id, Year = year,
                TotalDays = type.DefaultDaysPerYear, UsedDays = 0,
            });
        }

        _audit.Enqueue("Create", "Employees", nameof(Employee), emp.Id.ToString(),
            $"Created employee {emp.EmployeeCode} ({emp.FirstName} {emp.LastName})");

        try { await _uow.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new ConflictException("An employee with this email or employee code already exists.");
        }
        return (await GetByIdAsync(emp.Id, ct))!;
    }

    public async Task<EmployeeDto> UpdateAsync(Guid id, UpdateEmployeeRequest req, CancellationToken ct = default)
    {
        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("Employee not found.");

        var v = new Validator();
        v.TryEnum<EmploymentType>("employmentType", req.EmploymentType, out var employmentType);
        v.TryEnum<EmployeeStatus>("status", req.Status, out var status);
        await ValidateAsync(v, req.FirstName, req.LastName, req.Email, req.Phone,
            req.DepartmentId, req.PositionId, req.ManagerId, req.MonthlySalary, id, ct);
        v.ThrowIfInvalid();

        var before = $"{emp.FirstName} {emp.LastName} | {emp.Email} | {emp.MonthlySalary} | {emp.Status}";

        emp.FirstName = req.FirstName.Trim();
        emp.LastName = req.LastName.Trim();
        emp.Email = req.Email.Trim();
        emp.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
        emp.DepartmentId = req.DepartmentId;
        emp.PositionId = req.PositionId;
        emp.EmploymentType = employmentType;
        emp.MonthlySalary = req.MonthlySalary;
        emp.Location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim();
        emp.ManagerId = req.ManagerId;
        emp.Status = status;
        // Keep the termination date consistent with the status rather than leaving
        // a terminated employee with no leaving date.
        if (status == EmployeeStatus.Terminated) emp.TerminationDate ??= DateTime.UtcNow.Date;
        else emp.TerminationDate = null;

        _audit.Enqueue("Update", "Employees", nameof(Employee), emp.Id.ToString(),
            $"Updated employee {emp.EmployeeCode}", before,
            $"{emp.FirstName} {emp.LastName} | {emp.Email} | {emp.MonthlySalary} | {emp.Status}");

        try { await _uow.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("This employee was modified by someone else while you were editing. Reload and try again.");
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new ConflictException("Another employee already uses this email address.");
        }
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("Employee not found.");

        // Refuse to orphan direct reports or leave a department pointing at a deleted manager.
        if (await _db.Employees.AnyAsync(e => e.ManagerId == id, ct))
            throw new ConflictException("This employee still manages other employees. Reassign their reports first.");
        if (await _db.Departments.AnyAsync(d => d.ManagerId == id, ct))
            throw new ConflictException("This employee is set as a department manager. Reassign the department first.");

        emp.IsDeleted = true;
        emp.Status = EmployeeStatus.Terminated;
        emp.TerminationDate ??= DateTime.UtcNow.Date;

        _audit.Enqueue("Delete", "Employees", nameof(Employee), id.ToString(),
            $"Deactivated employee {emp.EmployeeCode} ({emp.FirstName} {emp.LastName})");
        await _uow.SaveChangesAsync(ct);
    }

    internal static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException?.Message is string m && (m.Contains("duplicate key") || m.Contains("UNIQUE KEY"));
}

public class DepartmentService : IDepartmentService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public DepartmentService(IndigoDbContext db, IUnitOfWork uow, IAuditService audit)
    { _db = db; _uow = uow; _audit = audit; }

    public async Task<PagedResult<DepartmentDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = _db.Departments.Include(d => d.Manager).Include(d => d.Employees).AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(d => d.Name.ToLower().Contains(s) || (d.Description != null && d.Description.ToLower().Contains(s)));
        }
        query = req.SortBy?.ToLower() switch
        {
            "budget" => req.SortDesc ? query.OrderByDescending(d => d.AnnualBudget) : query.OrderBy(d => d.AnnualBudget),
            _ => req.SortDesc ? query.OrderByDescending(d => d.Name) : query.OrderBy(d => d.Name),
        };
        var total = await query.CountAsync(ct);
        var items = await query.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(d => new DepartmentDto(d.Id, d.Name, d.Description,
                d.Manager != null ? d.Manager.FirstName + " " + d.Manager.LastName : null,
                d.AnnualBudget, d.Employees.Count(e => !e.IsDeleted), d.IsActive))
            .ToListAsync(ct);
        return new PagedResult<DepartmentDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<DepartmentDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var d = await _db.Departments.Include(x => x.Manager).Include(x => x.Employees).FirstOrDefaultAsync(x => x.Id == id, ct);
        return d == null ? null : new DepartmentDto(d.Id, d.Name, d.Description,
            d.Manager != null ? d.Manager.FirstName + " " + d.Manager.LastName : null,
            d.AnnualBudget, d.Employees.Count(e => !e.IsDeleted), d.IsActive);
    }

    private async Task ValidateAsync(Validator v, string name, Guid? managerId, decimal budget, Guid? excludeId, CancellationToken ct)
    {
        v.Name("name", name, 200);
        v.Money("annualBudget", budget, 0, Validator.MaxBudget);
        var normalized = name?.Trim().ToLower();
        if (!string.IsNullOrEmpty(normalized) &&
            await _db.Departments.AnyAsync(d => d.Name.ToLower() == normalized && (excludeId == null || d.Id != excludeId), ct))
            v.Add("name", "A department with this name already exists.");
        if (managerId.HasValue && !await _db.Employees.AnyAsync(e => e.Id == managerId.Value, ct))
            v.Add("managerId", "The selected manager does not exist.");
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        await ValidateAsync(v, req.Name, req.ManagerId, req.AnnualBudget, null, ct);
        v.ThrowIfInvalid();

        var dept = new Department
        {
            Name = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            ManagerId = req.ManagerId, AnnualBudget = req.AnnualBudget,
        };
        await _db.Departments.AddAsync(dept, ct);
        _audit.Enqueue("Create", "Departments", nameof(Department), dept.Id.ToString(), $"Created department {dept.Name}");
        try { await _uow.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (EmployeeService.IsUniqueViolation(ex))
        {
            throw new ConflictException("A department with this name already exists.");
        }
        return (await GetByIdAsync(dept.Id, ct))!;
    }

    public async Task<DepartmentDto> UpdateAsync(Guid id, UpdateDepartmentRequest req, CancellationToken ct = default)
    {
        var dept = await _db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department not found.");
        var v = new Validator();
        await ValidateAsync(v, req.Name, req.ManagerId, req.AnnualBudget, id, ct);
        v.ThrowIfInvalid();

        // Deactivating a department that still staffs people would leave those
        // employees attached to an inactive org unit.
        if (!req.IsActive && await _db.Employees.AnyAsync(e => e.DepartmentId == id, ct))
            throw new ConflictException("Cannot deactivate a department that still has employees assigned.");

        var before = $"{dept.Name} | {dept.AnnualBudget} | active={dept.IsActive}";
        dept.Name = req.Name.Trim();
        dept.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        dept.ManagerId = req.ManagerId;
        dept.AnnualBudget = req.AnnualBudget;
        dept.IsActive = req.IsActive;
        _audit.Enqueue("Update", "Departments", nameof(Department), id.ToString(), $"Updated department {dept.Name}",
            before, $"{dept.Name} | {dept.AnnualBudget} | active={dept.IsActive}");
        try { await _uow.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (EmployeeService.IsUniqueViolation(ex))
        {
            throw new ConflictException("A department with this name already exists.");
        }
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var dept = await _db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department not found.");

        var employeeCount = await _db.Employees.CountAsync(e => e.DepartmentId == id, ct);
        if (employeeCount > 0)
            throw new ConflictException($"Cannot delete this department — {employeeCount} employee(s) are still assigned to it.");
        var positionCount = await _db.Positions.CountAsync(p => p.DepartmentId == id, ct);
        if (positionCount > 0)
            throw new ConflictException($"Cannot delete this department — {positionCount} position(s) still belong to it.");
        if (await _db.JobOpenings.AnyAsync(j => j.DepartmentId == id, ct))
            throw new ConflictException("Cannot delete this department — job openings still reference it.");

        dept.IsDeleted = true;
        dept.IsActive = false;
        _audit.Enqueue("Delete", "Departments", nameof(Department), id.ToString(), $"Deleted department {dept.Name}");
        await _uow.SaveChangesAsync(ct);
    }
}

public class DashboardService : IDashboardService
{
    private readonly IndigoDbContext _db;

    public DashboardService(IndigoDbContext db) => _db = db;

    public async Task<HrDashboardDto> GetHrDashboardAsync(CancellationToken ct = default)
    {
        var total = await _db.Employees.CountAsync(ct);
        var active = await _db.Employees.CountAsync(e => e.Status == EmployeeStatus.Active, ct);
        var onLeave = await _db.Employees.CountAsync(e => e.Status == EmployeeStatus.OnLeave, ct);
        var newHires = await _db.Employees.CountAsync(e => e.JoinDate.Year == 2026, ct);
        var exits = await _db.Employees.CountAsync(e => e.TerminationDate != null && e.TerminationDate.Value.Year == 2026, ct);

        // Fetch metrics stored in the db
        var attRate = await _db.Attendances.AverageAsync(a => (decimal?)a.WorkingHours, ct) ?? 0;
        var leaveDays = await _db.LeaveRequests.SumAsync(l => (decimal?)l.Duration, ct) ?? 0;
        var overtime = await _db.Attendances.SumAsync(a => (decimal?)a.OvertimeHours, ct) ?? 0;
        var payroll = await _db.Payrolls.SumAsync(p => (decimal?)p.GrossSalary, ct) ?? 0;
        var perfScore = await _db.PerformanceReviews.AverageAsync(p => (decimal?)p.Score, ct) ?? 0;
        var openPos = await _db.JobOpenings.CountAsync(j => j.IsActive, ct);
        
        var turnover = total > 0 ? Math.Round((decimal)exits / total * 100, 2) : 0;

        // Trends
        var trendData = await _db.Employees
            .Where(e => e.JoinDate.Year == 2026)
            .GroupBy(e => new { e.JoinDate.Year, e.JoinDate.Month })
            .Select(g => new ChartPoint($"{g.Key.Year}-{g.Key.Month:D2}", g.Count()))
            .ToListAsync(ct);

        var deptData = await _db.Employees
            .Include(e => e.Department)
            .GroupBy(e => e.Department.Name)
            .Select(g => new ChartPoint(g.Key, g.Count()))
            .ToListAsync(ct);

        return new HrDashboardDto(
            total, active, onLeave, newHires, exits, 
            Math.Round(attRate, 2), leaveDays, overtime, payroll, Math.Round(perfScore, 1), 
            openPos, turnover, 
            trendData.OrderBy(x => x.Label).ToList(), 
            deptData
        );
    }

    public async Task<FinanceDashboardDto> GetFinanceDashboardAsync(CancellationToken ct = default)
    {
        var revenue = await _db.Accounts.Where(a => a.Type == AccountType.Revenue).SumAsync(a => a.Balance, ct);
        var expenses = await _db.Accounts.Where(a => a.Type == AccountType.Expense).SumAsync(a => a.Balance, ct);
        var netProfit = revenue + expenses;
        var cash = await _db.Accounts.Where(a => a.Code.StartsWith("1") && (a.Name.Contains("Cash") || a.Name.Contains("Bank"))).SumAsync(a => a.Balance, ct);
        var receivables = await _db.Invoices.Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled).SumAsync(i => i.Balance, ct);
        var payables = await _db.Bills.Where(b => b.Status != InvoiceStatus.Paid && b.Status != InvoiceStatus.Cancelled).SumAsync(b => b.Balance, ct);
        var txCount = await _db.JournalEntries.CountAsync(ct);

        var revTrend = await _db.JournalLines
            .Include(j => j.JournalEntry)
            .Include(j => j.Account)
            .Where(j => j.Account.Type == AccountType.Revenue)
            .GroupBy(j => new { j.JournalEntry.EntryDate.Year, j.JournalEntry.EntryDate.Month })
            .Select(g => new ChartPoint($"{g.Key.Year}-{g.Key.Month:D2}", g.Sum(x => x.Credit - x.Debit)))
            .ToListAsync(ct);

        var expTrend = await _db.JournalLines
            .Include(j => j.JournalEntry)
            .Include(j => j.Account)
            .Where(j => j.Account.Type == AccountType.Expense)
            .GroupBy(j => new { j.JournalEntry.EntryDate.Year, j.JournalEntry.EntryDate.Month })
            .Select(g => new ChartPoint($"{g.Key.Year}-{g.Key.Month:D2}", g.Sum(x => x.Debit - x.Credit)))
            .ToListAsync(ct);

        var expByCat = await _db.JournalLines
            .Include(j => j.Account)
            .Where(j => j.Account.Type == AccountType.Expense)
            .GroupBy(j => j.Account.Name)
            .Select(g => new ChartPoint(g.Key, g.Sum(x => x.Debit - x.Credit)))
            .ToListAsync(ct);

        return new FinanceDashboardDto(
            revenue, expenses, netProfit, cash, receivables, payables, 
            12.4m, -5.2m, 0, txCount,
            revTrend.OrderBy(x => x.Label).ToList(), 
            expTrend.OrderBy(x => x.Label).ToList(),
            expByCat.OrderByDescending(x => x.Value).ToList()
        );
    }
}
