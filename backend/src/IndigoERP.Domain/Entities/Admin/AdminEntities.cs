using IndigoERP.Domain.Common;
using IndigoERP.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace IndigoERP.Domain.Entities.Admin;

/// <summary>
/// Application user extending ASP.NET Core Identity.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
}

/// <summary>
/// Application role extending ASP.NET Core Identity roles.
/// </summary>
public class ApplicationRole : IdentityRole
{
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // View, Create, Edit, Delete, Approve, Export
    public string? Description { get; set; }

    // Navigation properties
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class RolePermission : BaseEntity
{
    public string RoleId { get; set; } = string.Empty;
    public Guid PermissionId { get; set; }

    // Navigation properties
    public ApplicationRole Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

public class AuditLog : BaseEntity
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public AuditAction Action { get; set; }
    public string Module { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? TaxId { get; set; }
    public string BaseCurrency { get; set; } = "USD";
    public string Timezone { get; set; } = "UTC";
    public string? LogoPath { get; set; }
}

public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Scope { get; set; } = "Organization";
    public string? Description { get; set; }
}
