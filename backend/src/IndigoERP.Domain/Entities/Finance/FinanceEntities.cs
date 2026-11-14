using IndigoERP.Domain.Common;
using IndigoERP.Domain.Enums;
using IndigoERP.Domain.Entities.HR;

namespace IndigoERP.Domain.Entities.Finance;

public class Account : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public Guid? ParentAccountId { get; set; }
    public string? Description { get; set; }
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    // Navigation properties
    public Account? ParentAccount { get; set; }
    public ICollection<Account> ChildAccounts { get; set; } = new List<Account>();
    public ICollection<JournalLine> JournalLines { get; set; } = new List<JournalLine>();
}

public class JournalEntry : BaseEntity
{
    public string EntryNumber { get; set; } = string.Empty;
    public DateOnly EntryDate { get; set; }
    public string? Reference { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public DateTime? PostedAt { get; set; }
    public string? PostedBy { get; set; }
    public Guid? ReversedEntryId { get; set; }

    // Navigation properties
    public JournalEntry? ReversedEntry { get; set; }
    public ICollection<JournalLine> Lines { get; set; } = new List<JournalLine>();

    /// <summary>
    /// Validates that total debits equal total credits.
    /// </summary>
    public bool IsBalanced => TotalDebit == TotalCredit && TotalDebit > 0;
}

public class JournalLine : BaseEntity
{
    public Guid JournalEntryId { get; set; }
    public Guid AccountId { get; set; }
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }

    // Navigation properties
    public JournalEntry JournalEntry { get; set; } = null!;
    public Account Account { get; set; } = null!;
}

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public decimal OutstandingBalance { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Vendor : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public decimal OutstandingBalance { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Invoice : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal Balance { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string? Notes { get; set; }
    public Guid? JournalEntryId { get; set; }

    // Navigation properties
    public Customer Customer { get; set; } = null!;
    public JournalEntry? JournalEntry { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class InvoiceItem : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }

    // Navigation properties
    public Invoice Invoice { get; set; } = null!;
}

public class Bill : BaseEntity
{
    public string BillNumber { get; set; } = string.Empty;
    public Guid VendorId { get; set; }
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal Balance { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string? Notes { get; set; }
    public Guid? JournalEntryId { get; set; }

    // Navigation properties
    public Vendor Vendor { get; set; } = null!;
    public JournalEntry? JournalEntry { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Payment : BaseEntity
{
    public string PaymentNumber { get; set; } = string.Empty;
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? Reference { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? VendorId { get; set; }
    public Guid? InvoiceId { get; set; }
    public Guid? BillId { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public Guid? JournalEntryId { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public Customer? Customer { get; set; }
    public Vendor? Vendor { get; set; }
    public Invoice? Invoice { get; set; }
    public Bill? Bill { get; set; }
    public JournalEntry? JournalEntry { get; set; }
}

public class Expense : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public Guid? EmployeeId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public string? Description { get; set; }
    public string? ReceiptFileName { get; set; }
    public string? ReceiptStoragePath { get; set; }
    public ExpenseStatus Status { get; set; } = ExpenseStatus.Draft;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? JournalEntryId { get; set; }

    // Navigation properties
    public Employee? Employee { get; set; }
    public JournalEntry? JournalEntry { get; set; }
}

public class Budget : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public int FiscalYear { get; set; }
    public decimal TotalBudget { get; set; }
    public decimal ActualSpend { get; set; }
    public decimal Variance => TotalBudget - ActualSpend;
    public decimal UtilizationPercent => TotalBudget > 0 ? Math.Round(ActualSpend / TotalBudget * 100, 1) : 0;
    public BudgetStatus Status { get; set; } = BudgetStatus.Active;

    // Navigation properties
    public ICollection<BudgetLine> Lines { get; set; } = new List<BudgetLine>();
}

public class BudgetLine : BaseEntity
{
    public Guid BudgetId { get; set; }
    public Guid? AccountId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal BudgetedAmount { get; set; }
    public decimal ActualAmount { get; set; }

    // Navigation properties
    public Budget Budget { get; set; } = null!;
    public Account? Account { get; set; }
}

public class TaxRate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public TaxCategory Category { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}
