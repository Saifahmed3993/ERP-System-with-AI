using IndigoERP.Application.Common;
using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Domain.Entities.Finance;
using IndigoERP.Domain.Enums;
using IndigoERP.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.API.Controllers;

[ApiController]
[Authorize]
public class AdminExtendedController(
    IndigoDbContext db,
    RoleManager<ApplicationRole> roleManager,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    // ==========================================
    // ROLES & PERMISSIONS
    // ==========================================

    [HttpGet("api/admin/roles"), Authorize(Policy = "Roles.View")]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var roles = await roleManager.Roles.OrderBy(r => r.Name).ToListAsync(ct);
        var roleUsersCount = new Dictionary<string, int>();

        foreach (var r in roles)
        {
            var inRole = await userManager.GetUsersInRoleAsync(r.Name!);
            roleUsersCount[r.Name!] = inRole.Count;
        }

        var result = roles.Select(r => new
        {
            id = r.Id,
            name = r.Name,
            description = r.Description,
            createdAt = r.CreatedAt,
            userCount = roleUsersCount.GetValueOrDefault(r.Name!, 0),
            permissions = Permissions.RoleGrants.TryGetValue(r.Name!, out var p) ? p : Array.Empty<string>()
        });

        return Ok(result);
    }

    [HttpGet("api/admin/permissions"), Authorize(Policy = "Roles.View")]
    public IActionResult GetPermissions()
    {
        var grouped = Permissions.Modules.Select(m => new
        {
            module = m,
            actions = Permissions.Actions.Select(a => $"{m}.{a}").ToList()
        });

        return Ok(new
        {
            total = Permissions.All.Count(),
            modules = grouped
        });
    }

    // ==========================================
    // SYSTEM SETTINGS & COMPANY
    // ==========================================

    [HttpGet("api/admin/settings"), Authorize(Policy = "Settings.View")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var company = await db.Companies.FirstOrDefaultAsync(ct) ?? new Company
        {
            Name = "Indigo Ventures ERP",
            TaxId = "TAX-2026-9938",
            BaseCurrency = "USD",
            Email = "support@indigo.co",
            Phone = "+1 (555) 019-2834",
            Address = "100 Innovation Boulevard, Tech Park",
            Timezone = "UTC"
        };

        var settings = await db.SystemSettings.Where(s => !s.IsDeleted).ToListAsync(ct);
        var settingsDict = settings.ToDictionary(s => s.Key, s => s.Value);

        return Ok(new
        {
            company = new
            {
                name = company.Name,
                taxId = company.TaxId,
                baseCurrency = company.BaseCurrency,
                email = company.Email,
                phone = company.Phone,
                address = company.Address,
                timezone = company.Timezone
            },
            settings = new
            {
                fiscalYearStart = settingsDict.GetValueOrDefault("FiscalYearStart", "01-01"),
                payrollCutoffDay = int.TryParse(settingsDict.GetValueOrDefault("PayrollCutoffDay", "25"), out var pcd) ? pcd : 25,
                defaultLeaveDays = int.TryParse(settingsDict.GetValueOrDefault("DefaultLeaveDays", "21"), out var dld) ? dld : 21,
                workHoursPerDay = decimal.TryParse(settingsDict.GetValueOrDefault("WorkHoursPerDay", "8"), out var wh) ? wh : 8m,
                autoPostPayroll = bool.TryParse(settingsDict.GetValueOrDefault("AutoPostPayroll", "false"), out var app) ? app : false,
                requireTwoApprovals = bool.TryParse(settingsDict.GetValueOrDefault("RequireTwoApprovals", "true"), out var rta) ? rta : true
            }
        });
    }

    [HttpPost("api/admin/settings"), Authorize(Policy = "Settings.Edit")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsDto dto, CancellationToken ct)
    {
        var company = await db.Companies.FirstOrDefaultAsync(ct);
        if (company == null)
        {
            company = new Company();
            db.Companies.Add(company);
        }

        if (dto.Company != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.Company.Name)) company.Name = dto.Company.Name;
            if (!string.IsNullOrWhiteSpace(dto.Company.TaxId)) company.TaxId = dto.Company.TaxId;
            if (!string.IsNullOrWhiteSpace(dto.Company.BaseCurrency)) company.BaseCurrency = dto.Company.BaseCurrency;
            if (!string.IsNullOrWhiteSpace(dto.Company.Email)) company.Email = dto.Company.Email;
            if (!string.IsNullOrWhiteSpace(dto.Company.Phone)) company.Phone = dto.Company.Phone;
            if (!string.IsNullOrWhiteSpace(dto.Company.Address)) company.Address = dto.Company.Address;
            if (!string.IsNullOrWhiteSpace(dto.Company.Timezone)) company.Timezone = dto.Company.Timezone;
        }

        if (dto.Settings != null)
        {
            foreach (var kvp in dto.Settings)
            {
                var existing = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == kvp.Key, ct);
                if (existing == null)
                {
                    db.SystemSettings.Add(new SystemSetting { Key = kvp.Key, Value = kvp.Value?.ToString() ?? "", Scope = "Organization" });
                }
                else
                {
                    existing.Value = kvp.Value?.ToString() ?? "";
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Settings updated successfully." });
    }

    // ==========================================
    // TAX RATES (FINANCE)
    // ==========================================

    [HttpGet("api/finance/tax"), Authorize(Policy = "Accounts.View")]
    public async Task<IActionResult> GetTaxRates(CancellationToken ct)
    {
        var taxes = await db.TaxRates.Where(t => !t.IsDeleted).OrderByDescending(t => t.Rate).ToListAsync(ct);
        if (taxes.Count == 0)
        {
            // Seed default standard rates if none exist
            var defaults = new[]
            {
                new TaxRate { Name = "Standard VAT", Rate = 15.00m, Category = TaxCategory.Sales, IsActive = true, Description = "Standard Value Added Tax on sales and services" },
                new TaxRate { Name = "Reduced VAT", Rate = 5.00m, Category = TaxCategory.Sales, IsActive = true, Description = "Reduced rate for essential goods and food items" },
                new TaxRate { Name = "Withholding Tax", Rate = 5.00m, Category = TaxCategory.Services, IsActive = true, Description = "Withheld on consulting and professional services" },
                new TaxRate { Name = "Zero Rated / Exempt", Rate = 0.00m, Category = TaxCategory.Exports, IsActive = true, Description = "Exported goods and qualifying international transactions" },
            };
            db.TaxRates.AddRange(defaults);
            await db.SaveChangesAsync(ct);
            taxes = defaults.ToList();
        }

        return Ok(taxes.Select(t => new
        {
            id = t.Id,
            name = t.Name,
            rate = t.Rate,
            category = t.Category.ToString(),
            isActive = t.IsActive,
            description = t.Description
        }));
    }

    [HttpPost("api/finance/tax"), Authorize(Policy = "Accounts.Create")]
    public async Task<IActionResult> CreateTaxRate([FromBody] CreateTaxRateDto dto, CancellationToken ct)
    {
        var tax = new TaxRate
        {
            Name = dto.Name,
            Rate = dto.Rate,
            Category = Enum.TryParse<TaxCategory>(dto.Category, true, out var cat) ? cat : TaxCategory.Sales,
            IsActive = dto.IsActive,
            Description = dto.Description
        };
        db.TaxRates.Add(tax);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, tax);
    }

    [HttpDelete("api/finance/tax/{id:guid}"), Authorize(Policy = "Accounts.Delete")]
    public async Task<IActionResult> DeleteTaxRate(Guid id, CancellationToken ct)
    {
        var tax = await db.TaxRates.FindAsync([id], ct);
        if (tax == null) return NotFound();
        tax.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public class UpdateSettingsDto
{
    public CompanyDto? Company { get; set; }
    public Dictionary<string, object>? Settings { get; set; }
}

public class CompanyDto
{
    public string? Name { get; set; }
    public string? TaxId { get; set; }
    public string? BaseCurrency { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Timezone { get; set; }
}

public class CreateTaxRateDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public string Category { get; set; } = "Sales";
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}
