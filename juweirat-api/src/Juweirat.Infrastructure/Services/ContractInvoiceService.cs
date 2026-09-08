using Juweirat.Application.DTOs.CompanyContracts;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Factures mensuelles de contrats compagnie long terme.
// Une facture par (contrat × année × mois) — garanti par l'index unique en base.
// La facturation est indépendante des occupants : c'est le MonthlyRate figé au
// moment de l'émission (snapshot) qui compte.
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
            .OrderByDescending(i => i.Year).ThenByDescending(i => i.Month)
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
    // Idempotence : l'index unique (contractId, year, month) empêche les doublons.
    // Si le contrat ne couvre qu'une partie du mois (démarrage/fin en cours de
    // mois), le montant est proratisé au nombre de jours actifs / jours du mois.
    public async Task<(ContractInvoiceDto? dto, string? error)> GenerateAsync(
        long contractId, int year, int month, long? userId)
    {
        if (month is < 1 or > 12) return (null, "Mois invalide.");

        var contract = await db.CompanyContracts
            .Include(c => c.Company)
            .Include(c => c.Room)
            .FirstOrDefaultAsync(c => c.Id == contractId);
        if (contract is null) return (null, "Contrat introuvable.");

        if (contract.Status == ContractStatus.Cancelled)
            return (null, "Impossible de facturer un contrat annulé.");

        // Chevauchement contrat × mois civil.
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd   = monthStart.AddMonths(1).AddDays(-1); // dernier jour inclusif
        var daysInMonth = monthEnd.DayNumber - monthStart.DayNumber + 1;

        // Actif dans le mois = [max(StartDate, monthStart), min(EndDate - 1j, monthEnd)]
        // (EndDate est exclusive dans le contrat, monthEnd est inclusif ici)
        var contractLastDay = contract.EndDate.AddDays(-1);
        var activeStart = contract.StartDate > monthStart ? contract.StartDate : monthStart;
        var activeEnd   = contractLastDay   < monthEnd   ? contractLastDay   : monthEnd;
        if (activeEnd < activeStart)
            return (null, $"Le contrat ne couvre pas {month:D2}/{year}.");

        var activeDays = activeEnd.DayNumber - activeStart.DayNumber + 1;

        // Anti-doublon applicatif (double sécurité en plus de l'index DB).
        var exists = await db.ContractInvoices
            .AnyAsync(i => i.CompanyContractId == contractId && i.Year == year && i.Month == month);
        if (exists)
            return (null, $"Une facture existe déjà pour {month:D2}/{year} sur ce contrat.");

        // Snapshot montant — prorata si période partielle.
        int totalHt = activeDays == daysInMonth
            ? contract.MonthlyRate
            : (int)Math.Round((decimal)contract.MonthlyRate * activeDays / daysInMonth);
        int tva      = contract.TvaExonere ? 0 : (int)Math.Round(totalHt * TVA_RATE);
        int totalTtc = totalHt + tva;

        // Notes automatiques si période partielle.
        string? autoNotes = null;
        if (activeDays != daysInMonth)
        {
            autoNotes = $"Période partielle : {activeDays} jour(s) sur {daysInMonth} " +
                        $"({activeStart:dd/MM} → {activeEnd:dd/MM})";
        }

        var invoice = new ContractInvoice
        {
            Number              = await GenerateNumberAsync(year, month),
            CompanyContractId   = contract.Id,
            Year                = year,
            Month               = month,
            PeriodStart         = monthStart,
            PeriodEnd           = monthEnd,
            TotalHt             = totalHt,
            Tva                 = tva,
            TotalTtc            = totalTtc,
            TvaRate             = contract.TvaExonere ? 0m : TVA_RATE,
            TvaExonere          = contract.TvaExonere,
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
            await accountingService.PostContractInvoiceSaleAsync(
                companyId:  contract.CompanyId,
                amountHt:   totalHt,
                tvaExonere: contract.TvaExonere,
                sourceType: "ContractInvoice",
                sourceId:   invoice.Id,
                label:      $"Facture {invoice.Number} · {contract.Company.Name} · Ch. {contract.Room.RoomNumber} · {month:D2}/{year}");
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

    // Numérotation : CT-INV-YYYY-MM-NNNN, compteur reset chaque mois.
    // Race condition possible en concurrence (compteur = COUNT + 1) ; l'index
    // unique sur `number` en base sera la sécurité en cas de collision.
    private async Task<string> GenerateNumberAsync(int year, int month)
    {
        var count = await db.ContractInvoices
            .CountAsync(i => i.Year == year && i.Month == month) + 1;
        return $"CT-INV-{year}-{month:D2}-{count:D4}";
    }

    private static ContractInvoiceDto ToDto(ContractInvoice i) => new(
        i.Id, i.Number,
        i.CompanyContractId, i.Contract.Reference,
        i.Contract.CompanyId, i.Contract.Company.Name,
        i.Contract.RoomId, i.Contract.Room.RoomNumber,
        i.Year, i.Month, i.PeriodStart, i.PeriodEnd,
        i.TotalHt, i.Tva, i.TotalTtc, i.TvaRate, i.TvaExonere,
        i.Status.ToString(),
        i.IssuedAt, i.PaidAt, i.PaymentMethod, i.PaymentRef,
        i.Notes, i.CreatedAt
    );
}
