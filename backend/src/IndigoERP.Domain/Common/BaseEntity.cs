namespace IndigoERP.Domain.Common;

/// <summary>
/// Base entity with common audit fields for all domain entities.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Concurrency token for optimistic concurrency control.
    /// </summary>
    public byte[] RowVersion { get; set; } = [];
}
