FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY backend/IndigoERP.slnx backend/
COPY backend/src/IndigoERP.Domain/ backend/src/IndigoERP.Domain/
COPY backend/src/IndigoERP.Application/ backend/src/IndigoERP.Application/
COPY backend/src/IndigoERP.Infrastructure/ backend/src/IndigoERP.Infrastructure/
COPY backend/src/IndigoERP.API/ backend/src/IndigoERP.API/

WORKDIR /app/backend/src/IndigoERP.API
RUN dotnet publish -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "IndigoERP.API.dll"]
