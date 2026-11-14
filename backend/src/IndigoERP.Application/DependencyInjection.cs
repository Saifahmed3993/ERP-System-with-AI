using Microsoft.Extensions.DependencyInjection;

namespace IndigoERP.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Application-layer registrations (validators, MediatR, etc.) go here.
        // Service implementations are registered in Infrastructure.
        return services;
    }
}
