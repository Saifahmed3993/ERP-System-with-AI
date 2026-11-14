using IndigoERP.Application.Common;
using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Domain.Entities.Finance;
using IndigoERP.Domain.Entities.HR;
using IndigoERP.Domain.Enums;
using IndigoERP.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndigoERP.API.Controllers;

[ApiController, Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly IndigoDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;

    public SeedController(
        IndigoDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    [HttpPost]
    [HttpPost("egyptian")]
    public async Task<IActionResult> SeedEgyptian(CancellationToken ct)
    {
        // 1. Wipe all operational and master data
        await ResetAllDataAsync(ct);

        // 2. Ensure Roles & Role Permissions
        await EnsureRolesAndPermissionsAsync(ct);

        // 3. Ensure the 4 key users with known test credentials
        await EnsureUsersAsync();

        // 4. Seed Company
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Nile Horizon Technologies S.A.E",
            Address = "Building 12B, Smart Village, KM 28 Cairo-Alex Desert Road, Giza, Egypt",
            Phone = "+20 2 3854 9000",
            Email = "contact@nilehorizon.eg",
            Website = "https://nilehorizon.eg",
            TaxId = "412-985-632",
            BaseCurrency = "EGP",
            Timezone = "Africa/Cairo"
        };
        _db.Companies.Add(company);

        // 5. Seed Departments
        var deptExec = new Department { Id = Guid.NewGuid(), Name = "Executive Management", Description = "Executive Leadership and Strategic Planning", AnnualBudget = 3000000 };
        var deptHR = new Department { Id = Guid.NewGuid(), Name = "Human Resources", Description = "People, Culture, Recruitment and Talent Management", AnnualBudget = 1500000 };
        var deptFin = new Department { Id = Guid.NewGuid(), Name = "Finance & Accounting", Description = "Corporate Finance, Treasury, Accounting & Compliance", AnnualBudget = 2500000 };
        var deptEng = new Department { Id = Guid.NewGuid(), Name = "Software Engineering", Description = "Software Development, Cloud Architecture & DevOps", AnnualBudget = 6000000 };
        var deptOps = new Department { Id = Guid.NewGuid(), Name = "Customer Operations", Description = "Client Support, Implementation & SLA Management", AnnualBudget = 1800000 };

        _db.Departments.AddRange(deptExec, deptHR, deptFin, deptEng, deptOps);
        await _db.SaveChangesAsync(ct);

        // 6. Seed Positions
        var posCeo = new Position { Id = Guid.NewGuid(), Title = "Chief Executive Officer", DepartmentId = deptExec.Id, Description = "Executive Leadership", MinSalary = 80000, MaxSalary = 160000 };
        var posHrMgr = new Position { Id = Guid.NewGuid(), Title = "HR Director / Manager", DepartmentId = deptHR.Id, Description = "Head of HR & People Operations", MinSalary = 35000, MaxSalary = 65000 };
        var posHrSpec = new Position { Id = Guid.NewGuid(), Title = "HR Specialist", DepartmentId = deptHR.Id, Description = "Talent Acquisition & Employee Services", MinSalary = 16000, MaxSalary = 28000 };
        var posFinMgr = new Position { Id = Guid.NewGuid(), Title = "Finance Director / Manager", DepartmentId = deptFin.Id, Description = "Head of Finance & Treasury", MinSalary = 40000, MaxSalary = 75000 };
        var posAcct = new Position { Id = Guid.NewGuid(), Title = "Senior Accountant", DepartmentId = deptFin.Id, Description = "General Ledger, Tax & Invoicing", MinSalary = 18000, MaxSalary = 32000 };
        var posLeadEng = new Position { Id = Guid.NewGuid(), Title = "Lead Software Architect", DepartmentId = deptEng.Id, Description = "Technical Architecture & System Design", MinSalary = 45000, MaxSalary = 85000 };
        var posDev = new Position { Id = Guid.NewGuid(), Title = "Senior Full-Stack Engineer", DepartmentId = deptEng.Id, Description = "Full stack application development", MinSalary = 30000, MaxSalary = 55000 };
        var posDevOps = new Position { Id = Guid.NewGuid(), Title = "DevOps & Cloud Engineer", DepartmentId = deptEng.Id, Description = "Azure/AWS Infrastructure & CI/CD", MinSalary = 28000, MaxSalary = 50000 };
        var posSupport = new Position { Id = Guid.NewGuid(), Title = "Technical Support Specialist", DepartmentId = deptOps.Id, Description = "Tier-2 Client Support & Integration", MinSalary = 14000, MaxSalary = 24000 };

        _db.Positions.AddRange(posCeo, posHrMgr, posHrSpec, posFinMgr, posAcct, posLeadEng, posDev, posDevOps, posSupport);
        await _db.SaveChangesAsync(ct);

        // 7. Seed Egyptian Employees
        var emp1 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-001", FirstName = "Hazem", LastName = "El-Shamy",
            Email = "hazem.shamy@nilehorizon.eg", Phone = "+20 10 1112 2233", DepartmentId = deptExec.Id,
            PositionId = posCeo.Id, MonthlySalary = 110000, JoinDate = new DateTime(2023, 1, 15),
            Location = "Smart Village, Giza", CostCenter = "EXEC-01", Status = EmployeeStatus.Active
        };
        var emp2 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-002", FirstName = "Ahmed", LastName = "Mansour",
            Email = "hr@indigo.co", Phone = "+20 10 2223 3344", DepartmentId = deptHR.Id,
            PositionId = posHrMgr.Id, MonthlySalary = 45000, JoinDate = new DateTime(2023, 3, 1),
            Location = "Smart Village, Giza", CostCenter = "HR-01", Status = EmployeeStatus.Active
        };
        var emp3 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-003", FirstName = "Nouran", LastName = "El-Gohary",
            Email = "nouran.gohary@nilehorizon.eg", Phone = "+20 10 3334 4455", DepartmentId = deptHR.Id,
            PositionId = posHrSpec.Id, MonthlySalary = 20000, JoinDate = new DateTime(2023, 6, 15),
            Location = "Smart Village, Giza", CostCenter = "HR-02", Status = EmployeeStatus.Active
        };
        var emp4 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-004", FirstName = "Tarek", LastName = "El-Sayed",
            Email = "finance@indigo.co", Phone = "+20 11 4445 5566", DepartmentId = deptFin.Id,
            PositionId = posFinMgr.Id, MonthlySalary = 52000, JoinDate = new DateTime(2023, 2, 10),
            Location = "Smart Village, Giza", CostCenter = "FIN-01", Status = EmployeeStatus.Active
        };
        var emp5 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-005", FirstName = "Mariam", LastName = "Shenouda",
            Email = "accountant@indigo.co", Phone = "+20 12 5556 6677", DepartmentId = deptFin.Id,
            PositionId = posAcct.Id, MonthlySalary = 26000, JoinDate = new DateTime(2023, 4, 1),
            Location = "Smart Village, Giza", CostCenter = "FIN-02", Status = EmployeeStatus.Active
        };
        var emp6 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-006", FirstName = "Karim", LastName = "Farouk",
            Email = "karim.farouk@nilehorizon.eg", Phone = "+20 10 6667 7788", DepartmentId = deptEng.Id,
            PositionId = posLeadEng.Id, MonthlySalary = 58000, JoinDate = new DateTime(2023, 5, 15),
            Location = "Smart Village, Giza", CostCenter = "ENG-01", Status = EmployeeStatus.Active
        };
        var emp7 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-007", FirstName = "Youssef", LastName = "Radwan",
            Email = "youssef.radwan@nilehorizon.eg", Phone = "+20 11 7778 8899", DepartmentId = deptEng.Id,
            PositionId = posDev.Id, MonthlySalary = 38000, JoinDate = new DateTime(2023, 8, 1),
            Location = "Smart Village, Giza", CostCenter = "ENG-02", Status = EmployeeStatus.Active
        };
        var emp8 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-008", FirstName = "Salma", LastName = "El-Mahdy",
            Email = "salma.mahdy@nilehorizon.eg", Phone = "+20 12 8889 9900", DepartmentId = deptOps.Id,
            PositionId = posSupport.Id, MonthlySalary = 18000, JoinDate = new DateTime(2023, 9, 1),
            Location = "Smart Village, Giza", CostCenter = "OPS-01", Status = EmployeeStatus.Active
        };
        var emp9 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-009", FirstName = "Omar", LastName = "Abdel-Rahman",
            Email = "omar.rahman@nilehorizon.eg", Phone = "+20 10 9990 0011", DepartmentId = deptEng.Id,
            PositionId = posDevOps.Id, MonthlySalary = 35000, JoinDate = new DateTime(2024, 1, 10),
            Location = "Smart Village, Giza", CostCenter = "ENG-03", Status = EmployeeStatus.Active
        };
        var emp10 = new Employee
        {
            Id = Guid.NewGuid(), EmployeeCode = "EMP-010", FirstName = "Hoda", LastName = "Soliman",
            Email = "hoda.soliman@nilehorizon.eg", Phone = "+20 11 0001 1122", DepartmentId = deptFin.Id,
            PositionId = posAcct.Id, MonthlySalary = 24000, JoinDate = new DateTime(2024, 2, 1),
            Location = "Smart Village, Giza", CostCenter = "FIN-03", Status = EmployeeStatus.Active
        };

        var allEmployees = new[] { emp1, emp2, emp3, emp4, emp5, emp6, emp7, emp8, emp9, emp10 };
        _db.Employees.AddRange(allEmployees);
        await _db.SaveChangesAsync(ct);

        // Update department managers
        deptExec.ManagerId = emp1.Id;
        deptHR.ManagerId = emp2.Id;
        deptFin.ManagerId = emp4.Id;
        deptEng.ManagerId = emp6.Id;
        deptOps.ManagerId = emp8.Id;
        await _db.SaveChangesAsync(ct);

        // 8. Seed Leave Types & Balances
        var ltAnnual = new LeaveType { Id = Guid.NewGuid(), Name = "Annual Leave", Description = "Paid statutory annual vacation", DefaultDaysPerYear = 21, IsPaid = true };
        var ltSick = new LeaveType { Id = Guid.NewGuid(), Name = "Sick Leave", Description = "Paid medical and illness leave", DefaultDaysPerYear = 15, IsPaid = true };
        var ltCasual = new LeaveType { Id = Guid.NewGuid(), Name = "Casual Leave", Description = "Emergency occasional personal leave", DefaultDaysPerYear = 6, IsPaid = true };
        var ltMaternity = new LeaveType { Id = Guid.NewGuid(), Name = "Maternity Leave", Description = "Statutory maternity entitlement", DefaultDaysPerYear = 90, IsPaid = true };
        var ltUnpaid = new LeaveType { Id = Guid.NewGuid(), Name = "Unpaid Leave", Description = "Approved leave without pay", DefaultDaysPerYear = 30, IsPaid = false };

        _db.LeaveTypes.AddRange(ltAnnual, ltSick, ltCasual, ltMaternity, ltUnpaid);
        await _db.SaveChangesAsync(ct);

        foreach (var emp in allEmployees)
        {
            _db.LeaveBalances.Add(new LeaveBalance { Id = Guid.NewGuid(), EmployeeId = emp.Id, LeaveTypeId = ltAnnual.Id, Year = 2026, TotalDays = 21, UsedDays = 3 });
            _db.LeaveBalances.Add(new LeaveBalance { Id = Guid.NewGuid(), EmployeeId = emp.Id, LeaveTypeId = ltSick.Id, Year = 2026, TotalDays = 15, UsedDays = 1 });
            _db.LeaveBalances.Add(new LeaveBalance { Id = Guid.NewGuid(), EmployeeId = emp.Id, LeaveTypeId = ltCasual.Id, Year = 2026, TotalDays = 6, UsedDays = 1 });
        }

        _db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(), EmployeeId = emp6.Id, LeaveTypeId = ltAnnual.Id,
            StartDate = new DateOnly(2026, 9, 10), EndDate = new DateOnly(2026, 9, 14),
            Duration = 4, Reason = "Annual family vacation in Alexandria", Status = LeaveRequestStatus.Approved, ApprovedBy = emp2.FullName
        });
        _db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(), EmployeeId = emp8.Id, LeaveTypeId = ltSick.Id,
            StartDate = new DateOnly(2026, 9, 2), EndDate = new DateOnly(2026, 9, 3),
            Duration = 2, Reason = "Medical checkup and flu recovery", Status = LeaveRequestStatus.Approved, ApprovedBy = emp2.FullName
        });
        _db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(), EmployeeId = emp7.Id, LeaveTypeId = ltAnnual.Id,
            StartDate = new DateOnly(2026, 10, 5), EndDate = new DateOnly(2026, 10, 8),
            Duration = 3, Reason = "Personal leave", Status = LeaveRequestStatus.Pending
        });
        await _db.SaveChangesAsync(ct);

        // 9. Seed Attendance for this week
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int i = 0; i < 5; i++)
        {
            var workDate = today.AddDays(-i);
            foreach (var emp in allEmployees)
            {
                _db.Attendances.Add(new Attendance
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = emp.Id,
                    Date = workDate,
                    CheckIn = new TimeOnly(9, 0),
                    CheckOut = new TimeOnly(17, 30),
                    WorkingHours = 8.0m,
                    OvertimeHours = (emp.DepartmentId == deptEng.Id && i % 2 == 0) ? 1.5m : 0m,
                    Status = AttendanceStatus.Present
                });
            }
        }
        await _db.SaveChangesAsync(ct);

        // 10. Seed Payroll Period & Payroll Records
        var payrollPeriod = new PayrollPeriod
        {
            Id = Guid.NewGuid(),
            Name = "September 2026 Payroll Register",
            StartDate = new DateOnly(2026, 9, 1),
            EndDate = new DateOnly(2026, 9, 30),
            PayDate = new DateOnly(2026, 9, 30),
            Status = PayrollStatus.Posted
        };
        _db.PayrollPeriods.Add(payrollPeriod);
        await _db.SaveChangesAsync(ct);

        foreach (var emp in allEmployees)
        {
            var gross = emp.MonthlySalary;
            var tax = Math.Round(gross * 0.10m, 2);
            var socialInsurance = Math.Round(gross * 0.11m, 2);
            var deductions = tax + socialInsurance;
            var net = gross - deductions;

            var pr = new Payroll
            {
                Id = Guid.NewGuid(),
                EmployeeId = emp.Id,
                PayrollPeriodId = payrollPeriod.Id,
                BasicSalary = gross,
                GrossSalary = gross,
                Taxes = tax,
                Deductions = socialInsurance,
                NetSalary = net,
                Status = PayrollStatus.Posted
            };
            _db.Payrolls.Add(pr);

            _db.PayrollItems.Add(new PayrollItem { Id = Guid.NewGuid(), PayrollId = pr.Id, Description = "Basic Base Salary", Category = "Earning", Amount = gross });
            _db.PayrollItems.Add(new PayrollItem { Id = Guid.NewGuid(), PayrollId = pr.Id, Description = "Egyptian Income Tax", Category = "Deduction", Amount = tax });
            _db.PayrollItems.Add(new PayrollItem { Id = Guid.NewGuid(), PayrollId = pr.Id, Description = "Social Insurance Contribution", Category = "Deduction", Amount = socialInsurance });
        }
        await _db.SaveChangesAsync(ct);

        // 11. Seed Recruitment Openings & Candidates
        var job1 = new JobOpening { Id = Guid.NewGuid(), Title = "Senior Cloud Architect (.NET & Azure)", DepartmentId = deptEng.Id, SalaryMin = 45000, SalaryMax = 80000, IsActive = true, Requirements = "7+ years in enterprise C#, Azure, microservices" };
        var job2 = new JobOpening { Id = Guid.NewGuid(), Title = "Talent Acquisition Lead", DepartmentId = deptHR.Id, SalaryMin = 25000, SalaryMax = 40000, IsActive = true, Requirements = "4+ years in tech recruiting in Egyptian market" };
        var job3 = new JobOpening { Id = Guid.NewGuid(), Title = "Financial Planning & Analysis Analyst", DepartmentId = deptFin.Id, SalaryMin = 20000, SalaryMax = 35000, IsActive = true, Requirements = "3+ years in budgeting, financial modeling" };
        _db.JobOpenings.AddRange(job1, job2, job3);
        await _db.SaveChangesAsync(ct);

        _db.Candidates.AddRange(
            new Candidate { Id = Guid.NewGuid(), JobOpeningId = job1.Id, Name = "Sherif Mahmoud", Email = "sherif.mahmoud@gmail.com", Phone = "+20 10 7771 2233", Stage = RecruitmentStage.Interview, Status = CandidateStatus.Active },
            new Candidate { Id = Guid.NewGuid(), JobOpeningId = job2.Id, Name = "Dina Fathy", Email = "dina.fathy@outlook.com", Phone = "+20 11 8882 3344", Stage = RecruitmentStage.Offer, Status = CandidateStatus.Active },
            new Candidate { Id = Guid.NewGuid(), JobOpeningId = job3.Id, Name = "Amr El-Gazzar", Email = "amr.gazzar@yahoo.com", Phone = "+20 12 9993 4455", Stage = RecruitmentStage.Applied, Status = CandidateStatus.Active }
        );
        await _db.SaveChangesAsync(ct);

        // 12. Seed Performance Reviews & Goals
        var pr1 = new PerformanceReview { Id = Guid.NewGuid(), EmployeeId = emp6.Id, ReviewPeriod = "Q2 2026", Score = 4.8m, GoalsCompletePercent = 100, Status = PerformanceReviewStatus.Approved, Comments = "Exceptional leadership in modernizing cloud microservices." };
        var pr2 = new PerformanceReview { Id = Guid.NewGuid(), EmployeeId = emp7.Id, ReviewPeriod = "Q2 2026", Score = 4.5m, GoalsCompletePercent = 95, Status = PerformanceReviewStatus.Approved, Comments = "Delivered critical UI and ERP client portal features ahead of schedule." };
        var pr3 = new PerformanceReview { Id = Guid.NewGuid(), EmployeeId = emp3.Id, ReviewPeriod = "Q2 2026", Score = 4.6m, GoalsCompletePercent = 100, Status = PerformanceReviewStatus.Approved, Comments = "Successfully closed multiple key engineering hires." };
        _db.PerformanceReviews.AddRange(pr1, pr2, pr3);
        await _db.SaveChangesAsync(ct);

        _db.PerformanceGoals.Add(new PerformanceGoal { Id = Guid.NewGuid(), PerformanceReviewId = pr1.Id, Title = "Architect High-Availability Multi-Tenant Database", Weight = 50, CompletionPercent = 100 });
        _db.PerformanceGoals.Add(new PerformanceGoal { Id = Guid.NewGuid(), PerformanceReviewId = pr2.Id, Title = "Optimize Frontend Data Loading & Table Latency", Weight = 50, CompletionPercent = 100 });
        await _db.SaveChangesAsync(ct);

        // 13. Seed Benefits & Employee Benefits
        var ben1 = new Benefit { Id = Guid.NewGuid(), PlanName = "AXA Gold Medical Healthcare Network", Provider = "AXA Egypt", EmployerCostMonthly = 2500, EmployeeCostMonthly = 0, Status = BenefitStatus.Active };
        var ben2 = new Benefit { Id = Guid.NewGuid(), PlanName = "Smart Village Shuttle & Transportation Allowance", Provider = "Indigo Internal", EmployerCostMonthly = 1200, EmployeeCostMonthly = 0, Status = BenefitStatus.Active };
        var ben3 = new Benefit { Id = Guid.NewGuid(), PlanName = "Wellness & Gym Subsidy", Provider = "Smart Gym", EmployerCostMonthly = 800, EmployeeCostMonthly = 200, Status = BenefitStatus.Active };
        _db.Benefits.AddRange(ben1, ben2, ben3);
        await _db.SaveChangesAsync(ct);

        foreach (var emp in allEmployees)
        {
            _db.EmployeeBenefits.Add(new EmployeeBenefit { Id = Guid.NewGuid(), EmployeeId = emp.Id, BenefitId = ben1.Id, EnrollmentDate = new DateOnly(2023, 1, 1), IsActive = true });
            _db.EmployeeBenefits.Add(new EmployeeBenefit { Id = Guid.NewGuid(), EmployeeId = emp.Id, BenefitId = ben2.Id, EnrollmentDate = new DateOnly(2023, 1, 1), IsActive = true });
        }
        await _db.SaveChangesAsync(ct);

        // 14. Seed Egyptian Standard Chart of Accounts (COA)
        var accCash = new Account { Id = Guid.NewGuid(), Code = "1010", Name = "Cash on Hand - Vault EGP", Type = AccountType.Asset, Balance = 85000, Description = "Cash on Hand and Vault" };
        var accCIB = new Account { Id = Guid.NewGuid(), Code = "1020", Name = "Commercial International Bank (CIB) - Operating C/A", Type = AccountType.Asset, Balance = 2850000, Description = "Primary Operating Bank Account" };
        var accNBE = new Account { Id = Guid.NewGuid(), Code = "1021", Name = "National Bank of Egypt (NBE) - Treasury", Type = AccountType.Asset, Balance = 1500000, Description = "Secondary Treasury & Operations" };
        var accMisr = new Account { Id = Guid.NewGuid(), Code = "1022", Name = "Banque Misr - Payroll Disbursal", Type = AccountType.Asset, Balance = 450000, Description = "Designated Corporate Payroll Account" };
        var accAR = new Account { Id = Guid.NewGuid(), Code = "1100", Name = "Accounts Receivable (Trade Debtors)", Type = AccountType.Asset, Balance = 160000, Description = "Customer Invoices Receivable" };
        var accEquip = new Account { Id = Guid.NewGuid(), Code = "1200", Name = "IT Hardware & Server Equipment", Type = AccountType.Asset, Balance = 620000, Description = "Servers, Laptops and Office Hardware" };
        var accAP = new Account { Id = Guid.NewGuid(), Code = "2010", Name = "Accounts Payable (Trade Creditors)", Type = AccountType.Liability, Balance = 117000, Description = "Vendor Bills and Payables" };
        var accVAT = new Account { Id = Guid.NewGuid(), Code = "2030", Name = "Egyptian Tax Authority - VAT Payable (14%)", Type = AccountType.Liability, Balance = 58800, Description = "Sales VAT Collected" };
        var accCap = new Account { Id = Guid.NewGuid(), Code = "3010", Name = "Paid-in Share Capital", Type = AccountType.Equity, Balance = 4000000, Description = "Authorized and Issued Capital" };
        var accRevLic = new Account { Id = Guid.NewGuid(), Code = "4010", Name = "Enterprise Software Subscriptions", Type = AccountType.Revenue, Balance = 325000, Description = "SaaS and Software Licensing" };
        var accRevCons = new Account { Id = Guid.NewGuid(), Code = "4020", Name = "Cloud Integration & Architecture Consulting", Type = AccountType.Revenue, Balance = 235000, Description = "Professional Implementation Services" };
        var accExpSal = new Account { Id = Guid.NewGuid(), Code = "5010", Name = "Staff Salaries & Compensation", Type = AccountType.Expense, Balance = 419000, Description = "Gross Monthly Staff Payroll" };
        var accExpRent = new Account { Id = Guid.NewGuid(), Code = "5020", Name = "Smart Village Campus Lease & Facilities", Type = AccountType.Expense, Balance = 75000, Description = "Smart Village Office Rent" };
        var accExpCloud = new Account { Id = Guid.NewGuid(), Code = "5030", Name = "Cloud Hosting & Datacenter Infrastructure", Type = AccountType.Expense, Balance = 42000, Description = "Azure and AWS Datacenter Bills" };
        var accExpNet = new Account { Id = Guid.NewGuid(), Code = "5040", Name = "Telecom Egypt Dedicated Fiber Lines", Type = AccountType.Expense, Balance = 18500, Description = "Corporate Internet & Networking" };

        _db.Accounts.AddRange(accCash, accCIB, accNBE, accMisr, accAR, accEquip, accAP, accVAT, accCap, accRevLic, accRevCons, accExpSal, accExpRent, accExpCloud, accExpNet);
        await _db.SaveChangesAsync(ct);

        // 15. Seed Egyptian Customers
        var cust1 = new Customer { Id = Guid.NewGuid(), Name = "Vodafone Egypt Telecommunications SAE", Email = "enterprise@vodafone.com.eg", Phone = "+20 2 2529 2000", Address = "Smart Village, Building C3, Giza", ContactPerson = "Eng. Mohamed Nabil", OutstandingBalance = 0 };
        var cust2 = new Customer { Id = Guid.NewGuid(), Name = "Raya Information Technology", Email = "b2b@rayait.com", Phone = "+20 2 3827 6000", Address = "6th of October City, Giza", ContactPerson = "Mr. Tamer Essam", OutstandingBalance = 0 };
        var cust3 = new Customer { Id = Guid.NewGuid(), Name = "Banque Misr Tech Center", Email = "fintech@banquemisr.com", Phone = "+20 2 2392 2000", Address = "Downtown Cairo", ContactPerson = "Mrs. Mona Kassem", OutstandingBalance = 120000 };
        var cust4 = new Customer { Id = Guid.NewGuid(), Name = "Fawry Banking & Payment Technology", Email = "operations@fawry.com", Phone = "+20 2 3537 1100", Address = "Smart Village, Building B109, Giza", ContactPerson = "Eng. Ashraf Sabry", OutstandingBalance = 40000 };
        var cust5 = new Customer { Id = Guid.NewGuid(), Name = "Telecom Egypt (WE)", Email = "corporate@te.eg", Phone = "+20 2 3131 5555", Address = "KM 28 Cairo-Alex Desert Road", ContactPerson = "Mr. Adel Hamed", OutstandingBalance = 0 };

        _db.Customers.AddRange(cust1, cust2, cust3, cust4, cust5);
        await _db.SaveChangesAsync(ct);

        // 16. Seed Egyptian Vendors
        var vend1 = new Vendor { Id = Guid.NewGuid(), Name = "Telecom Egypt (Data Center Services)", Email = "datacenter@te.eg", Phone = "+20 2 3131 5500", Address = "Smart Village, Giza", ContactPerson = "Eng. Hossam Roushdy", OutstandingBalance = 18500 };
        var vend2 = new Vendor { Id = Guid.NewGuid(), Name = "Smart Village Facilities Management Co.", Email = "facilities@smart-villages.com", Phone = "+20 2 3535 0000", Address = "Smart Village, Giza", ContactPerson = "Eng. Amr Helmy", OutstandingBalance = 0 };
        var vend3 = new Vendor { Id = Guid.NewGuid(), Name = "Tradeline Stores (Apple IT Hardware)", Email = "corporate@tradelinestores.com", Phone = "+20 2 3762 1000", Address = "Mohandessin, Giza", ContactPerson = "Mr. Ihab Saeed", OutstandingBalance = 0 };
        var vend4 = new Vendor { Id = Guid.NewGuid(), Name = "AXA Egypt Healthcare Insurance", Email = "corporate@axa-egypt.com", Phone = "+20 2 2461 4000", Address = "New Cairo, Egypt", ContactPerson = "Dr. Sameh Fouad", OutstandingBalance = 24000 };
        var vend5 = new Vendor { Id = Guid.NewGuid(), Name = "Elsewedy Electric Data Systems", Email = "systems@elsewedy.com", Phone = "+20 2 2759 9700", Address = "5th Settlement, New Cairo", ContactPerson = "Eng. Ahmed Sewedy", OutstandingBalance = 74500 };

        _db.Vendors.AddRange(vend1, vend2, vend3, vend4, vend5);
        await _db.SaveChangesAsync(ct);

        // 17. Seed Invoices & Invoice Items
        var inv1 = new Invoice
        {
            Id = Guid.NewGuid(), InvoiceNumber = "INV-2026-001", CustomerId = cust1.Id,
            IssueDate = today.AddDays(-20), DueDate = today.AddDays(10),
            SubTotal = 162280.70m, TaxAmount = 22719.30m, TotalAmount = 185000,
            PaidAmount = 185000, Balance = 0, Status = InvoiceStatus.Paid,
            Notes = "Enterprise ERP Implementation Milestone 1"
        };
        var inv2 = new Invoice
        {
            Id = Guid.NewGuid(), InvoiceNumber = "INV-2026-002", CustomerId = cust2.Id,
            IssueDate = today.AddDays(-15), DueDate = today.AddDays(15),
            SubTotal = 83333.33m, TaxAmount = 11666.67m, TotalAmount = 95000,
            PaidAmount = 95000, Balance = 0, Status = InvoiceStatus.Paid,
            Notes = "Cloud Architecture Consulting Services"
        };
        var inv3 = new Invoice
        {
            Id = Guid.NewGuid(), InvoiceNumber = "INV-2026-003", CustomerId = cust4.Id,
            IssueDate = today.AddDays(-10), DueDate = today.AddDays(20),
            SubTotal = 122807.02m, TaxAmount = 17192.98m, TotalAmount = 140000,
            PaidAmount = 100000, Balance = 40000, Status = InvoiceStatus.PartiallyPaid,
            Notes = "Custom Microservices Integration"
        };
        var inv4 = new Invoice
        {
            Id = Guid.NewGuid(), InvoiceNumber = "INV-2026-004", CustomerId = cust3.Id,
            IssueDate = today.AddDays(-3), DueDate = today.AddDays(27),
            SubTotal = 105263.16m, TaxAmount = 14736.84m, TotalAmount = 120000,
            PaidAmount = 0, Balance = 120000, Status = InvoiceStatus.Sent,
            Notes = "FinTech Cyber Security & Audit Retainer"
        };
        _db.Invoices.AddRange(inv1, inv2, inv3, inv4);
        await _db.SaveChangesAsync(ct);

        _db.InvoiceItems.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = inv1.Id, Description = "ERP Implementation & Customization", Quantity = 1, UnitPrice = 162280.70m, TaxRate = 14, TaxAmount = 22719.30m, Total = 185000 });
        _db.InvoiceItems.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = inv2.Id, Description = "Cloud Architecture Optimization", Quantity = 1, UnitPrice = 83333.33m, TaxRate = 14, TaxAmount = 11666.67m, Total = 95000 });
        _db.InvoiceItems.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = inv3.Id, Description = "Microservices API Engine", Quantity = 1, UnitPrice = 122807.02m, TaxRate = 14, TaxAmount = 17192.98m, Total = 140000 });
        _db.InvoiceItems.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = inv4.Id, Description = "FinTech Core Security Audit", Quantity = 1, UnitPrice = 105263.16m, TaxRate = 14, TaxAmount = 14736.84m, Total = 120000 });
        await _db.SaveChangesAsync(ct);

        // 18. Seed Payments
        var pay1 = new Payment
        {
            Id = Guid.NewGuid(), PaymentNumber = "PAY-2026-001", CustomerId = cust1.Id, InvoiceId = inv1.Id,
            Method = PaymentMethod.BankTransfer, Amount = 185000, PaymentDate = today.AddDays(-12),
            Reference = "CIB-TRF-98231", Status = PaymentStatus.Posted, Notes = "Paid in full via CIB corporate transfer"
        };
        var pay2 = new Payment
        {
            Id = Guid.NewGuid(), PaymentNumber = "PAY-2026-002", CustomerId = cust2.Id, InvoiceId = inv2.Id,
            Method = PaymentMethod.BankTransfer, Amount = 95000, PaymentDate = today.AddDays(-8),
            Reference = "CIB-TRF-98442", Status = PaymentStatus.Posted, Notes = "Settled in full via bank transfer"
        };
        var pay3 = new Payment
        {
            Id = Guid.NewGuid(), PaymentNumber = "PAY-2026-003", CustomerId = cust4.Id, InvoiceId = inv3.Id,
            Method = PaymentMethod.BankTransfer, Amount = 100000, PaymentDate = today.AddDays(-4),
            Reference = "NBE-TRF-55102", Status = PaymentStatus.Posted, Notes = "First installment payment"
        };
        _db.Payments.AddRange(pay1, pay2, pay3);
        await _db.SaveChangesAsync(ct);

        // 19. Seed Expenses
        var exp1 = new Expense
        {
            Id = Guid.NewGuid(), Title = "Smart Village Campus Office Lease Q3", Category = "Rent",
            Amount = 75000, ExpenseDate = today.AddDays(-18), Status = ExpenseStatus.Approved,
            ApprovedBy = "Tarek El-Sayed", Description = "Quarterly office space rental in Building 12B"
        };
        var exp2 = new Expense
        {
            Id = Guid.NewGuid(), Title = "Azure Cloud & Managed Infrastructure", Category = "Cloud Hosting",
            Amount = 42000, ExpenseDate = today.AddDays(-14), Status = ExpenseStatus.Approved,
            ApprovedBy = "Tarek El-Sayed", Description = "Monthly Azure cloud subscriptions and VM clusters"
        };
        var exp3 = new Expense
        {
            Id = Guid.NewGuid(), Title = "Telecom Egypt Dedicated Leased Fiber (1Gbps)", Category = "Internet",
            Amount = 18500, ExpenseDate = today.AddDays(-10), Status = ExpenseStatus.Approved,
            ApprovedBy = "Tarek El-Sayed", Description = "High-speed corporate optical fiber line"
        };
        var exp4 = new Expense
        {
            Id = Guid.NewGuid(), Title = "AXA Egypt Medical Insurance Monthly Premium", Category = "Insurance",
            Amount = 24000, ExpenseDate = today.AddDays(-6), Status = ExpenseStatus.Approved,
            ApprovedBy = "Tarek El-Sayed", Description = "Company-wide healthcare coverage premium"
        };
        var exp5 = new Expense
        {
            Id = Guid.NewGuid(), Title = "Office Supplies & Staff Refreshments", Category = "Supplies",
            Amount = 9500, ExpenseDate = today.AddDays(-2), Status = ExpenseStatus.Approved,
            ApprovedBy = "Ahmed Mansour", Description = "Monthly cafeteria supplies and office stationery"
        };
        _db.Expenses.AddRange(exp1, exp2, exp3, exp4, exp5);
        await _db.SaveChangesAsync(ct);

        // 20. Seed Balanced Journal Entries
        var je1 = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-2026-0001", EntryDate = today.AddDays(-30),
            Reference = "CAP-INCORP", Description = "Initial Capital Infusion into CIB Operating Account",
            TotalDebit = 4000000, TotalCredit = 4000000, Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow.AddDays(-30), PostedBy = "Tarek El-Sayed"
        };
        _db.JournalEntries.Add(je1);
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je1.Id, AccountId = accCIB.Id, Description = "Initial Deposit", Debit = 4000000, Credit = 0 });
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je1.Id, AccountId = accCap.Id, Description = "Share Capital Issued", Debit = 0, Credit = 4000000 });

        var je2 = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-2026-0002", EntryDate = today.AddDays(-20),
            Reference = "INV-2026-001", Description = "Revenue recognition for Vodafone ERP contract",
            TotalDebit = 185000, TotalCredit = 185000, Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow.AddDays(-20), PostedBy = "Mariam Shenouda"
        };
        _db.JournalEntries.Add(je2);
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je2.Id, AccountId = accAR.Id, Description = "Trade Receivable - Vodafone", Debit = 185000, Credit = 0 });
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je2.Id, AccountId = accRevLic.Id, Description = "Enterprise Software Licensing", Debit = 0, Credit = 162280.70m });
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je2.Id, AccountId = accVAT.Id, Description = "14% Output VAT", Debit = 0, Credit = 22719.30m });

        var je3 = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-2026-0003", EntryDate = today.AddDays(-12),
            Reference = "PAY-2026-001", Description = "Customer settlement received from Vodafone into CIB",
            TotalDebit = 185000, TotalCredit = 185000, Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow.AddDays(-12), PostedBy = "Mariam Shenouda"
        };
        _db.JournalEntries.Add(je3);
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je3.Id, AccountId = accCIB.Id, Description = "Bank Wire Receipt", Debit = 185000, Credit = 0 });
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je3.Id, AccountId = accAR.Id, Description = "Clear Vodafone Receivable", Debit = 0, Credit = 185000 });

        var je4 = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-2026-0004", EntryDate = today.AddDays(-18),
            Reference = "EXP-RENT-Q3", Description = "Rent Payment for Smart Village Campus",
            TotalDebit = 75000, TotalCredit = 75000, Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow.AddDays(-18), PostedBy = "Tarek El-Sayed"
        };
        _db.JournalEntries.Add(je4);
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je4.Id, AccountId = accExpRent.Id, Description = "Smart Village Q3 Rent", Debit = 75000, Credit = 0 });
        _db.JournalLines.Add(new JournalLine { Id = Guid.NewGuid(), JournalEntryId = je4.Id, AccountId = accCIB.Id, Description = "Payment from CIB Account", Debit = 0, Credit = 75000 });
        await _db.SaveChangesAsync(ct);

        // 21. Seed Budgets
        var b1 = new Budget { Id = Guid.NewGuid(), Name = "Software Engineering Budget 2026", DepartmentId = deptEng.Id, FiscalYear = 2026, TotalBudget = 6000000, ActualSpend = 1850000, Status = BudgetStatus.Active };
        var b2 = new Budget { Id = Guid.NewGuid(), Name = "Human Resources Budget 2026", DepartmentId = deptHR.Id, FiscalYear = 2026, TotalBudget = 1500000, ActualSpend = 420000, Status = BudgetStatus.Active };
        var b3 = new Budget { Id = Guid.NewGuid(), Name = "Finance & Operations Budget 2026", DepartmentId = deptFin.Id, FiscalYear = 2026, TotalBudget = 2500000, ActualSpend = 680000, Status = BudgetStatus.Active };
        _db.Budgets.AddRange(b1, b2, b3);
        await _db.SaveChangesAsync(ct);

        _db.BudgetLines.Add(new BudgetLine { Id = Guid.NewGuid(), BudgetId = b1.Id, AccountId = accExpCloud.Id, Description = "Cloud Hosting & Datacenters", BudgetedAmount = 600000, ActualAmount = 180000 });
        _db.BudgetLines.Add(new BudgetLine { Id = Guid.NewGuid(), BudgetId = b1.Id, AccountId = accEquip.Id, Description = "Hardware & Development Machines", BudgetedAmount = 500000, ActualAmount = 310000 });
        _db.BudgetLines.Add(new BudgetLine { Id = Guid.NewGuid(), BudgetId = b2.Id, Description = "Recruitment & Onboarding Portals", BudgetedAmount = 300000, ActualAmount = 95000 });
        await _db.SaveChangesAsync(ct);

        // 22. Seed Tax Rates
        _db.TaxRates.AddRange(
            new TaxRate { Id = Guid.NewGuid(), Name = "Egyptian Standard VAT (14%)", Rate = 14, Category = TaxCategory.Sales, IsActive = true, Description = "General VAT on products and professional services" },
            new TaxRate { Id = Guid.NewGuid(), Name = "Withholding Tax - Contracting & Services (1%)", Rate = 1, Category = TaxCategory.Services, IsActive = true, Description = "Egyptian standard withholding deduction" },
            new TaxRate { Id = Guid.NewGuid(), Name = "Commercial & Industrial Profit Tax (22.5%)", Rate = 22.5m, Category = TaxCategory.Sales, IsActive = true, Description = "Standard Egyptian Corporate Income Tax rate" }
        );
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            success = true,
            message = "Database reset and seeded with fresh Egyptian enterprise data.",
            company = company.Name,
            employees = allEmployees.Length,
            departments = 5,
            users = new[]
            {
                new { email = "admin@indigo.co", role = "Administrator", name = "Saif AlDin Ahmed" },
                new { email = "hr@indigo.co", role = "HR Manager", name = "Ahmed Mansour" },
                new { email = "finance@indigo.co", role = "Finance Manager", name = "Tarek El-Sayed" },
                new { email = "accountant@indigo.co", role = "Accountant", name = "Mariam Shenouda" }
            }
        });
    }

    private async Task ResetAllDataAsync(CancellationToken ct)
    {
        await _db.Database.ExecuteSqlRawAsync(@"
            EXEC sp_MSforeachtable ""ALTER TABLE ? NOCHECK CONSTRAINT ALL"";
            DELETE FROM [AuditLogs];
            DELETE FROM [Payments];
            DELETE FROM [InvoiceItems];
            DELETE FROM [Invoices];
            DELETE FROM [Bills];
            DELETE FROM [Expenses];
            DELETE FROM [BudgetLines];
            DELETE FROM [Budgets];
            DELETE FROM [TaxRates];
            DELETE FROM [JournalLines];
            DELETE FROM [JournalEntries];
            DELETE FROM [Customers];
            DELETE FROM [Vendors];
            DELETE FROM [Accounts];
            DELETE FROM [EmployeeDocuments];
            DELETE FROM [EmployeeBenefits];
            DELETE FROM [Benefits];
            DELETE FROM [PerformanceGoals];
            DELETE FROM [PerformanceReviews];
            DELETE FROM [Candidates];
            DELETE FROM [JobOpenings];
            DELETE FROM [PayrollItems];
            DELETE FROM [Payrolls];
            DELETE FROM [PayrollPeriods];
            DELETE FROM [LeaveRequests];
            DELETE FROM [LeaveBalances];
            DELETE FROM [LeaveTypes];
            DELETE FROM [Attendances];
            DELETE FROM [Employees];
            DELETE FROM [Positions];
            DELETE FROM [Departments];
            DELETE FROM [Companies];
            EXEC sp_MSforeachtable ""ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL"";
        ", ct);
    }

    private async Task EnsureRolesAndPermissionsAsync(CancellationToken ct)
    {
        foreach (var role in Permissions.RoleGrants.Keys)
        {
            if (!await _roleManager.RoleExistsAsync(role))
                await _roleManager.CreateAsync(new ApplicationRole { Name = role, Description = $"{role} role" });
        }

        var existingPermissions = await _db.Permissions.ToDictionaryAsync(p => p.Name, p => p, ct);
        foreach (var name in Permissions.All)
        {
            if (existingPermissions.ContainsKey(name)) continue;
            var parts = name.Split('.');
            var permission = new Permission { Name = name, Module = parts[0], Action = parts[1] };
            _db.Permissions.Add(permission);
            existingPermissions[name] = permission;
        }
        await _db.SaveChangesAsync(ct);

        var roles = await _roleManager.Roles.ToListAsync(ct);
        var existingGrants = await _db.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId }).ToListAsync(ct);
        var grantSet = existingGrants.Select(g => (g.RoleId, g.PermissionId)).ToHashSet();

        foreach (var role in roles)
        {
            if (!Permissions.RoleGrants.TryGetValue(role.Name!, out var granted)) continue;
            foreach (var permissionName in granted)
            {
                if (!existingPermissions.TryGetValue(permissionName, out var permission)) continue;
                if (grantSet.Contains((role.Id, permission.Id))) continue;
                _db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
                grantSet.Add((role.Id, permission.Id));
            }
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task EnsureUsersAsync()
    {
        var usersToEnsure = new[]
        {
            new { Email = "admin@indigo.co", Password = "Admin@123456", FullName = "Saif AlDin Ahmed", Department = "Executive Management", Role = "Administrator" },
            new { Email = "hr@indigo.co", Password = "Hr@123456", FullName = "Ahmed Mansour", Department = "Human Resources", Role = "HR Manager" },
            new { Email = "finance@indigo.co", Password = "Finance@123456", FullName = "Tarek El-Sayed", Department = "Finance & Accounting", Role = "Finance Manager" },
            new { Email = "accountant@indigo.co", Password = "Accountant@123456", FullName = "Mariam Shenouda", Department = "Finance & Accounting", Role = "Accountant" },
            new { Email = "viewer@indigo.co", Password = "Viewer@123456", FullName = "Viewer User", Department = "Auditing & Inspection", Role = "Viewer" }
        };

        foreach (var target in usersToEnsure)
        {
            var user = await _userManager.FindByEmailAsync(target.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = target.Email,
                    Email = target.Email,
                    FullName = target.FullName,
                    Department = target.Department,
                    EmailConfirmed = true,
                    IsActive = true
                };
                var createResult = await _userManager.CreateAsync(user, target.Password);
                if (createResult.Succeeded)
                {
                    await _userManager.AddToRoleAsync(user, target.Role);
                }
            }
            else
            {
                user.FullName = target.FullName;
                user.Department = target.Department;
                user.IsActive = true;
                await _userManager.UpdateAsync(user);

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                await _userManager.ResetPasswordAsync(user, token, target.Password);

                var currentRoles = await _userManager.GetRolesAsync(user);
                if (!currentRoles.Contains(target.Role))
                {
                    await _userManager.AddToRoleAsync(user, target.Role);
                }
            }
        }
    }
}
