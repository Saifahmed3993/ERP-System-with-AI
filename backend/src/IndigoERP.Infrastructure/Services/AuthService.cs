using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.Admin;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace IndigoERP.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.IsActive) throw new UnauthorizedAccessException("Account is disabled.");

        var valid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!valid) throw new UnauthorizedAccessException("Invalid credentials.");

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = GenerateJwt(user, roles);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new LoginResponse(accessToken, refreshToken, DateTime.UtcNow.AddHours(1),
            new UserDto(user.Id, user.FullName, user.Email!, user.Department, roles, user.IsActive));
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var users = _userManager.Users.Where(u => u.RefreshToken == request.RefreshToken && u.RefreshTokenExpiry > DateTime.UtcNow);
        var user = users.FirstOrDefault() ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        var roles = await _userManager.GetRolesAsync(user);
        var newAccess = GenerateJwt(user, roles);
        var newRefresh = GenerateRefreshToken();

        user.RefreshToken = newRefresh;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        return new LoginResponse(newAccess, newRefresh, DateTime.UtcNow.AddHours(1),
            new UserDto(user.Id, user.FullName, user.Email!, user.Department, roles, user.IsActive));
    }

    public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<UserDto> GetCurrentUserAsync(string userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        var roles = await _userManager.GetRolesAsync(user);
        return new UserDto(user.Id, user.FullName, user.Email!, user.Department, roles, user.IsActive);
    }

    private string GenerateJwt(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}
