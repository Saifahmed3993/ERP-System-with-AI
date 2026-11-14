using IndigoERP.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndigoERP.Infrastructure.Data.Configurations;

public class AccountConfig : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Code).HasMaxLength(20).IsRequired();
        b.HasIndex(e => e.Code).IsUnique();
        b.Property(e => e.Name).HasMaxLength(200).IsRequired();
        b.Property(e => e.Balance).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
        b.HasOne(e => e.ParentAccount).WithMany(e => e.ChildAccounts).HasForeignKey(e => e.ParentAccountId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class JournalEntryConfig : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.EntryNumber).HasMaxLength(30).IsRequired();
        b.HasIndex(e => e.EntryNumber).IsUnique();
        b.Property(e => e.Description).HasMaxLength(500).IsRequired();
        b.Property(e => e.TotalDebit).HasPrecision(18, 2);
        b.Property(e => e.TotalCredit).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
    }
}

public class JournalLineConfig : IEntityTypeConfiguration<JournalLine>
{
    public void Configure(EntityTypeBuilder<JournalLine> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Debit).HasPrecision(18, 2);
        b.Property(e => e.Credit).HasPrecision(18, 2);
        b.HasOne(e => e.JournalEntry).WithMany(e => e.Lines).HasForeignKey(e => e.JournalEntryId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.Account).WithMany(e => e.JournalLines).HasForeignKey(e => e.AccountId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class CustomerConfig : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Name).HasMaxLength(200).IsRequired();
        b.Property(e => e.OutstandingBalance).HasPrecision(18, 2);
    }
}

public class VendorConfig : IEntityTypeConfiguration<Vendor>
{
    public void Configure(EntityTypeBuilder<Vendor> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Name).HasMaxLength(200).IsRequired();
        b.Property(e => e.OutstandingBalance).HasPrecision(18, 2);
    }
}

public class InvoiceConfig : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.InvoiceNumber).HasMaxLength(30).IsRequired();
        b.HasIndex(e => e.InvoiceNumber).IsUnique();
        b.Property(e => e.SubTotal).HasPrecision(18, 2);
        b.Property(e => e.TaxAmount).HasPrecision(18, 2);
        b.Property(e => e.DiscountAmount).HasPrecision(18, 2);
        b.Property(e => e.TotalAmount).HasPrecision(18, 2);
        b.Property(e => e.PaidAmount).HasPrecision(18, 2);
        b.Property(e => e.Balance).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
        b.HasOne(e => e.Customer).WithMany(e => e.Invoices).HasForeignKey(e => e.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class InvoiceItemConfig : IEntityTypeConfiguration<InvoiceItem>
{
    public void Configure(EntityTypeBuilder<InvoiceItem> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.UnitPrice).HasPrecision(18, 2);
        b.Property(e => e.TaxRate).HasPrecision(5, 2);
        b.Property(e => e.TaxAmount).HasPrecision(18, 2);
        b.Property(e => e.DiscountPercent).HasPrecision(5, 2);
        b.Property(e => e.DiscountAmount).HasPrecision(18, 2);
        b.Property(e => e.Total).HasPrecision(18, 2);
        b.HasOne(e => e.Invoice).WithMany(e => e.Items).HasForeignKey(e => e.InvoiceId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PaymentConfig : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.PaymentNumber).HasMaxLength(30).IsRequired();
        b.HasIndex(e => e.PaymentNumber).IsUnique();
        b.Property(e => e.Amount).HasPrecision(18, 2);
        b.Property(e => e.RowVersion).IsRowVersion();
        b.HasOne(e => e.Customer).WithMany(e => e.Payments).HasForeignKey(e => e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.Vendor).WithMany(e => e.Payments).HasForeignKey(e => e.VendorId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.Invoice).WithMany(e => e.Payments).HasForeignKey(e => e.InvoiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExpenseConfig : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Amount).HasPrecision(18, 2);
        b.Property(e => e.Title).HasMaxLength(300).IsRequired();
    }
}

public class BudgetConfig : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.TotalBudget).HasPrecision(18, 2);
        b.Property(e => e.ActualSpend).HasPrecision(18, 2);
        b.Ignore(e => e.Variance);
        b.Ignore(e => e.UtilizationPercent);
    }
}

public class BudgetLineConfig : IEntityTypeConfiguration<BudgetLine>
{
    public void Configure(EntityTypeBuilder<BudgetLine> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.BudgetedAmount).HasPrecision(18, 2);
        b.Property(e => e.ActualAmount).HasPrecision(18, 2);
        b.HasOne(e => e.Budget).WithMany(e => e.Lines).HasForeignKey(e => e.BudgetId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class BillConfig : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.BillNumber).HasMaxLength(30).IsRequired();
        b.HasIndex(e => e.BillNumber).IsUnique();
        b.Property(e => e.SubTotal).HasPrecision(18, 2);
        b.Property(e => e.TaxAmount).HasPrecision(18, 2);
        b.Property(e => e.TotalAmount).HasPrecision(18, 2);
        b.Property(e => e.PaidAmount).HasPrecision(18, 2);
        b.Property(e => e.Balance).HasPrecision(18, 2);
        b.HasOne(e => e.Vendor).WithMany(e => e.Bills).HasForeignKey(e => e.VendorId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TaxRateConfig : IEntityTypeConfiguration<TaxRate>
{
    public void Configure(EntityTypeBuilder<TaxRate> b)
    {
        b.HasKey(e => e.Id);
        b.Property(e => e.Rate).HasPrecision(5, 2);
        b.Property(e => e.Name).HasMaxLength(100).IsRequired();
    }
}
