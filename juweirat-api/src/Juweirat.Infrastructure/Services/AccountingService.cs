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

    // ── Journal de caisse (paquet 2c) ────────────────────────────────
    // Retourne un tableau chronologique des événements comptables, chaque
    // ligne = un événement (Payment/VenteDirecte/Facture) avec ses totaux
    // HT/TVA/TTC/encaissé/décaissé.
    public async Task<JournalReportDto> GetJournalAsync(JournalFilterParams filter)
    {
        var query = db.AccountMovements
            .Include(m => m.FromAccount)
            .Include(m => m.ToAccount)
            .AsQueryable();

        if (filter.From.HasValue) query = query.Where(m => m.Date >= filter.From.Value);
        if (filter.To.HasValue)   query = query.Where(m => m.Date <= filter.To.Value);

        var movements = await query.OrderBy(m => m.Date).ToListAsync();

        // Groupement par événement source (SourceType + SourceId).
        // On ignore les mouvements manuels ("Manual") pour l'instant — pas de source concrète.
        var grouped = movements
            .Where(m => !string.IsNullOrEmpty(m.SourceType) && m.SourceId.HasValue)
            .GroupBy(m => new { m.SourceType, m.SourceId })
            .ToList();

        var entries = new List<JournalEntryDto>();
        foreach (var g in grouped)
        {
            var first = g.OrderBy(x => x.Date).First();
            var ht        = g.Where(x => x.Reason == MovementReason.Vente).Sum(x => x.Amount);
            var tva       = g.Where(x => x.Reason == MovementReason.TvaCollectee).Sum(x => x.Amount);
            var encaisse  = g.Where(x => x.Reason == MovementReason.Encaissement
                                         && x.ToAccount.Kind == AccountKind.CashRegister).Sum(x => x.Amount);
            var decaisse  = g.Where(x => x.Reason == MovementReason.SortieCaisse
                                         && x.FromAccount.Kind == AccountKind.CashRegister).Sum(x => x.Amount);

            // Mode de règlement : depuis Payment ou VenteDirecte.
            string? paymentMethod = null;
            if (g.Key.SourceType == "Payment")
            {
                var p = await db.Payments.FindAsync(g.Key.SourceId!.Value);
                paymentMethod = p?.Method.ToString();
            }
            else if (g.Key.SourceType == "VenteDirecte")
            {
                var v = await db.VentesDirectes.FindAsync(g.Key.SourceId!.Value);
                paymentMethod = v?.PaymentMethod;
            }

            entries.Add(new JournalEntryDto(
                SourceType:    g.Key.SourceType!,
                SourceId:      g.Key.SourceId!.Value,
                Date:          first.Date,
                Label:         first.Label ?? $"{g.Key.SourceType} #{g.Key.SourceId}",
                Ht:            ht,
                Tva:           tva,
                Ttc:           ht + tva,
                Encaisse:      encaisse,
                Decaisse:      decaisse,
                PaymentMethod: paymentMethod
            ));
        }

        // Filtre optionnel mode de règlement (post-agrégation car dérivé).
        if (!string.IsNullOrWhiteSpace(filter.PaymentMethod))
        {
            var pm = filter.PaymentMethod;
            entries = entries.Where(e => e.PaymentMethod == pm).ToList();
        }

        entries = entries.OrderByDescending(e => e.Date).ToList();

        return new JournalReportDto(
            From:           filter.From,
            To:             filter.To,
            Entries:        entries,
            TotalHt:        entries.Sum(e => e.Ht),
            TotalTva:       entries.Sum(e => e.Tva),
            TotalTtc:       entries.Sum(e => e.Ttc),
            TotalEncaisse:  entries.Sum(e => e.Encaisse),
            TotalDecaisse:  entries.Sum(e => e.Decaisse)
        );
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

    // ── Écritures comptables (paquet 2a) ────────────────────────────
    // Toutes les méthodes de posting sont fire-and-forget côté appelant :
    // en cas d'erreur, on log et on continue — jamais bloquant pour le métier.

    private const decimal TVA_RATE = 0.18m;

    // Récupère un compte système (Kind unique, OwnerRefId=null).
    // Retourne null si absent (le seed devrait l'avoir créé au démarrage).
    private async Task<Juweirat.Domain.Entities.Account?> GetSystemAccountAsync(AccountKind kind)
        => await db.Accounts.FirstOrDefaultAsync(a => a.Kind == kind && a.OwnerRefId == null);

    // Récupère un compte auxiliaire (par tiers). Retourne null si absent.
    private async Task<Juweirat.Domain.Entities.Account?> GetAuxiliaryAccountAsync(AccountKind kind, long ownerRefId)
        => await db.Accounts.FirstOrDefaultAsync(a => a.Kind == kind && a.OwnerRefId == ownerRefId);

    // Cherche la première caisse (Réception par défaut) et son compte de trésorerie.
    // Retourne null si aucune caisse configurée.
    private async Task<Juweirat.Domain.Entities.Account?> GetDefaultCashAccountAsync()
    {
        var register = await db.CashRegisters
            .Where(r => r.IsActive)
            .OrderBy(r => r.Id)
            .FirstOrDefaultAsync();
        if (register is null) return null;
        return await GetAuxiliaryAccountAsync(AccountKind.CashRegister, register.Id);
    }

    // Crée un mouvement + met à jour les 2 soldes. Ne SaveChanges pas.
    private void QueueMovement(
        Juweirat.Domain.Entities.Account from,
        Juweirat.Domain.Entities.Account to,
        decimal amount,
        MovementReason reason,
        string sourceType,
        long sourceId,
        string label,
        long? sessionId = null,
        long? createdByUserId = null)
    {
        if (amount <= 0) return;

        db.AccountMovements.Add(new Juweirat.Domain.Entities.AccountMovement
        {
            Date            = DateTime.UtcNow,
            FromAccountId   = from.Id,
            ToAccountId     = to.Id,
            Amount          = amount,
            Reason          = reason,
            SourceType      = sourceType,
            SourceId        = sourceId,
            SessionId       = sessionId,
            CreatedByUserId = createdByUserId,
            Label           = label,
        });

        // Convention : Balance de X = SUM(mvts vers X) - SUM(mvts depuis X)
        from.Balance -= amount;
        to.Balance   += amount;
    }

    // Comptabilise une vente : produit HT sur le compte revenu + TVA sur le compte TVA.
    // Les deux contreparties vont sur le compte client (ou la caisse pour les walk-in).
    // Ne comptabilise pas l'encaissement — utiliser PostEncaissementAsync séparément.
    public async Task PostSaleAsync(
        long? clientId,
        AccountKind revenueKind,
        long? revenueOwnerRefId,      // pour Prestation : PrestationAnnexe.Id ; sinon null (compte système)
        decimal amountTtc,
        bool tvaExonere,
        string sourceType,
        long sourceId,
        string label)
    {
        if (amountTtc <= 0) return;

        // Compte contrepartie : client si connu, sinon caisse par défaut (walk-in).
        Juweirat.Domain.Entities.Account? counterAccount;
        if (clientId is not null)
        {
            counterAccount = await GetAuxiliaryAccountAsync(AccountKind.Client, clientId.Value);
        }
        else
        {
            counterAccount = await GetDefaultCashAccountAsync();
        }
        if (counterAccount is null) return;

        // Compte revenu : Prestation (auxiliaire) ou système (Hebergement / NoShow / Cancellation).
        Juweirat.Domain.Entities.Account? revenueAccount = revenueOwnerRefId is not null
            ? await GetAuxiliaryAccountAsync(revenueKind, revenueOwnerRefId.Value)
            : await GetSystemAccountAsync(revenueKind);
        if (revenueAccount is null) return;

        int ttc  = (int)Math.Round(amountTtc);
        int ht, tva;
        if (tvaExonere)
        {
            ht  = ttc;
            tva = 0;
        }
        else
        {
            ht  = (int)Math.Round(ttc / (1m + TVA_RATE));
            tva = ttc - ht;
        }

        QueueMovement(revenueAccount, counterAccount, ht,
            MovementReason.Vente, sourceType, sourceId,
            tva > 0 ? $"{label} — HT" : label);

        if (tva > 0)
        {
            var tvaAccount = await GetSystemAccountAsync(AccountKind.TvaCollected);
            if (tvaAccount is not null)
            {
                QueueMovement(tvaAccount, counterAccount, tva,
                    MovementReason.TvaCollectee, sourceType, sourceId, $"{label} — TVA 18%");
            }
        }

        await db.SaveChangesAsync();
    }

    // Comptabilise un encaissement : le client règle son compte, l'argent va en caisse.
    // Si clientId=null, on encaisse directement en caisse sans passer par un compte tiers
    // (utilisé pour VenteDirecte walk-in où PostSale a déjà routé vers la caisse).
    public async Task PostEncaissementAsync(
        long? clientId,
        decimal amount,
        string sourceType,
        long sourceId,
        string label,
        long? sessionId = null,
        long? createdByUserId = null)
    {
        if (amount <= 0 || clientId is null) return;

        var clientAccount = await GetAuxiliaryAccountAsync(AccountKind.Client, clientId.Value);
        if (clientAccount is null) return;

        var cashAccount = await GetDefaultCashAccountAsync();
        if (cashAccount is null) return;

        QueueMovement(clientAccount, cashAccount, amount,
            MovementReason.Encaissement, sourceType, sourceId, label,
            sessionId, createdByUserId);

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
