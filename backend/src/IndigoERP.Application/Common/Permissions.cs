namespace IndigoERP.Application.Common;

/// <summary>
/// Canonical list of permissions and the role → permission grants.
/// This is system configuration (like the role list itself), not business data.
/// Authorization policies are registered from <see cref="All"/> at startup.
/// </summary>
public static class Permissions
{
    public static readonly string[] Modules =
    [
        "Employees", "Departments", "Positions", "Attendance", "Leave", "Payroll",
        "Recruitment", "Performance", "Benefits", "Documents",
        "Accounts", "JournalEntries", "Invoices", "Customers", "Vendors", "Payments",
        "Expenses", "Budgets", "Reports", "Users", "Roles", "AuditLogs", "Settings",
    ];

    public static readonly string[] Actions = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

    public static IEnumerable<string> All =>
        from m in Modules from a in Actions select $"{m}.{a}";

    /// <summary>HR modules an HR Manager owns end to end.</summary>
    private static readonly string[] HrModules =
        ["Employees", "Departments", "Positions", "Attendance", "Leave", "Payroll",
         "Recruitment", "Performance", "Benefits", "Documents", "Reports"];

    private static readonly string[] FinanceModules =
        ["Accounts", "JournalEntries", "Invoices", "Customers", "Vendors", "Payments",
         "Expenses", "Budgets", "Reports"];

    /// <summary>
    /// Role grants. An Employee is deliberately given almost nothing: HR data is
    /// sensitive, so read access to the workforce directory and salary data is
    /// reserved for HR/Administrator roles.
    /// </summary>
    public static IReadOnlyDictionary<string, string[]> RoleGrants { get; } = new Dictionary<string, string[]>
    {
        ["Administrator"] = All.ToArray(),

        ["Viewer"] = Modules.Select(m => $"{m}.View").ToArray(),

        ["HR Manager"] = HrModules.SelectMany(m => Actions.Select(a => $"{m}.{a}"))
            .Concat(["AuditLogs.View"]).ToArray(),
            
        ["HR Specialist"] = HrModules.SelectMany(m => new[] { $"{m}.View", $"{m}.Create", $"{m}.Edit" }).ToArray(),
        
        ["Payroll Specialist"] = ["Payroll.View", "Payroll.Create", "Payroll.Edit", "Payroll.Approve", "Employees.View", "Attendance.View", "Leave.View"],
        
        ["Manager"] = ["Employees.View", "Attendance.View", "Leave.View", "Leave.Approve", "Performance.View", "Performance.Create", "Performance.Edit", "Performance.Approve"],

        ["Finance Manager"] = FinanceModules.SelectMany(m => Actions.Select(a => $"{m}.{a}"))
            .Concat(["Employees.View", "Payroll.View", "AuditLogs.View"]).ToArray(),

        ["Accountant"] = new[] { "Accounts", "JournalEntries", "Invoices", "Customers", "Vendors", "Payments", "Expenses" }
            .SelectMany(m => new[] { $"{m}.View", $"{m}.Create", $"{m}.Edit" })
            .Concat(["Budgets.View", "Reports.View"]).ToArray(),
            
        ["AR Specialist"] = ["Invoices.View", "Invoices.Create", "Invoices.Edit", "Customers.View", "Customers.Create", "Customers.Edit", "Payments.View", "Payments.Create", "Reports.View"],
        
        ["AP Specialist"] = ["Expenses.View", "Expenses.Create", "Expenses.Edit", "Vendors.View", "Vendors.Create", "Vendors.Edit", "Payments.View", "Payments.Create", "Reports.View"],

        // Self-service only. No directory, no salary, no approvals.
        ["Employee"] = ["Attendance.View", "Attendance.Create", "Leave.View", "Leave.Create", "Documents.View"],
    };
}
