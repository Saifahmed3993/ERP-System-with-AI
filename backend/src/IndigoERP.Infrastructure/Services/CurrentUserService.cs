using System.Security.Claims;
using IndigoERP.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace IndigoERP.Infrastructure.Services;

/// <summary>
/// Resolves the acting user from the current request so services can write
/// audit records without taking a dependency on ASP.NET plumbing themselves.
/// </summary>
public class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public string? UserId => User?.FindFirstValue(ClaimTypes.NameIdentifier);
    public string? UserName => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue(ClaimTypes.Email);
    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;
    public IEnumerable<string> Roles => User?.FindAll(ClaimTypes.Role).Select(c => c.Value) ?? [];
}
