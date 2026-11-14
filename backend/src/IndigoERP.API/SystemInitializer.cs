using IndigoERP.Application.Common;
using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.API;

/// <summary>
/// Initializes the system with required roles, permissions, role grants, leave types
/// and a configurable admin account. This is NOT fake business data — it is the
/// configuration the module cannot operate without.
/// </summary>
public class SystemInitializer
{
    private readonly IServiceProvider _sp;
    private readonly IConfiguration _config;

    public SystemInitializer(IServiceProvider sp, IConfiguration config)
    {
        _sp = sp; _config = config;
    }

    public async Task InitializeAsync()
    {
        var db = _sp.GetRequiredService<IndigoDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = _sp.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = _sp.GetRequiredService<UserManager<ApplicationUser>>();

        // System roles
        foreach (var role in Permissions.RoleGrants.Keys)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new ApplicationRole { Name = role, Description = $"{role} role" });
        }

        // System permissions — reconciled rather than created once, so newly added
        // modules/actions appear on an existing database too.
        var existingPermissions = await db.Permissions.ToDictionaryAsync(p => p.Name, p => p);
        foreach (var name in Permissions.All)
        {
            if (existingPermissions.ContainsKey(name)) continue;
            var parts = name.Split('.');
            var permission = new Permission { Name = name, Module = parts[0], Action = parts[1] };
            db.Permissions.Add(permission);
            existingPermissions[name] = permission;
        }
        await db.SaveChangesAsync();

        // Role → permission grants. Previously 114 permissions were seeded but never
        // mapped to a role and never enforced, so every authenticated user had full
        // access to salary and payroll data.
        var roles = await roleManager.Roles.ToListAsync();
        var existingGrants = await db.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId }).ToListAsync();
        var grantSet = existingGrants.Select(g => (g.RoleId, g.PermissionId)).ToHashSet();

        foreach (var role in roles)
        {
            if (!Permissions.RoleGrants.TryGetValue(role.Name!, out var granted)) continue;
            foreach (var permissionName in granted)
            {
                if (!existingPermissions.TryGetValue(permissionName, out var permission)) continue;
                if (grantSet.Contains((role.Id, permission.Id))) continue;
                db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
                grantSet.Add((role.Id, permission.Id));
            }
        }
        await db.SaveChangesAsync();

        // Leave types are required configuration: without them no leave request can
        // be created and no balance can be enforced.
        if (!await db.LeaveTypes.AnyAsync())
        {
            db.LeaveTypes.AddRange(
                new Domain.Entities.HR.LeaveType { Name = "Annual Leave", Description = "Paid annual vacation entitlement", DefaultDaysPerYear = 21, IsPaid = true },
                new Domain.Entities.HR.LeaveType { Name = "Sick Leave", Description = "Paid medical leave", DefaultDaysPerYear = 10, IsPaid = true },
                new Domain.Entities.HR.LeaveType { Name = "Unpaid Leave", Description = "Approved leave without pay", DefaultDaysPerYear = 30, IsPaid = false },
                new Domain.Entities.HR.LeaveType { Name = "Maternity Leave", Description = "Statutory maternity leave", DefaultDaysPerYear = 90, IsPaid = true },
                new Domain.Entities.HR.LeaveType { Name = "Compassionate Leave", Description = "Bereavement and family emergencies", DefaultDaysPerYear = 5, IsPaid = true });
            await db.SaveChangesAsync();
        }

        // Configurable admin account
        var adminEmail = _config["Admin:Email"] ?? Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? "admin@indigo.co";
        var adminPassword = _config["Admin:Password"] ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Admin@123456";

        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Saif AlDin Ahmed",
                Department = "Operations",
                EmailConfirmed = true,
                IsActive = true
            };
            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded) await userManager.AddToRoleAsync(admin, "Administrator");
        }

        // Viewer account (Read-only access)
        var viewerEmail = "viewer@indigo.co";
        var viewerPassword = "Viewer@123456";
        if (await userManager.FindByEmailAsync(viewerEmail) == null)
        {
            var viewer = new ApplicationUser
            {
                UserName = viewerEmail,
                Email = viewerEmail,
                FullName = "Viewer User",
                Department = "Auditing & Inspection",
                EmailConfirmed = true,
                IsActive = true
            };
            var result = await userManager.CreateAsync(viewer, viewerPassword);
            if (result.Succeeded) await userManager.AddToRoleAsync(viewer, "Viewer");
        }

        // Minimal foundational records so a fresh install has a valid org to attach to.
        if (!await db.Departments.AnyAsync())
        {
            var dept = new Domain.Entities.HR.Department { Name = "Head Office", Description = "Default organisational unit" };
            db.Departments.Add(dept);
            await db.SaveChangesAsync();

            db.Positions.Add(new Domain.Entities.HR.Position
            {
                Title = "Staff", DepartmentId = dept.Id, Description = "Default position", MinSalary = 1000, MaxSalary = 5000,
            });
            await db.SaveChangesAsync();
        }

        if (!await db.Accounts.AnyAsync())
        {
            db.Accounts.Add(new Domain.Entities.Finance.Account
            {
                Code = "1000", Name = "Cash", Type = Domain.Enums.AccountType.Asset, Description = "Cash on hand",
            });
            await db.SaveChangesAsync();
        }

        // Backfill leave balances for employees created before leave types existed,
        // so the balance rule applies to the whole workforce, not just new hires.
        var year = DateTime.UtcNow.Year;
        var leaveTypes = await db.LeaveTypes.Where(t => t.IsActive).ToListAsync();
        var employeeIds = await db.Employees.Select(e => e.Id).ToListAsync();
        if (leaveTypes.Count > 0 && employeeIds.Count > 0)
        {
            var have = await db.LeaveBalances.Where(b => b.Year == year)
                .Select(b => new { b.EmployeeId, b.LeaveTypeId }).ToListAsync();
            var haveSet = have.Select(h => (h.EmployeeId, h.LeaveTypeId)).ToHashSet();
            var added = 0;
            foreach (var employeeId in employeeIds)
            {
                foreach (var type in leaveTypes)
                {
                    if (haveSet.Contains((employeeId, type.Id))) continue;
                    db.LeaveBalances.Add(new Domain.Entities.HR.LeaveBalance
                    {
                        EmployeeId = employeeId, LeaveTypeId = type.Id, Year = year,
                        TotalDays = type.DefaultDaysPerYear, UsedDays = 0,
                    });
                    added++;
                }
            }
            if (added > 0) await db.SaveChangesAsync();
        }
    }
}
