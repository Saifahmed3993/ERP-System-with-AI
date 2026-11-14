using IndigoERP.Domain.Common;

namespace IndigoERP.Domain.Interfaces;

/// <summary>
/// Generic repository interface for data access abstraction.
/// </summary>
public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task<T> AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(T entity, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
}

/// <summary>
/// Unit of Work pattern for transactional consistency.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}

/// <summary>
/// Paginated result wrapper.
/// </summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

/// <summary>
/// File storage abstraction — allows swapping local/cloud providers.
/// </summary>
public interface IFileStorageService
{
    Task<string> UploadAsync(string fileName, Stream content, string contentType, CancellationToken ct = default);
    Task<Stream?> DownloadAsync(string storagePath, CancellationToken ct = default);
    Task DeleteAsync(string storagePath, CancellationToken ct = default);
    Task<bool> ExistsAsync(string storagePath, CancellationToken ct = default);
}

/// <summary>
/// Current user context for audit and authorization.
/// </summary>
public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    string? IpAddress { get; }
    bool IsAuthenticated { get; }
    IEnumerable<string> Roles { get; }
}

/// <summary>
/// Sequence number generator for business codes (EMP-XXXX, INV-XXXX, etc.)
/// </summary>
public interface ISequenceGenerator
{
    Task<string> NextAsync(string prefix, CancellationToken ct = default);
}
