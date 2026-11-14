using System.Globalization;
using System.Text.RegularExpressions;

namespace IndigoERP.Application.Common;

/// <summary>
/// Raised when a request fails business/input validation. Mapped to HTTP 400.
/// </summary>
public class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(string message) : base(message)
        => Errors = new Dictionary<string, string[]>();

    public ValidationException(IDictionary<string, List<string>> errors)
        : base(string.Join(" ", errors.SelectMany(e => e.Value)))
        => Errors = errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
}

/// <summary>Raised when a referenced entity does not exist. Mapped to HTTP 404.</summary>
public class NotFoundException(string message) : Exception(message);

/// <summary>
/// Raised when a request conflicts with existing state (duplicates, invalid
/// state transitions, repeated non-idempotent operations). Mapped to HTTP 409.
/// </summary>
public class ConflictException(string message) : Exception(message);

/// <summary>
/// Accumulates field-level validation errors so a caller gets every problem
/// with its request at once rather than one per round trip.
/// </summary>
public sealed class Validator
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public const decimal MaxMonthlySalary = 10_000_000m;
    public const decimal MaxBudget = 1_000_000_000_000m;

    private static readonly Regex EmailPattern =
        new(@"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$", RegexOptions.Compiled);
    private static readonly Regex PhonePattern =
        new(@"^\+?[0-9][0-9\s\-()]{5,24}$", RegexOptions.Compiled);

    public Validator Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }

    public bool HasErrors => _errors.Count > 0;

    public void ThrowIfInvalid()
    {
        if (HasErrors) throw new ValidationException(_errors);
    }

    /// <summary>Required free-text field: rejects null, empty and whitespace-only.</summary>
    public Validator Required(string field, string? value, int maxLength = 200)
    {
        if (string.IsNullOrWhiteSpace(value)) Add(field, $"{field} is required.");
        else if (value.Trim().Length > maxLength) Add(field, $"{field} must be at most {maxLength} characters.");
        return this;
    }

    /// <summary>A person or entity name: required, length-bounded, must contain a letter.</summary>
    public Validator Name(string field, string? value, int maxLength = 100)
    {
        if (string.IsNullOrWhiteSpace(value)) { Add(field, $"{field} is required."); return this; }
        var trimmed = value.Trim();
        if (trimmed.Length > maxLength) Add(field, $"{field} must be at most {maxLength} characters.");
        if (!trimmed.Any(char.IsLetter)) Add(field, $"{field} must contain at least one letter.");
        return this;
    }

    public Validator Email(string field, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) { Add(field, $"{field} is required."); return this; }
        var trimmed = value.Trim();
        if (trimmed.Length > 200) Add(field, $"{field} must be at most 200 characters.");
        else if (!EmailPattern.IsMatch(trimmed)) Add(field, $"{field} is not a valid email address.");
        return this;
    }

    /// <summary>Optional phone. Empty is fine; malformed is not.</summary>
    public Validator OptionalPhone(string field, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return this;
        var trimmed = value.Trim();
        if (!PhonePattern.IsMatch(trimmed))
            Add(field, $"{field} must be a valid phone number (digits, spaces, dashes and an optional leading +).");
        return this;
    }

    public Validator Money(string field, decimal value, decimal min, decimal max, bool allowZero = true)
    {
        if (value < min || (!allowZero && value == 0))
            Add(field, allowZero
                ? $"{field} must be at least {min.ToString("N2", CultureInfo.InvariantCulture)}."
                : $"{field} must be greater than {min.ToString("N2", CultureInfo.InvariantCulture)}.");
        else if (value > max)
            Add(field, $"{field} must not exceed {max.ToString("N2", CultureInfo.InvariantCulture)}.");
        return this;
    }

    public Validator Percent(string field, decimal value)
    {
        if (value < 0 || value > 100) Add(field, $"{field} must be between 0 and 100.");
        return this;
    }

    public Validator Range(string field, decimal value, decimal min, decimal max)
    {
        if (value < min || value > max) Add(field, $"{field} must be between {min} and {max}.");
        return this;
    }

    /// <summary>Employment/join dates: no prehistoric values, no far-future values.</summary>
    public Validator WorkDate(string field, DateTime value, int maxYearsAhead = 1)
    {
        var today = DateTime.UtcNow.Date;
        if (value.Date < new DateTime(1950, 1, 1)) Add(field, $"{field} must be on or after 1950-01-01.");
        else if (value.Date > today.AddYears(maxYearsAhead))
            Add(field, $"{field} must not be more than {maxYearsAhead} year(s) in the future.");
        return this;
    }

    public Validator WorkDate(string field, DateOnly value, int maxYearsAhead = 1)
        => WorkDate(field, value.ToDateTime(TimeOnly.MinValue), maxYearsAhead);

    /// <summary>Requires end to be on or after start.</summary>
    public Validator DateOrder(string startField, DateOnly start, string endField, DateOnly end)
    {
        if (end < start) Add(endField, $"{endField} must be on or after {startField}.");
        return this;
    }

    /// <summary>Parses an enum name, recording a validation error instead of throwing.</summary>
    public bool TryEnum<TEnum>(string field, string? value, out TEnum parsed) where TEnum : struct, Enum
    {
        parsed = default;
        if (string.IsNullOrWhiteSpace(value)) { Add(field, $"{field} is required."); return false; }
        if (!Enum.TryParse(value.Trim(), true, out parsed) || !Enum.IsDefined(parsed))
        {
            Add(field, $"'{value}' is not a valid {field}. Allowed values: {string.Join(", ", Enum.GetNames<TEnum>())}.");
            return false;
        }
        return true;
    }
}
