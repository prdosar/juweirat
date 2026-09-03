using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Accounting;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Service comptable — écritures automatiques (paquet 2a) + lecture (paquets 1 & 2c).
// L'httpContext est optionnel : sans lui, les hooks continuent à écrire sans lier
// à une session (utile pour les backfills et les tests).
public class AccountingService(AppDbContext db, IHttpContextAccessor? httpContext = null)
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
        {
            var fromUtc = EnsureUtc(filter.From.Value);
            query = query.Where(m => m.Date >= fromUtc);
        }
        if (filter.To is not null)
        {
            var toUtc = EnsureUtc(filter.To.Value);
            query = query.Where(m => m.Date <= toUtc);
        }

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

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        };

    // ── Grand livre / Balance / TVA / OD (paquet 3) ─────────────────

    // Grand livre : parcours chrono des mouvements d'un compte avec solde progressif.
    // Formalisme comptable : "debit" = le compte perd (est débité), "credit" = le compte reçoit (est crédité).
    // Rappel : dans notre modèle Balance = SUM(mvts To=X) - SUM(mvts From=X).
    public async Task<LedgerReportDto?> GetLedgerAsync(long accountId, DateTime? from, DateTime? to)
    {
        var account = await db.Accounts.FindAsync(accountId);
        if (account is null) return null;

        var fromUtc = from.HasValue ? EnsureUtc(from.Value) : (DateTime?)null;
        var toUtc   = to.HasValue   ? EnsureUtc(to.Value)   : (DateTime?)null;

        var all = await db.AccountMovements
            .Include(m => m.FromAccount)
            .Include(m => m.ToAccount)
            .Where(m => m.FromAccountId == accountId || m.ToAccountId == accountId)
            .OrderBy(m => m.Date)
            .ToListAsync();

        // Solde d'ouverture = solde à la date "from" (mouvements strictement antérieurs).
        decimal opening = 0m;
        if (fromUtc.HasValue)
        {
            opening = all.Where(m => m.Date < fromUtc.Value)
                         .Sum(m => m.ToAccountId == accountId ? m.Amount : -m.Amount);
        }

        var window = all.AsEnumerable();
        if (fromUtc.HasValue) window = window.Where(m => m.Date >= fromUtc.Value);
        if (toUtc.HasValue)   window = window.Where(m => m.Date <= toUtc.Value);
        var lines = window.ToList();

        decimal runningBalance = opening;
        decimal debit  = 0m;
        decimal credit = 0m;
        var dtos = new List<LedgerLineDto>(lines.Count);
        foreach (var m in lines)
        {
            var isCredit = m.ToAccountId == accountId;
            var amount   = m.Amount;
            if (isCredit) { runningBalance += amount; credit += amount; }
            else          { runningBalance -= amount; debit  += amount; }

            dtos.Add(new LedgerLineDto(
                MovementId:            m.Id,
                Date:                  m.Date,
                Direction:             isCredit ? "credit" : "debit",
                Amount:                amount,
                Balance:               runningBalance,
                Reason:                m.Reason.ToString(),
                CounterpartAccountName: isCredit ? m.FromAccount.Name : m.ToAccount.Name,
                Label:                 m.Label,
                SourceType:            m.SourceType,
                SourceId:              m.SourceId
            ));
        }

        return new LedgerReportDto(
            Account:        ToDto(account),
            From:           fromUtc,
            To:             toUtc,
            OpeningBalance: opening,
            TotalDebit:     debit,
            TotalCredit:    credit,
            ClosingBalance: runningBalance,
            Lines:          dtos
        );
    }

    public async Task<BalanceReportDto> GetBalanceAsync(DateTime? from, DateTime? to, string? kindFilter)
    {
        var fromUtc = from.HasValue ? EnsureUtc(from.Value) : (DateTime?)null;
        var toUtc   = to.HasValue   ? EnsureUtc(to.Value)   : (DateTime?)null;

        var accountsQuery = db.Accounts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(kindFilter)
            && Enum.TryParse<AccountKind>(kindFilter, ignoreCase: true, out var k))
        {
            accountsQuery = accountsQuery.Where(a => a.Kind == k);
        }
        var accounts = await accountsQuery.OrderBy(a => a.Kind).ThenBy(a => a.Name).ToListAsync();
        var accountIds = accounts.Select(a => a.Id).ToHashSet();

        // Récupère tous les mouvements touchant nos comptes.
        var mvts = await db.AccountMovements
            .Where(m => accountIds.Contains(m.FromAccountId) || accountIds.Contains(m.ToAccountId))
            .ToListAsync();

        var lines = new List<BalanceLineDto>(accounts.Count);
        decimal totalDebit = 0, totalCredit = 0;
        foreach (var a in accounts)
        {
            decimal opening = 0;
            if (fromUtc.HasValue)
            {
                opening = mvts.Where(m => m.Date < fromUtc.Value)
                              .Sum(m => (m.ToAccountId == a.Id ? m.Amount : 0m) - (m.FromAccountId == a.Id ? m.Amount : 0m));
            }
            var inPeriod = mvts.Where(m =>
                (!fromUtc.HasValue || m.Date >= fromUtc.Value) &&
                (!toUtc.HasValue   || m.Date <= toUtc.Value));
            var debit  = inPeriod.Where(m => m.FromAccountId == a.Id).Sum(m => m.Amount);
            var credit = inPeriod.Where(m => m.ToAccountId   == a.Id).Sum(m => m.Amount);
            var closing = opening + credit - debit;

            // Skip les comptes sans activité en période et sans solde d'ouverture.
            if (opening == 0 && debit == 0 && credit == 0) continue;

            lines.Add(new BalanceLineDto(
                a.Id, a.Kind.ToString(), a.Name, a.OwnerRefId,
                opening, debit, credit, closing
            ));
            totalDebit  += debit;
            totalCredit += credit;
        }

        return new BalanceReportDto(fromUtc, toUtc, kindFilter, lines, totalDebit, totalCredit);
    }

    public async Task<TvaReportDto> GetTvaReportAsync(DateTime? from, DateTime? to)
    {
        var fromUtc = from.HasValue ? EnsureUtc(from.Value) : (DateTime?)null;
        var toUtc   = to.HasValue   ? EnsureUtc(to.Value)   : (DateTime?)null;

        var query = db.AccountMovements.AsQueryable();
        if (fromUtc.HasValue) query = query.Where(m => m.Date >= fromUtc.Value);
        if (toUtc.HasValue)   query = query.Where(m => m.Date <= toUtc.Value);

        var mvts = await query.ToListAsync();

        var grouped = mvts
            .Where(m => !string.IsNullOrEmpty(m.SourceType) && m.SourceId.HasValue)
            .GroupBy(m => new { m.SourceType, m.SourceId });

        var lines = new List<TvaReportLineDto>();
        foreach (var g in grouped)
        {
            var ht  = g.Where(x => x.Reason == MovementReason.Vente).Sum(x => x.Amount);
            var tva = g.Where(x => x.Reason == MovementReason.TvaCollectee).Sum(x => x.Amount);
            if (ht == 0 && tva == 0) continue;
            var first = g.OrderBy(x => x.Date).First();
            lines.Add(new TvaReportLineDto(
                g.Key.SourceType!, g.Key.SourceId!.Value,
                first.Date,
                first.Label ?? $"{g.Key.SourceType} #{g.Key.SourceId}",
                ht, tva, ht + tva
            ));
        }
        lines = lines.OrderByDescending(l => l.Date).ToList();

        return new TvaReportDto(
            From: fromUtc, To: toUtc,
            TotalHt:  lines.Sum(l => l.Ht),
            TotalTva: lines.Sum(l => l.Tva),
            TotalTtc: lines.Sum(l => l.Ttc),
            TvaRate:  TVA_RATE,
            Lines: lines
        );
    }

    // OD manuelle : crée un ensemble de mouvements équilibrés (débit = crédit).
    // Toutes les paires sont routées via un compte "pivot" — ici l'ordre débit → crédit.
    // Pour rester dans notre modèle from→to, on associe débits et crédits deux à deux
    // par montant : première ligne débit avec première ligne crédit, etc.
    // Contrainte : SUM(debit) = SUM(credit).
    public async Task<(int lignesCreees, string? error)> PostManualOdAsync(CreateOdRequest req, long? userId)
    {
        if (req.Lines is null || req.Lines.Count < 2)
            return (0, "Une OD doit contenir au moins deux lignes.");

        var debits  = req.Lines.Where(l => l.Direction?.ToLowerInvariant() == "debit").ToList();
        var credits = req.Lines.Where(l => l.Direction?.ToLowerInvariant() == "credit").ToList();
        if (debits.Count == 0 || credits.Count == 0)
            return (0, "L'OD doit contenir au moins un débit et un crédit.");

        var sumD = debits.Sum(l => l.Amount);
        var sumC = credits.Sum(l => l.Amount);
        if (sumD != sumC)
            return (0, $"OD non équilibrée : débit {sumD:0.##} ≠ crédit {sumC:0.##}.");

        // Charge tous les comptes concernés.
        var accountIds = req.Lines.Select(l => l.AccountId).Distinct().ToList();
        var accounts = await db.Accounts.Where(a => accountIds.Contains(a.Id)).ToListAsync();
        var accDict = accounts.ToDictionary(a => a.Id);
        if (accountIds.Any(id => !accDict.ContainsKey(id)))
            return (0, "Compte introuvable dans la liste des lignes.");

        // Association naïve : pour chaque débit, on tire des crédits jusqu'à couvrir son montant.
        // Génère N mouvements équilibrés from(debit) → to(credit).
        var date = req.Date ?? DateTime.UtcNow;
        // Génère un "SourceId" partagé pour permettre de retrouver les lignes de l'écriture.
        var sourceId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var creditsQueue = new Queue<(long AccountId, decimal Remaining, string? Label)>(
            credits.Select(c => (c.AccountId, c.Amount, c.Label))
        );

        int created = 0;
        foreach (var d in debits)
        {
            var remaining = d.Amount;
            while (remaining > 0 && creditsQueue.Count > 0)
            {
                var top = creditsQueue.Peek();
                var take = Math.Min(remaining, top.Remaining);
                var fromAccount = accDict[d.AccountId];
                var toAccount   = accDict[top.AccountId];

                db.AccountMovements.Add(new Juweirat.Domain.Entities.AccountMovement
                {
                    Date            = date,
                    FromAccountId   = fromAccount.Id,
                    ToAccountId     = toAccount.Id,
                    Amount          = take,
                    Reason          = MovementReason.Correction,
                    SourceType      = "Manual",
                    SourceId        = sourceId,
                    CreatedByUserId = userId,
                    Label           = string.IsNullOrWhiteSpace(req.Label)
                        ? $"{d.Label ?? ""} / {top.Label ?? ""}".Trim(' ', '/')
                        : req.Label,
                });
                fromAccount.Balance -= take;
                toAccount.Balance   += take;
                created++;

                remaining -= take;
                var newRemaining = top.Remaining - take;
                creditsQueue.Dequeue();
                if (newRemaining > 0) creditsQueue.Enqueue((top.AccountId, newRemaining, top.Label));
            }
        }

        await db.SaveChangesAsync();
        return (created, null);
    }

    // ── Journal de caisse (paquet 2c) ────────────────────────────────
    // Retourne un tableau chronologique des événements comptables, chaque
    // ligne = un événement (Payment/VenteDirecte/Facture) avec ses totaux
    // HT/TVA/TTC/encaissé/décaissé.
    public async Task<JournalReportDto> GetJournalAsync(JournalFilterParams filter)
    {
        var fromUtc = filter.From.HasValue ? EnsureUtc(filter.From.Value) : (DateTime?)null;
        var toUtc   = filter.To.HasValue   ? EnsureUtc(filter.To.Value)   : (DateTime?)null;

        var query = db.AccountMovements
            .Include(m => m.FromAccount)
            .Include(m => m.ToAccount)
            .AsQueryable();

        if (fromUtc.HasValue) query = query.Where(m => m.Date >= fromUtc.Value);
        if (toUtc.HasValue)   query = query.Where(m => m.Date <= toUtc.Value);

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
    //
    // Convention : le paramètre `amountHt` est TOUJOURS le montant HT (les prix stockés
    // dans le système — Rate, PrixSeule, PrixInclus, Total vente, TotalPrice résa —
    // sont HT). La TVA est calculée en AJOUTANT le taux, jamais en le déduisant.
    public async Task PostSaleAsync(
        long? clientId,
        AccountKind revenueKind,
        long? revenueOwnerRefId,      // pour Prestation : PrestationAnnexe.Id ; sinon null (compte système)
        decimal amountHt,
        bool tvaExonere,
        string sourceType,
        long sourceId,
        string label)
    {
        if (amountHt <= 0) return;

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

        int ht  = (int)Math.Round(amountHt);
        int tva = tvaExonere ? 0 : (int)Math.Round(ht * TVA_RATE);

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
    // sessionId / createdByUserId : si non fournis, on tente une auto-détection via
    // l'user JWT courant + sa session ouverte sur la caisse cible.
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

        var (autoSessionId, autoUserId) = await TryDetectCurrentSessionAsync(cashAccount.OwnerRefId);

        QueueMovement(clientAccount, cashAccount, amount,
            MovementReason.Encaissement, sourceType, sourceId, label,
            sessionId ?? autoSessionId, createdByUserId ?? autoUserId);

        await db.SaveChangesAsync();
    }

    // Entrée / sortie de caisse hors ventes (fond d'ouverture, retrait, achat matériel).
    // Contre-partie sur le compte système Expense pour rester équilibré.
    public async Task PostCashInOutAsync(
        long registerId,
        decimal amount,
        string direction,   // "in" | "out"
        string label,
        long? sessionId,
        long? userId,
        MovementReason reason)
    {
        if (amount <= 0) return;
        var dir = direction.ToLowerInvariant();
        if (dir != "in" && dir != "out") return;

        var cashAccount = await GetAuxiliaryAccountAsync(AccountKind.CashRegister, registerId);
        if (cashAccount is null) return;

        var expenseAccount = await GetSystemAccountAsync(AccountKind.Expense);
        if (expenseAccount is null) return;

        var (from, to) = dir == "in"
            ? (expenseAccount, cashAccount)   // entrée en caisse (fond ou apport)
            : (cashAccount, expenseAccount);  // sortie de caisse (retrait, achat)

        QueueMovement(from, to, amount, reason, "Manual", 0, label, sessionId, userId);
        await db.SaveChangesAsync();
    }

    // Comptabilise le paiement d'une charge depuis une caisse.
    // Caisse → Expense. Si pas de caisse précisée, utilise la caisse par défaut.
    public async Task PostExpensePaymentAsync(
        long expenseId,
        long? registerId,
        decimal amount,
        string label,
        long? createdByUserId = null)
    {
        if (amount <= 0) return;

        Juweirat.Domain.Entities.Account? cashAccount;
        if (registerId is not null)
            cashAccount = await GetAuxiliaryAccountAsync(AccountKind.CashRegister, registerId.Value);
        else
            cashAccount = await GetDefaultCashAccountAsync();

        if (cashAccount is null) return;

        var expenseAccount = await GetSystemAccountAsync(AccountKind.Expense);
        if (expenseAccount is null) return;

        var (_, autoUserId) = await TryDetectCurrentSessionAsync(cashAccount.OwnerRefId);

        QueueMovement(cashAccount, expenseAccount, amount,
            MovementReason.ChargeSortie, "Expense", expenseId, label,
            null, createdByUserId ?? autoUserId);

        await db.SaveChangesAsync();
    }

    // Annule le mouvement d'une charge (correction inverse).
    public async Task ReverseExpensePaymentAsync(
        long expenseId,
        long? registerId,
        decimal amount,
        string label)
    {
        if (amount <= 0) return;

        Juweirat.Domain.Entities.Account? cashAccount;
        if (registerId is not null)
            cashAccount = await GetAuxiliaryAccountAsync(AccountKind.CashRegister, registerId.Value);
        else
            cashAccount = await GetDefaultCashAccountAsync();

        if (cashAccount is null) return;

        var expenseAccount = await GetSystemAccountAsync(AccountKind.Expense);
        if (expenseAccount is null) return;

        // Inverse : Expense → Caisse
        QueueMovement(expenseAccount, cashAccount, amount,
            MovementReason.Correction, "Expense", expenseId, $"Annulation — {label}");

        await db.SaveChangesAsync();
    }

    // Comptabilise l'acquisition d'une immobilisation : Caisse → FixedAsset.
    public async Task PostAssetAcquisitionAsync(
        long assetId,
        long? registerId,
        decimal amount,
        string label,
        long? createdByUserId = null)
    {
        if (amount <= 0) return;

        Juweirat.Domain.Entities.Account? cashAccount;
        if (registerId is not null)
            cashAccount = await GetAuxiliaryAccountAsync(AccountKind.CashRegister, registerId.Value);
        else
            cashAccount = await GetDefaultCashAccountAsync();

        if (cashAccount is null) return;

        var fixedAssetAccount = await GetSystemAccountAsync(AccountKind.FixedAsset);
        if (fixedAssetAccount is null) return;

        var (_, autoUserId) = await TryDetectCurrentSessionAsync(cashAccount.OwnerRefId);

        QueueMovement(cashAccount, fixedAssetAccount, amount,
            MovementReason.Acquisition, "FixedAsset", assetId, label,
            null, createdByUserId ?? autoUserId);

        await db.SaveChangesAsync();
    }

    // Comptabilise une dotation aux amortissements : Expense → AccumulatedDepreciation.
    public async Task PostDepreciationAsync(
        long assetId,
        decimal amount,
        string period,
        string label)
    {
        if (amount <= 0) return;

        var expenseAccount = await GetSystemAccountAsync(AccountKind.Expense);
        if (expenseAccount is null) return;

        var accumDepAccount = await GetSystemAccountAsync(AccountKind.AccumulatedDepreciation);
        if (accumDepAccount is null) return;

        QueueMovement(expenseAccount, accumDepAccount, amount,
            MovementReason.Amortissement, "Depreciation", assetId, label);

        await db.SaveChangesAsync();
    }

    // Auto-détection de la session ouverte de l'utilisateur JWT courant sur une caisse donnée.
    // Retourne (null, null) si pas d'user contextuel ou pas de session ouverte.
    private async Task<(long? sessionId, long? userId)> TryDetectCurrentSessionAsync(long? registerOwnerRefId)
    {
        var userId = httpContext?.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? httpContext?.HttpContext?.User?.FindFirst("sub")?.Value;
        if (!long.TryParse(userId, out var uid) || registerOwnerRefId is null)
            return (null, long.TryParse(userId, out var u2) ? u2 : null);

        var session = await db.CashSessions
            .Where(s => s.OpenedByUserId == uid
                     && s.RegisterId == registerOwnerRefId.Value
                     && s.Status == CashSessionStatus.Open)
            .Select(s => new { s.Id })
            .FirstOrDefaultAsync();

        return (session?.Id, uid);
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
