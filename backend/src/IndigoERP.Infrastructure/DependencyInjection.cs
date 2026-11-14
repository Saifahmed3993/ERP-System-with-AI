using IndigoERP.Application.Interfaces;
using IndigoERP.Domain.Entities.Admin;
using IndigoERP.Domain.Interfaces;
using IndigoERP.Infrastructure.Data;
using IndigoERP.Infrastructure.Repositories;
using IndigoERP.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace IndigoERP.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<IndigoDbContext>(options =>
            options.UseSqlServer(config.GetConnectionString("DefaultConnection"),
                sql => sql.MigrationsAssembly(typeof(IndigoDbContext).Assembly.FullName)));

        services.AddIdentity<ApplicationUser, ApplicationRole>(opt =>
        {
            opt.Password.RequireDigit = true;
            opt.Password.RequireLowercase = true;
            opt.Password.RequireUppercase = true;
            opt.Password.RequireNonAlphanumeric = false;
            opt.Password.RequiredLength = 8;
            opt.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<IndigoDbContext>()
        .AddDefaultTokenProviders();

        // Infrastructure services
        services.AddHttpContextAccessor();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<ISequenceGenerator, SequenceGenerator>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Application services (implementations in Infrastructure)
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IPositionService, PositionService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<ILeaveService, LeaveService>();
        services.AddScoped<IPayrollService, PayrollService>();
        services.AddScoped<IRecruitmentService, RecruitmentService>();
        services.AddScoped<IPerformanceService, PerformanceService>();
        services.AddScoped<IBenefitsService, BenefitsService>();
        services.AddScoped<IDocumentsService, DocumentsService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IVendorService, VendorService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IUserAdminService, UserAdminService>();

        return services;
    }
}

