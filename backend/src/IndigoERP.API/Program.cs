using System.Text;
using System.Text.Json.Serialization;
using IndigoERP.API.Authorization;
using IndigoERP.Application;
using IndigoERP.Application.Common;
using IndigoERP.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/indigo-erp-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // Add services
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();

    builder.Services.AddControllers()
        .AddJsonOptions(o =>
        {
            o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        })
        .ConfigureApiBehaviorOptions(o =>
        {
            // Model-binding failures must use the same { error, errors } envelope as
            // business validation, otherwise the client shows "Bad Request" with no detail.
            o.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kv => System.Text.Json.JsonNamingPolicy.CamelCase.ConvertName(kv.Key),
                        kv => kv.Value!.Errors.Select(e =>
                            string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage).ToArray());
                var message = errors.SelectMany(e => e.Value).FirstOrDefault() ?? "The request is invalid.";
                return new BadRequestObjectResult(new { error = message, errors });
            };
        });

    // JWT Authentication
    builder.Services.AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ClockSkew = TimeSpan.Zero
        };
    });

    // Permission-based authorization: one policy per Module.Action.
    builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
    builder.Services.AddAuthorization(options => options.AddPermissionPolicies());

    // CORS for React frontend
    builder.Services.AddCors(opt => opt.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(builder.Configuration["Cors:Origins"]?.Split(',') ?? new[] { "http://localhost:5173", "http://localhost:5174" })
            .AllowAnyHeader().AllowAnyMethod()
            .WithExposedHeaders("Content-Disposition")
            .AllowCredentials()));

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    // Global error handling — every exception type maps to a deliberate status code
    // so clients never see a 500 for something they could have fixed themselves.
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;

            var (status, message, errors) = ex switch
            {
                ValidationException ve => (400, ve.Message, (object?)ve.Errors),
                ConflictException ce => (409, ce.Message, null),
                NotFoundException nf => (404, nf.Message, null),
                UnauthorizedAccessException ue => (401, ue.Message, null),
                KeyNotFoundException kf => (404, kf.Message, null),
                InvalidOperationException io => (400, io.Message, null),
                ArgumentException ae => (400, ae.Message, null),
                FormatException fe => (400, fe.Message, null),
                DbUpdateConcurrencyException => (409,
                    "This record was changed by someone else while you were working on it. Reload and try again.", null),
                DbUpdateException => (409, "The change conflicts with existing data or a database constraint.", null),
                _ => (500, "An unexpected error occurred.", null),
            };

            if (status >= 500) Log.Error(ex, "Unhandled exception");
            else Log.Warning("Request rejected with {Status}: {Message}", status, message);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = status;
            if (errors is null)
                await context.Response.WriteAsJsonAsync(new { error = message });
            else
                await context.Response.WriteAsJsonAsync(new { error = message, errors });
        });
    });

    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("AllowFrontend");
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    // System initialization on startup
    using (var scope = app.Services.CreateScope())
    {
        var initializer = new IndigoERP.API.SystemInitializer(scope.ServiceProvider, builder.Configuration);
        await initializer.InitializeAsync();
    }

    Log.Information("Indigo ERP API started on {Urls}", string.Join(", ", app.Urls));
    app.Run();
}
catch (HostAbortedException)
{
    throw;
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
