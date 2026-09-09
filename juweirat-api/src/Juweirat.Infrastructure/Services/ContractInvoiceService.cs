using Juweirat.Application.DTOs.CompanyContracts;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Factures périodiques de contrats compagnie long terme.
// La fréquence (Mensuelle/Trimestrielle/Semestrielle/Annuelle) est portée par le
// contrat ; les périodes s'alignent sur StartDate (date d'anniversaire), pas sur
// le calendrier civil. Une facture par (contrat × periodIndex) — garanti par
// l'index unique en base.
public class ContractInvoiceService(AppDbContext db, AccountingService accountingService)
{
    // Taux TVA appliqué au Togo — miroir de FactureService/AccountingService.
    private const decimal TVA_RATE = 0.18m;

    // ── Lecture ─────────────────────────────────────────────────────────

    public async Task<List<ContractInvoiceDto>> GetByContractAsync(long contractId)
    {
        var invoices = await db.ContractInvoices
            .Include(i => i.Contract).ThenInclude(c => c.Company)
            .Include(i => i.Contract).ThenInclude(c => c.Room)
            .Where(i => i.CompanyContractId == contractId)
            .OrderByDescending(i => i.PeriodIndex)
            .ToListAsync();
        return invoices.Select(ToDto).ToList();
    }

    public async Task<ContractInvoiceDto?> GetByIdAsync(long id)
    {
        var invoice = await db.ContractInvoices
            .Include(i => i.Contract).ThenInclude(c => c.Company)
            .Include(i => i.Contract).ThenInclude(c => c.Room)
            .FirstOrDefaultAsync(i => i.Id == id);
        return invoice is null ? null : ToDto(invoice);
    }

    // ── Génération ──────────────────────────────────────────────────────
    // Idempotence : l'index unique (contractId, periodIndex) empêche les doublons.
    // La période est calculée à partir de contract.StartDate + (periodIndex-1)×N mois,
    // où N est le nombre de mois par période (Mensuel=1, Trimestriel=3, etc.).
    // Si la période dépasse contract.EndDate, on tronque et on proratise.
    public async Task<(ContractInvoiceDto? dto, string? error)> GenerateAsync(
        long contractId, int periodIndex, long? userId)
    {
        if (periodIndex < 1) return (null, "L'index de période doit être ≥ 1.");

        var contract = await db.CompanyContracts
            .Include(c => c.Company)
            .Include(c => c.Room)
            .FirstOrDefaultAsync(c => c.Id == contractId);
        if (contract is null) return (null, "Contrat introuvable.");

        if (contract.Status == ContractStatus.Cancelled)
            return (null, "Impossible de facturer un contrat annulé.");

        var monthsPerPeriod = contract.BillingFrequency.MonthsPerPeriod();

        // Période "naturelle" : [periodStart, naturalEnd[ (exclusive).
        var periodStart = contract.StartDate.AddMonths((periodIndex - 1) * monthsPerPeriod);
        var naturalEnd  = periodStart.AddMonths(monthsPerPeriod);

        if (periodStart >= contract.EndDate)
            return (null, $"La période P{periodIndex} est au-delà de la fin du contrat.");

        // Tronquée si le contrat s'arrête avant la fin naturelle.
        var effectiveEnd = naturalEnd < contract.EndDate ? naturalEnd : contract.EndDate;

        var activeDays = effectiveEnd.DayNumber - periodStart.DayNumber;
        var fullDays   = naturalEnd.DayNumber - periodStart.DayNumber;
        if (activeDays <= 0)
            return (null, $"La période P{periodIndex} ne couvre aucun jour actif.");

        // Anti-doublon applicatif (double sécurité en plus de l'index DB).
        var exists = await db.ContractInvoices
            .AnyAsync(i => i.CompanyContractId == contractId && i.PeriodIndex == periodIndex);
        if (exists)
            return (null, $"Une facture existe déjà pour la période P{periodIndex} sur ce contrat.");

        // Snapshot montant — prorata si période partielle (dernière période tronquée).
        var fullPeriodHt = contract.MonthlyRate * monthsPerPeriod;
        int totalHt = activeDays == fullDays
            ? fullPeriodHt
            : (int)Math.Round((decimal)fullPeriodHt * activeDays / fullDays);
        int tva      = contract.TvaExonere ? 0 : (int)Math.Round(totalHt * TVA_RATE);
        int totalTtc = totalHt + tva;

        // Notes automatiques si période partielle (contrat s'arrête au milieu).
        string? autoNotes = null;
        if (activeDays != fullDays)
        {
            autoNotes = $"Période partielle : {activeDays} jour(s) sur {fullDays} " +
                        $"({periodStart:dd/MM/yyyy} → {effectiveEnd.AddDays(-1):dd/MM/yyyy})";
        }

        var year = periodStart.Year;
        var invoice = new ContractInvoice
        {
            Number              = await GenerateNumberAsync(year),
            CompanyContractId   = contract.Id,
            PeriodIndex         = periodIndex,
            MonthsCovered       = monthsPerPeriod,
            Year                = year,
            PeriodStart         = periodStart,
            PeriodEnd           = effectiveEnd.AddDays(-1),  // inclusive
            TotalHt             = totalHt,
            Tva                 = tva,
            TotalTtc            = totalTtc,
            TvaRate             = contract.TvaExonere ? 0m : TVA_RATE,
            TvaExonere          = contract.TvaExonere,
            ElecIncluded        = contract.ElecIncluded,
            Status              = ContractInvoiceStatus.Issued,
            IssuedAt            = DateTime.UtcNow,
            IssuedByUserId      = userId,
            Notes               = autoNotes,
        };
        db.ContractInvoices.Add(invoice);
        await db.SaveChangesAsync();

        // Écriture comptable — vente HT + TVA au débit du compte compagnie.
        // Fire-and-forget non bloquant (miroir du pattern FactureService).
        try
        {
            var periodLabel = FormatPeriodLabel(invoice);
            await accountingService.PostContractInvoiceSaleAsync(
                companyId:  contract.CompanyId,
                amountHt:   totalHt,
                tvaExonere: contract.TvaExonere,
                sourceType: "ContractInvoice",
                sourceId:   invoice.Id,
                label:      $"Facture {invoice.Number} · {contract.Company.Name} · Ch. {contract.Room.RoomNumber} · {periodLabel} · {(contract.ElecIncluded ? "élec incluse" : "hors élec")}");
        }
        catch { /* silent */ }

        invoice.Contract = contract;
        return (ToDto(invoice), null);
    }

    // ── Marquer payée ───────────────────────────────────────────────────

    public async Task<(ContractInvoiceDto? dto, string? error)> MarkPaidAsync(
        long id, MarkInvoicePaidRequest req, long? userId)
    {
        if (string.IsNullOrWhiteSpace(req.PaymentMethod))
            return (null, "Mode de paiement requis.");

        var invoice = await db.ContractInvoices
            .Include(i => i.Contract).ThenInclude(c => c.Company)
            .Include(i => i.Contract).ThenInclude(c => c.Room)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return (null, null);

        if (invoice.Status == ContractInvoiceStatus.Paid)
            return (null, "Facture déjà payée.");
        if (invoice.Status == ContractInvoiceStatus.Cancelled)
            return (null, "Impossible d'encaisser une facture annulée.");

        var paidOn = req.PaidOn ?? DateOnly.FromDateTime(DateTime.UtcNow);

        invoice.Status        = ContractInvoiceStatus.Paid;
        invoice.PaidAt        = paidOn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        invoice.PaymentMethod = req.PaymentMethod;
        invoice.PaymentRef    = req.PaymentRef;
        await db.SaveChangesAsync();

        // Écriture comptable — encaissement Company → Caisse.
        try
        {
            await accountingService.PostContractInvoicePaidAsync(
                companyId:       invoice.Contract.CompanyId,
                amount:          invoice.TotalTtc,
                sourceType:      "ContractInvoice",
                sourceId:        invoice.Id,
                label:           $"Encaissement facture {invoice.Number} · {invoice.Contract.Company.Name}",
                createdByUserId: userId);
        }
        catch { /* silent */ }

        return (ToDto(invoice), null);
    }

    // ── Annuler ─────────────────────────────────────────────────────────
    // Contre-passe l'écriture de vente pour rester équilibré. Si la facture
    // était déjà payée, il faut manuellement ré-encaisser un remboursement.
    public async Task<(ContractInvoiceDto? dto, string? error)> CancelAsync(long id)
    {
        var invoice = await db.ContractInvoices
            .Include(i => i.Contract).ThenInclude(c => c.Company)
            .Include(i => i.Contract).ThenInclude(c => c.Room)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return (null, null);
        if (invoice.Status == ContractInvoiceStatus.Cancelled)
            return (null, "Facture déjà annulée.");
        if (invoice.Status == ContractInvoiceStatus.Paid)
            return (null, "Facture déjà payée — encaisser un remboursement manuel avant d'annuler.");

        invoice.Status = ContractInvoiceStatus.Cancelled;
        await db.SaveChangesAsync();

        try
        {
            await accountingService.ReverseContractInvoiceSaleAsync(
                companyId:  invoice.Contract.CompanyId,
                amountHt:   invoice.TotalHt,
                tvaExonere: invoice.TvaExonere,
                sourceType: "ContractInvoice",
                sourceId:   invoice.Id,
                label:      $"Facture {invoice.Number}");
        }
        catch { /* silent */ }

        return (ToDto(invoice), null);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    // Numérotation : CT-INV-YYYY-NNNN, compteur reset chaque année civile
    // (basé sur l'année de PeriodStart). Race possible en concurrence ; l'index
    // unique sur `number` en base sera la sécurité en cas de collision.
    private async Task<string> GenerateNumberAsync(int year)
    {
        var count = await db.ContractInvoices.CountAsync(i => i.Year == year) + 1;
        return $"CT-INV-{year}-{count:D4}";
    }

    // Libellé lisible d'une période, adapté à la fréquence de la facture.
    // Ex : Mensuel "P3 (15/08→14/09/2026)" · Trimestriel "T P2 (15/09→14/12/2026)"…
    private static string FormatPeriodLabel(ContractInvoice i)
    {
        var kind = i.MonthsCovered switch
        {
            3  => "Trim.",
            6  => "Sem.",
            12 => "An.",
            _  => "Mens.",
        };
        return $"{kind} P{i.PeriodIndex} ({i.PeriodStart:dd/MM/yyyy}→{i.PeriodEnd:dd/MM/yyyy})";
    }

    private static ContractInvoiceDto ToDto(ContractInvoice i) => new(
        i.Id, i.Number,
        i.CompanyContractId, i.Contract.Reference,
        i.Contract.CompanyId, i.Contract.Company.Name,
        i.Contract.RoomId, i.Contract.Room.RoomNumber,
        i.PeriodIndex, i.MonthsCovered, i.Year,
        i.PeriodStart, i.PeriodEnd,
        i.TotalHt, i.Tva, i.TotalTtc, i.TvaRate, i.TvaExonere, i.ElecIncluded,
        i.Status.ToString(),
        i.IssuedAt, i.PaidAt, i.PaymentMethod, i.PaymentRef,
        i.Notes, i.CreatedAt
    );
}
