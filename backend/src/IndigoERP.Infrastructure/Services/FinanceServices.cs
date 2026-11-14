using IndigoERP.Application.DTOs;
using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.Finance;
using IndigoERP.Domain.Enums;
using IndigoERP.Domain.Interfaces;
using IndigoERP.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.Infrastructure.Services;

public class AccountService : IAccountService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;

    public AccountService(IndigoDbContext db, IUnitOfWork uow) { _db = db; _uow = uow; }

    public async Task<PagedResult<AccountDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        var query = _db.Accounts.Include(a => a.ParentAccount).AsQueryable();
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var s = req.Search.ToLower();
            query = query.Where(a => a.Code.ToLower().Contains(s) || a.Name.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(a => a.Code).Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(a => new AccountDto(a.Id, a.Code, a.Name, a.Type.ToString(), a.ParentAccount != null ? a.ParentAccount.Name : null, a.Balance, a.IsActive))
            .ToListAsync(ct);
        return new PagedResult<AccountDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<AccountDto> CreateAsync(CreateAccountRequest req, CancellationToken ct = default)
    {
        if (await _db.Accounts.AnyAsync(a => a.Code == req.Code, ct))
            throw new InvalidOperationException($"Account code '{req.Code}' already exists.");
        var acct = new Account { Code = req.Code, Name = req.Name, Type = Enum.Parse<AccountType>(req.Type, true), ParentAccountId = req.ParentAccountId, Description = req.Description };
        await _db.Accounts.AddAsync(acct, ct);
        await _uow.SaveChangesAsync(ct);
        return new AccountDto(acct.Id, acct.Code, acct.Name, acct.Type.ToString(), null, 0, true);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var acct = await _db.Accounts.FindAsync([id], ct) ?? throw new KeyNotFoundException("Account not found.");
        if (await _db.JournalLines.AnyAsync(j => j.AccountId == id, ct))
            throw new InvalidOperationException("Cannot delete account with journal entries.");
        acct.IsDeleted = true;
        await _uow.SaveChangesAsync(ct);
    }
}

/// <summary>
/// Double-entry accounting journal service — enforces balanced entries and transactional posting.
/// </summary>
public class JournalService : IJournalService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly ISequenceGenerator _seq;

    public JournalService(IndigoDbContext db, IUnitOfWork uow, ISequenceGenerator seq) { _db = db; _uow = uow; _seq = seq; }

    public async Task<PagedResult<JournalEntryDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        var query = _db.JournalEntries.AsQueryable();
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var s = req.Search.ToLower();
            query = query.Where(j => j.EntryNumber.ToLower().Contains(s) || j.Description.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(j => j.EntryDate).ThenByDescending(j => j.CreatedAt)
            .Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(j => new JournalEntryDto(j.Id, j.EntryNumber, j.EntryDate, j.Reference, j.Description, j.TotalDebit, j.TotalCredit, j.Status.ToString()))
            .ToListAsync(ct);
        return new PagedResult<JournalEntryDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<JournalEntryDto> CreateAsync(CreateJournalEntryRequest req, CancellationToken ct = default)
    {
        if (req.Lines == null || req.Lines.Count < 2)
            throw new InvalidOperationException("Journal entry must have at least 2 lines.");

        var totalDebit = req.Lines.Sum(l => l.Debit);
        var totalCredit = req.Lines.Sum(l => l.Credit);
        if (totalDebit != totalCredit || totalDebit <= 0)
            throw new InvalidOperationException($"Journal entry is not balanced. Debit: {totalDebit}, Credit: {totalCredit}");

        var entryNumber = await _seq.NextAsync("JE", ct);
        var entry = new JournalEntry
        {
            EntryNumber = entryNumber, EntryDate = req.EntryDate, Reference = req.Reference,
            Description = req.Description, TotalDebit = totalDebit, TotalCredit = totalCredit,
            Status = JournalEntryStatus.Draft
        };

        foreach (var line in req.Lines)
        {
            if (line.AccountId == null) throw new InvalidOperationException("Each journal line must have an account.");
            if (!await _db.Accounts.AnyAsync(a => a.Id == line.AccountId, ct))
                throw new KeyNotFoundException($"Account {line.AccountId} not found.");
            entry.Lines.Add(new JournalLine { AccountId = line.AccountId.Value, Description = line.Description, Debit = line.Debit, Credit = line.Credit });
        }

        await _db.JournalEntries.AddAsync(entry, ct);
        await _uow.SaveChangesAsync(ct);
        return new JournalEntryDto(entry.Id, entry.EntryNumber, entry.EntryDate, entry.Reference, entry.Description, entry.TotalDebit, entry.TotalCredit, entry.Status.ToString());
    }

    /// <summary>
    /// Post a journal entry — updates account balances transactionally.
    /// </summary>
    public async Task<JournalEntryDto> PostAsync(Guid id, string postedBy, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries.Include(j => j.Lines).FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new KeyNotFoundException("Journal entry not found.");

        if (entry.Status != JournalEntryStatus.Draft)
            throw new InvalidOperationException("Only draft entries can be posted.");
        if (!entry.IsBalanced)
            throw new InvalidOperationException("Cannot post an unbalanced journal entry.");

        await _uow.BeginTransactionAsync(ct);
        try
        {
            foreach (var line in entry.Lines)
            {
                var account = await _db.Accounts.FindAsync([line.AccountId], ct)
                    ?? throw new KeyNotFoundException($"Account {line.AccountId} not found.");

                // Debit increases Asset/Expense, decreases Liability/Equity/Revenue
                // Credit increases Liability/Equity/Revenue, decreases Asset/Expense
                if (account.Type == AccountType.Asset || account.Type == AccountType.Expense)
                    account.Balance += line.Debit - line.Credit;
                else
                    account.Balance += line.Credit - line.Debit;
            }

            entry.Status = JournalEntryStatus.Posted;
            entry.PostedAt = DateTime.UtcNow;
            entry.PostedBy = postedBy;

            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);
        }
        catch
        {
            await _uow.RollbackTransactionAsync(ct);
            throw;
        }

        return new JournalEntryDto(entry.Id, entry.EntryNumber, entry.EntryDate, entry.Reference, entry.Description, entry.TotalDebit, entry.TotalCredit, entry.Status.ToString());
    }

    public async Task<JournalEntryDto> ReverseAsync(Guid id, string reversedBy, CancellationToken ct = default)
    {
        var original = await _db.JournalEntries.Include(j => j.Lines).FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new KeyNotFoundException("Journal entry not found.");
        if (original.Status != JournalEntryStatus.Posted)
            throw new InvalidOperationException("Only posted entries can be reversed.");

        // Create reversal entry with swapped debits/credits
        var reverseLines = original.Lines.Select(l => new JournalLineDto(l.AccountId, null, $"Reversal: {l.Description}", l.Credit, l.Debit)).ToList();
        var reverseReq = new CreateJournalEntryRequest(DateOnly.FromDateTime(DateTime.UtcNow), $"REV-{original.EntryNumber}", $"Reversal of {original.Description}", reverseLines);
        var reversed = await CreateAsync(reverseReq, ct);
        var reversedEntry = await _db.JournalEntries.FindAsync([reversed.Id], ct);
        reversedEntry!.ReversedEntryId = original.Id;
        await PostAsync(reversed.Id, reversedBy, ct);

        original.Status = JournalEntryStatus.Reversed;
        await _uow.SaveChangesAsync(ct);
        return reversed;
    }
}

public class InvoiceService : IInvoiceService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly ISequenceGenerator _seq;
    private readonly IJournalService _journal;

    public InvoiceService(IndigoDbContext db, IUnitOfWork uow, ISequenceGenerator seq, IJournalService journal)
    { _db = db; _uow = uow; _seq = seq; _journal = journal; }

    public async Task<PagedResult<InvoiceDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        var query = _db.Invoices.Include(i => i.Customer).AsQueryable();
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var s = req.Search.ToLower();
            query = query.Where(i => i.InvoiceNumber.ToLower().Contains(s) || i.Customer.Name.ToLower().Contains(s));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(i => i.IssueDate).Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(i => new InvoiceDto(i.Id, i.InvoiceNumber, i.Customer.Name, i.IssueDate, i.DueDate, i.SubTotal, i.TaxAmount, i.TotalAmount, i.PaidAmount, i.Balance, i.Status.ToString()))
            .ToListAsync(ct);
        return new PagedResult<InvoiceDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    public async Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var i = await _db.Invoices.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (i == null) return null;
        return new InvoiceDto(i.Id, i.InvoiceNumber, i.Customer.Name, i.IssueDate, i.DueDate, i.SubTotal, i.TaxAmount, i.TotalAmount, i.PaidAmount, i.Balance, i.Status.ToString());
    }

    public async Task<InvoiceDto> CreateAsync(CreateInvoiceRequest req, CancellationToken ct = default)
    {
        var invNum = await _seq.NextAsync("INV", ct);
        var subTotal = req.Items.Sum(i => i.Quantity * i.UnitPrice);
        var taxTotal = req.Items.Sum(i => i.TaxAmount);
        var totalAmount = subTotal + taxTotal;

        var invoice = new Invoice
        {
            InvoiceNumber = invNum, CustomerId = req.CustomerId, IssueDate = req.IssueDate,
            DueDate = req.DueDate, SubTotal = subTotal, TaxAmount = taxTotal, TotalAmount = totalAmount,
            Balance = totalAmount, Status = InvoiceStatus.Draft, Notes = req.Notes
        };

        foreach (var item in req.Items)
        {
            invoice.Items.Add(new InvoiceItem
            {
                Description = item.Description, Quantity = item.Quantity, UnitPrice = item.UnitPrice,
                TaxRate = item.TaxRate, TaxAmount = item.TaxAmount, Total = item.Total
            });
        }

        await _db.Invoices.AddAsync(invoice, ct);
        await _uow.SaveChangesAsync(ct);
        return (await GetByIdAsync(invoice.Id, ct))!;
    }

    public async Task<InvoiceDto> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var inv = await _db.Invoices.FindAsync([id], ct) ?? throw new KeyNotFoundException("Invoice not found.");
        if (inv.PaidAmount > 0) throw new InvalidOperationException("Cannot cancel invoice with payments.");
        inv.Status = InvoiceStatus.Cancelled;
        await _uow.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task<InvoiceDto> SendAsync(Guid id, CancellationToken ct = default)
    {
        var inv = await _db.Invoices.FindAsync([id], ct) ?? throw new KeyNotFoundException("Invoice not found.");
        if (inv.Status != InvoiceStatus.Draft) throw new InvalidOperationException($"Cannot send invoice in status {inv.Status}");
        inv.Status = InvoiceStatus.Sent;
        await _uow.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }
}

public class PaymentService : IPaymentService
{
    private readonly IndigoDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly ISequenceGenerator _seq;

    public PaymentService(IndigoDbContext db, IUnitOfWork uow, ISequenceGenerator seq)
    { _db = db; _uow = uow; _seq = seq; }

    public async Task<PagedResult<PaymentDto>> GetAllAsync(PaginationRequest req, CancellationToken ct = default)
    {
        var query = _db.Payments.Include(p => p.Customer).Include(p => p.Vendor).Include(p => p.Invoice).AsQueryable();
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.PaymentDate).Skip((req.Page - 1) * req.PageSize).Take(req.PageSize)
            .Select(p => new PaymentDto(p.Id, p.PaymentNumber, p.Method.ToString(), p.Amount, p.PaymentDate, p.Reference,
                p.Customer != null ? p.Customer.Name : null, p.Vendor != null ? p.Vendor.Name : null,
                p.Invoice != null ? p.Invoice.InvoiceNumber : null, p.Status.ToString()))
            .ToListAsync(ct);
        return new PagedResult<PaymentDto> { Items = items, TotalCount = total, Page = req.Page, PageSize = req.PageSize };
    }

    /// <summary>
    /// Create payment and update invoice/bill balances transactionally.
    /// </summary>
    public async Task<PaymentDto> CreateAsync(CreatePaymentRequest req, CancellationToken ct = default)
    {
        await _uow.BeginTransactionAsync(ct);
        try
        {
            var payNum = await _seq.NextAsync("PAY", ct);
            var cleanMethod = (req.Method ?? "BankTransfer").Replace(" ", "").Replace("-", "");
            if (string.Equals(cleanMethod, "CreditCard", StringComparison.OrdinalIgnoreCase)) cleanMethod = "CorporateCard";
            if (string.Equals(cleanMethod, "Check", StringComparison.OrdinalIgnoreCase)) cleanMethod = "Cheque";
            var method = Enum.TryParse<PaymentMethod>(cleanMethod, true, out var parsedMethod) ? parsedMethod : PaymentMethod.Other;

            var payment = new Payment
            {
                PaymentNumber = payNum, Method = method,
                Amount = req.Amount, PaymentDate = req.PaymentDate, Reference = req.Reference,
                CustomerId = req.CustomerId, VendorId = req.VendorId, InvoiceId = req.InvoiceId, BillId = req.BillId,
                Status = PaymentStatus.Posted, Notes = req.Notes
            };

            if (req.InvoiceId.HasValue)
            {
                var inv = await _db.Invoices.FindAsync([req.InvoiceId.Value], ct) ?? throw new KeyNotFoundException("Invoice not found.");
                if (req.Amount > inv.Balance) throw new InvalidOperationException("Payment exceeds invoice balance.");
                inv.PaidAmount += req.Amount;
                inv.Balance -= req.Amount;
                inv.Status = inv.Balance <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
            }

            if (req.BillId.HasValue)
            {
                var bill = await _db.Bills.FindAsync([req.BillId.Value], ct) ?? throw new KeyNotFoundException("Bill not found.");
                if (req.Amount > bill.Balance) throw new InvalidOperationException("Payment exceeds bill balance.");
                bill.PaidAmount += req.Amount;
                bill.Balance -= req.Amount;
                bill.Status = bill.Balance <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
            }

            await _db.Payments.AddAsync(payment, ct);
            await _uow.SaveChangesAsync(ct);
            await _uow.CommitTransactionAsync(ct);

            return new PaymentDto(payment.Id, payment.PaymentNumber, payment.Method.ToString(), payment.Amount,
                payment.PaymentDate, payment.Reference, null, null, null, payment.Status.ToString());
        }
        catch
        {
            await _uow.RollbackTransactionAsync(ct);
            throw;
        }
    }
}
