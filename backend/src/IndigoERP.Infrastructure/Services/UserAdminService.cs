using IndigoERP.Application.Common;
using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Domain.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.Infrastructure.Services;

/// <summary>
/// User provisioning. Without this there is no way to create a non-administrator
/// account, which makes the role/permission model untestable and unusable.
/// </summary>
public class UserAdminService(
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager,
    IAuditService audit) : IUserAdminService
{
    public async Task<PagedResult<UserSummaryDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        req = req.Normalized();
        var query = userManager.Users.AsQueryable();
        if (req.Search is not null)
        {
            var s = req.Search.ToLower();
            query = query.Where(u => u.Email!.ToLower().Contains(s) || u.FullName.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var users = await query.OrderBy(u => u.Email).ThenBy(u => u.Id)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToListAsync(ct);

        var items = new List<UserSummaryDto>(users.Count);
        foreach (var u in users)
            items.Add(new UserSummaryDto(u.Id, u.Email!, u.FullName, u.Department,
                await userManager.GetRolesAsync(u), u.IsActive, u.LastLoginAt));

        return new PagedResult<UserSummaryDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<UserSummaryDto> CreateAsync(CreateUserRequest req, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Email("email", req.Email).Name("fullName", req.FullName, 200).Required("password", req.Password, 128);
        v.Required("role", req.Role, 100);
        v.ThrowIfInvalid();

        var role = req.Role.Trim();
        if (!await roleManager.RoleExistsAsync(role))
            throw new ValidationException($"Role '{role}' does not exist. Available roles: {string.Join(", ", roleManager.Roles.Select(r => r.Name))}.");

        if (await userManager.FindByEmailAsync(req.Email.Trim()) != null)
            throw new ConflictException("A user with this email address already exists.");

        var user = new ApplicationUser
        {
            UserName = req.Email.Trim(), Email = req.Email.Trim(), FullName = req.FullName.Trim(),
            Department = string.IsNullOrWhiteSpace(req.Department) ? null : req.Department.Trim(),
            EmailConfirmed = true, IsActive = true,
        };
        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            throw new ValidationException(string.Join(" ", result.Errors.Select(e => e.Description)));

        var roleResult = await userManager.AddToRoleAsync(user, role);
        if (!roleResult.Succeeded)
        {
            // Don't leave a user with no role — they would authenticate but be able
            // to do nothing, with no way to tell why.
            await userManager.DeleteAsync(user);
            throw new ValidationException(string.Join(" ", roleResult.Errors.Select(e => e.Description)));
        }

        await audit.LogAsync(user.Id, user.FullName, "Create", "Users", nameof(ApplicationUser), user.Id,
            $"Provisioned user {user.Email} with role {role}", ct: ct);

        return new UserSummaryDto(user.Id, user.Email!, user.FullName, user.Department, [role], user.IsActive, null);
    }

    public async Task<UserSummaryDto> UpdateAsync(string id, UpdateUserRequest req, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(id) ?? throw new NotFoundException("User not found.");

        if (!string.IsNullOrWhiteSpace(req.FullName))
            user.FullName = req.FullName.Trim();

        if (req.Department != null)
            user.Department = string.IsNullOrWhiteSpace(req.Department) ? null : req.Department.Trim();

        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            var role = req.Role.Trim();
            if (!await roleManager.RoleExistsAsync(role))
                throw new ValidationException($"Role '{role}' does not exist.");

            var currentRoles = await userManager.GetRolesAsync(user);
            if (!currentRoles.Contains(role))
            {
                await userManager.RemoveFromRolesAsync(user, currentRoles);
                await userManager.AddToRoleAsync(user, role);
            }
        }

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, token, req.Password);
            if (!result.Succeeded)
                throw new ValidationException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new ValidationException(string.Join(" ", updateResult.Errors.Select(e => e.Description)));

        var roles = await userManager.GetRolesAsync(user);

        await audit.LogAsync(user.Id, user.FullName, "Update", "Users", nameof(ApplicationUser), user.Id,
            $"Updated user {user.Email}", ct: ct);

        return new UserSummaryDto(user.Id, user.Email!, user.FullName, user.Department, roles, user.IsActive, user.LastLoginAt);
    }

    public async Task SetActiveAsync(string id, bool isActive, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(id) ?? throw new NotFoundException("User not found.");
        user.IsActive = isActive;
        if (!isActive)
        {
            // Kill the refresh token too, otherwise a disabled user keeps minting
            // access tokens until the existing refresh token expires.
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
        }
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) throw new ValidationException(string.Join(" ", result.Errors.Select(e => e.Description)));
        await audit.LogAsync(user.Id, user.FullName, "Update", "Users", nameof(ApplicationUser), user.Id,
            $"{(isActive ? "Enabled" : "Disabled")} user {user.Email}", ct: ct);
    }

    public Task<IEnumerable<string>> GetRolesAsync(CancellationToken ct = default) =>
        Task.FromResult<IEnumerable<string>>(roleManager.Roles.Select(r => r.Name!).OrderBy(n => n).ToList());
}
