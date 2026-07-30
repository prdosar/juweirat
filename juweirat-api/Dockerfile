# Stage 1 — restore & build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first for layer caching
COPY Juweirat.slnx ./
COPY src/Juweirat.Domain/Juweirat.Domain.csproj              src/Juweirat.Domain/
COPY src/Juweirat.Application/Juweirat.Application.csproj    src/Juweirat.Application/
COPY src/Juweirat.Infrastructure/Juweirat.Infrastructure.csproj src/Juweirat.Infrastructure/
COPY src/Juweirat.Api/Juweirat.Api.csproj                    src/Juweirat.Api/

RUN dotnet restore src/Juweirat.Api/Juweirat.Api.csproj

# Copy everything and publish
COPY . .
RUN dotnet publish src/Juweirat.Api/Juweirat.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2 — runtime (minimal ASP.NET image)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Non-root user for security (Debian-based image)
RUN groupadd --system --gid 1001 dotnet && \
    useradd  --system --uid 1001 --gid dotnet appuser

COPY --from=build --chown=appuser:dotnet /app/publish .

USER appuser
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Juweirat.Api.dll"]
