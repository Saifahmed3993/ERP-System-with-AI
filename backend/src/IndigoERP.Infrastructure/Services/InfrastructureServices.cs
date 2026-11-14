using IndigoERP.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IndigoERP.Infrastructure.Services;

/// <summary>
/// Local file system storage provider for development.
/// Can be replaced with Azure Blob / AWS S3 for production.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public LocalFileStorageService(IConfiguration config)
    {
        _basePath = config["Storage:Path"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> UploadAsync(string fileName, Stream content, string contentType, CancellationToken ct = default)
    {
        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(fileName)}";
        var filePath = Path.Combine(_basePath, safeName);
        using var fileStream = new FileStream(filePath, FileMode.Create);
        await content.CopyToAsync(fileStream, ct);
        return safeName;
    }

    public Task<Stream?> DownloadAsync(string storagePath, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_basePath, storagePath);
        if (!File.Exists(fullPath)) return Task.FromResult<Stream?>(null);
        return Task.FromResult<Stream?>(new FileStream(fullPath, FileMode.Open, FileAccess.Read));
    }

    public Task DeleteAsync(string storagePath, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_basePath, storagePath);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string storagePath, CancellationToken ct = default)
    {
        return Task.FromResult(File.Exists(Path.Combine(_basePath, storagePath)));
    }
}

/// <summary>
/// Database-backed sequence generator for business codes like EMP-1001, INV-2026-0001.
/// </summary>
public class SequenceGenerator : ISequenceGenerator
{
    private readonly Data.IndigoDbContext _db;

    public SequenceGenerator(Data.IndigoDbContext db) => _db = db;

    public async Task<string> NextAsync(string prefix, CancellationToken ct = default)
    {
        // Use a system setting to track the last sequence number per prefix
        var key = $"Sequence_{prefix}";
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        int next;
        if (setting == null)
        {
            next = 1001;
            _db.SystemSettings.Add(new Domain.Entities.Admin.SystemSetting { Key = key, Value = next.ToString(), Scope = "System" });
        }
        else
        {
            next = int.Parse(setting.Value) + 1;
            setting.Value = next.ToString();
        }
        await _db.SaveChangesAsync(ct);
        return $"{prefix}-{next}";
    }
}
