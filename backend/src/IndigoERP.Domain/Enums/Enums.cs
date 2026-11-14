namespace IndigoERP.Domain.Enums;

public enum EmploymentType { FullTime, PartTime, Contract, Intern }
public enum EmployeeStatus { Active, OnLeave, Terminated, Suspended }
public enum LeaveRequestStatus { Pending, Approved, Rejected, Cancelled }
public enum PayrollStatus { Draft, Processing, Posted, Cancelled }
public enum AttendanceStatus { Present, Late, Absent, OnLeave, HalfDay }
public enum RecruitmentStage { Applied, Screening, Interview, Offer, Hired, Rejected }
public enum CandidateStatus { Active, Pending, Approved, Rejected }
public enum PerformanceReviewStatus { Draft, Active, Pending, Approved }
public enum BenefitStatus { Active, Pending, Inactive }
public enum DocumentCategory { Contract, Identity, Medical, Legal, Education, Other }
public enum DocumentStatus { Active, Pending, Expired, Archived }
public enum AccountType { Asset, Liability, Equity, Revenue, Expense }
public enum JournalEntryStatus { Draft, Posted, Reversed }
public enum InvoiceStatus { Draft, Sent, PartiallyPaid, Paid, Overdue, Cancelled }
public enum ExpenseStatus { Draft, Pending, Approved, Paid, Rejected }
public enum PaymentMethod { BankTransfer, CorporateCard, Cheque, Cash, Other }
public enum PaymentStatus { Pending, Posted, Cancelled }
public enum BudgetStatus { Active, Pending, Closed }
public enum TaxCategory { Sales, Services, Compensation, Exports }
public enum AuditAction { Login, Create, Update, Delete, Approve, Reject, Post, Cancel, Payment, Export }
