using System.Security.Claims;
using IndigoERP.Application.Common;
using Microsoft.AspNetCore.Authorization;

namespace IndigoERP.API.Authorization;

/// <summary>Requires that the caller's roles grant a specific "Module.Action" permission.</summary>
public class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}

/// <summary>
/// Resolves the caller's role claims against <see cref="Permissions.RoleGrants"/>.
/// Endpoints are guarded server-side, so hiding a button in the UI is a convenience,
/// never the security boundary.
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true) return Task.CompletedTask;

        var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        foreach (var role in roles)
        {
            if (Permissions.RoleGrants.TryGetValue(role, out var granted) && granted.Contains(requirement.Permission))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }
        }
        return Task.CompletedTask;
    }
}

public static class PermissionPolicyExtensions
{
    /// <summary>Registers one policy per known permission so controllers can name them directly.</summary>
    public static AuthorizationOptions AddPermissionPolicies(this AuthorizationOptions options)
    {
        foreach (var permission in Permissions.All)
            options.AddPolicy(permission, policy => policy.Requirements.Add(new PermissionRequirement(permission)));
        return options;
    }
}
