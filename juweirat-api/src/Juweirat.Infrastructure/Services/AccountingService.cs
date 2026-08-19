using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Accounting;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Service comptable — lecture seule dans le paquet 1.
// L'émission de mouvements (PostMovement) sera ajoutée dans le paquet 2 avec les hooks
// dans PaymentService / VenteDirecteService / FactureService / FolioService.
public class AccountingService(AppDbContext db)
{
    public async Task<PagedResult<AccountDto>> GetAccountsAsync(AccountFilterParams filter)
    {
        var query = db.Accounts.AsQueryable();

        if (filter.IncludeInactive != true)
            query = query.Where(a => a.IsActive);

        if (!string.IsNullOrWhiteSpace(filter.Kind)
            && Enum.TryParse<AccountKind>(filter.Kind, ignoreCase: true, out var kind))
        {
            query = query.Where(a => a.Kind == kind);
        }

        query = query.ApplySearch(filter.Search, a => a.Name);

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderBy(a => a.Kind).ThenBy(a => a.Name);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<AccountDto?> GetAccountByIdAsync(long id)
    {
        var a = await db.Accounts.FindAsync(id);
        return a is null ? null : ToDto(a);
    }

    public async Task<PagedResult<AccountMovementDto>> GetMovementsAsync(MovementFilterParams filter)
    {
        var query = db.AccountMovements
            .Include(m => m.FromAccount)
            .Include(m => m.ToAccount)
            .AsQueryable();

        if (filter.From is not null)
            query = query.Where(m => m.Date >= filter.From.Value);
        if (filter.To is not null)
            query = query.Where(m => m.Date <= filter.To.Value);

        if (filter.AccountId is not null)
            query = query.Where(m => m.FromAccountId == filter.AccountId || m.ToAccountId == filter.AccountId);

        if (!string.IsNullOrWhiteSpace(filter.Reason)
            && Enum.TryParse<MovementReason>(filter.Reason, ignoreCase: true, out var reason))
        {
            query = query.Where(m => m.Reason == reason);
        }

        if (!string.IsNullOrWhiteSpace(filter.SourceType))
            query = query.Where(m => m.SourceType == filter.SourceType);

        if (filter.SessionId is not null)
            query = query.Where(m => m.SessionId == filter.SessionId);

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderByDescending(m => m.Date);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<List<CashRegisterDto>> GetCashRegistersAsync(bool includeInactive = false)
    {
        var registers = await db.CashRegisters
            .Where(r => includeInactive || r.IsActive)
            .OrderBy(r => r.Name)
            .ToListAsync();

        var registerIds = registers.Select(r => r.Id).ToList();
        var accounts = await db.Accounts
            .Where(a => a.Kind == AccountKind.CashRegister
                        && a.OwnerRefId != null
                        && registerIds.Contains(a.OwnerRefId!.Value))
            .ToDictionaryAsync(a => a.OwnerRefId!.Value);

        return registers.Select(r =>
        {
            accounts.TryGetValue(r.Id, out var acc);
            return new CashRegisterDto(
                r.Id,
                r.Name,
                r.Location,
                r.IsActive,
                acc?.Id,
                acc?.Balance ?? 0m,
                r.CreatedAt
            );
        }).ToList();
    }

    // ── Auto-création de comptes auxiliaires ────────────────────────
    // Appelée par ClientService / CompanyService / PrestationAnnexeService après
    // création d'un tiers, dans la même transaction si possible. Idempotent :
    // si le compte existe déjà pour (kind, ownerRefId), no-op silencieux.
    public async Task EnsureAuxiliaryAccountAsync(AccountKind kind, long ownerRefId, string displayName)
    {
        var exists = await db.Accounts.AnyAsync(a => a.Kind == kind && a.OwnerRefId == ownerRefId);
        if (exists) return;

        db.Accounts.Add(new Juweirat.Domain.Entities.Account
        {
            Kind       = kind,
            Name       = string.IsNullOrWhiteSpace(displayName) ? $"{kind} #{ownerRefId}" : displayName,
            OwnerRefId = ownerRefId,
            Balance    = 0m,
        });
        await db.SaveChangesAsync();
    }

    // ── Mapping ─────────────────────────────────────────────────────
    private static AccountDto ToDto(Juweirat.Domain.Entities.Account a) => new(
        a.Id,
        a.Kind.ToString(),
        a.Name,
        a.OwnerRefId,
        a.Balance,
        a.IsActive,
        a.CreatedAt,
        a.UpdatedAt
    );

    private static AccountMovementDto ToDto(Juweirat.Domain.Entities.AccountMovement m) => new(
        m.Id,
        m.Date,
        m.FromAccountId,
        m.FromAccount.Name,
        m.ToAccountId,
        m.ToAccount.Name,
        m.Amount,
        m.Reason.ToString(),
        m.SourceType,
        m.SourceId,
        m.SessionId,
        m.CreatedByUserId,
        m.Label
    );
}
