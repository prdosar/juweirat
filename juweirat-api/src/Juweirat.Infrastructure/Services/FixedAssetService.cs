using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.FixedAssets;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class FixedAssetService(AppDbContext db, AccountingService accountingService)
{
    public async Task<PagedResult<FixedAssetDto>> GetAllAsync(FixedAssetFilterParams filter)
    {
        var query = db.FixedAssets
            .Include(a => a.Supplier)
            .Include(a => a.DepreciationEntries)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status)
            && Enum.TryParse<AssetStatus>(filter.Status, ignoreCase: true, out var status))
        {
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category)
            && Enum.TryParse<AssetCategory>(filter.Category, ignoreCase: true, out var cat))
        {
            query = query.Where(a => a.Category == cat);
        }

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderByDescending(a => a.AcquisitionDate);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<FixedAssetDto?> GetByIdAsync(long id)
    {
        var asset = await db.FixedAssets
            .Include(a => a.Supplier)
            .Include(a => a.DepreciationEntries)
            .FirstOrDefaultAsync(a => a.Id == id);
        return asset is null ? null : ToDto(asset);
    }

    public async Task<(FixedAssetDto? dto, string? error)> CreateAsync(CreateFixedAssetRequest req, long? userId = null)
    {
        if (req.AcquisitionCost <= 0) return (null, "Le coût d'acquisition doit être positif.");
        if (req.UsefulLifeMonths <= 0) return (null, "La durée d'utilisation doit être supérieure à 0 mois.");
        if (req.ResidualValue < 0) return (null, "La valeur résiduelle ne peut pas être négative.");
        if (req.ResidualValue >= req.AcquisitionCost) return (null, "La valeur résiduelle doit être inférieure au coût d'acquisition.");

        if (!Enum.TryParse<AssetCategory>(req.Category, ignoreCase: true, out var category))
            return (null, $"Catégorie « {req.Category} » invalide.");
        if (!Enum.TryParse<DepreciationMethod>(req.DepreciationMethod, ignoreCase: true, out var method))
            return (null, $"Méthode « {req.DepreciationMethod} » invalide. Utiliser 'Linear' ou 'Declining'.");

        var asset = new FixedAsset
        {
            Name               = req.Name.Trim(),
            Description        = req.Description?.Trim(),
            Category           = category,
            AcquisitionDate    = EnsureUtc(req.AcquisitionDate),
            AcquisitionCost    = req.AcquisitionCost,
            UsefulLifeMonths   = req.UsefulLifeMonths,
            ResidualValue      = req.ResidualValue,
            DepreciationMethod = method,
            Notes              = req.Notes?.Trim(),
            SupplierId         = req.SupplierId,
        };
        db.FixedAssets.Add(asset);
        await db.SaveChangesAsync();

        // Écriture comptable : Caisse → FixedAsset
        try
        {
            await accountingService.PostAssetAcquisitionAsync(
                asset.Id,
                req.CashRegisterId,
                asset.AcquisitionCost,
                $"Acquisition — {asset.Name}",
                userId);
        }
        catch { }

        var dto = await GetByIdAsync(asset.Id);
        return (dto, null);
    }

    public async Task<(FixedAssetDto? dto, string? error)> UpdateAsync(long id, UpdateFixedAssetRequest req)
    {
        var asset = await db.FixedAssets.FindAsync(id);
        if (asset is null) return (null, "Immobilisation introuvable.");

        asset.Name        = req.Name.Trim();
        asset.Description = req.Description?.Trim();
        asset.Notes       = req.Notes?.Trim();
        await db.SaveChangesAsync();

        var dto = await GetByIdAsync(id);
        return (dto, null);
    }

    public async Task<string?> DisposeAsync(long id, DisposeAssetRequest req)
    {
        var asset = await db.FixedAssets.FindAsync(id);
        if (asset is null) return "Immobilisation introuvable.";
        if (asset.Status == AssetStatus.Disposed) return "Actif déjà sorti du patrimoine.";

        asset.Status     = AssetStatus.Disposed;
        asset.DisposedAt = EnsureUtc(req.DisposedAt);
        if (!string.IsNullOrWhiteSpace(req.Notes)) asset.Notes = req.Notes.Trim();

        await db.SaveChangesAsync();
        return null;
    }

    // ── Tableau d'amortissement complet (passé + futur) ─────────────────
    public async Task<DepreciationScheduleDto?> GetDepreciationScheduleAsync(long id)
    {
        var asset = await db.FixedAssets
            .Include(a => a.Supplier)
            .Include(a => a.DepreciationEntries.OrderBy(d => d.Period))
            .FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return null;

        var recorded = asset.DepreciationEntries
            .ToDictionary(d => d.Period);

        var allEntries = BuildFullSchedule(asset, recorded);
        var total = allEntries.Where(e => e.IsRecorded).Sum(e => e.Amount);

        return new DepreciationScheduleDto(
            ToDto(asset),
            allEntries,
            total,
            asset.ResidualValue
        );
    }

    // ── Lancer les amortissements d'une période ──────────────────────────
    public async Task<RunDepreciationResult> RunDepreciationAsync(string period)
    {
        if (!IsValidPeriod(period))
            throw new ArgumentException($"Période invalide : « {period} ». Format attendu : YYYY-MM.");

        var assets = await db.FixedAssets
            .Include(a => a.DepreciationEntries)
            .Where(a => a.Status == AssetStatus.Active)
            .ToListAsync();

        int processed = 0, skipped = 0;
        decimal totalAmount = 0m;

        foreach (var asset in assets)
        {
            // L'actif doit avoir commencé à être amorti (date acquisition ≤ fin du mois de la période)
            var periodStart = PeriodToDate(period);
            if (asset.AcquisitionDate > periodStart.AddMonths(1).AddDays(-1)) { skipped++; continue; }

            // Idempotent : skip si déjà enregistré pour cette période
            if (asset.DepreciationEntries.Any(d => d.Period == period)) { skipped++; continue; }

            var recorded = asset.DepreciationEntries
                .OrderBy(d => d.Period)
                .ToDictionary(d => d.Period);

            var schedule = BuildFullSchedule(asset, recorded);
            var periodEntry = schedule.FirstOrDefault(e => e.Period == period);
            if (periodEntry is null || periodEntry.Amount <= 0) { skipped++; continue; }

            // Créer l'entrée en base
            var entry = new DepreciationEntry
            {
                AssetId          = asset.Id,
                Period           = period,
                Amount           = periodEntry.Amount,
                CumulativeAmount = periodEntry.CumulativeAmount,
                BookValue        = periodEntry.BookValue,
            };
            db.DepreciationEntries.Add(entry);
            await db.SaveChangesAsync();

            // Écriture comptable fire-and-forget
            try
            {
                await accountingService.PostDepreciationAsync(
                    asset.Id,
                    entry.Amount,
                    period,
                    $"Amortissement {period} — {asset.Name}");
            }
            catch { }

            totalAmount += entry.Amount;
            processed++;
        }

        return new RunDepreciationResult(period, processed, skipped, totalAmount);
    }

    // ── Calcul du tableau d'amortissement ───────────────────────────────

    private static List<DepreciationEntryDto> BuildFullSchedule(
        FixedAsset asset,
        Dictionary<string, DepreciationEntry> recorded)
    {
        var entries = new List<DepreciationEntryDto>();
        var depreciable = asset.AcquisitionCost - asset.ResidualValue;
        if (depreciable <= 0) return entries;

        decimal cumulative = 0m;
        decimal bookValue  = asset.AcquisitionCost;

        for (int i = 0; i < asset.UsefulLifeMonths; i++)
        {
            var period = PeriodKey(asset.AcquisitionDate, i);
            decimal monthlyAmount;

            if (asset.DepreciationMethod == DepreciationMethod.Linear)
            {
                monthlyAmount = Math.Round(depreciable / asset.UsefulLifeMonths, 2);
                // Ajustement dernière période pour éviter l'arrondi cumulatif
                if (i == asset.UsefulLifeMonths - 1)
                    monthlyAmount = asset.AcquisitionCost - asset.ResidualValue - cumulative;
            }
            else // Declining
            {
                // Taux dégressif = 2 / DuréeMois (méthode double declining balance)
                var rate = 2.0m / asset.UsefulLifeMonths;
                monthlyAmount = Math.Round(bookValue * rate, 2);
                // Ne pas descendre sous la valeur résiduelle
                if (bookValue - monthlyAmount < asset.ResidualValue)
                    monthlyAmount = bookValue - asset.ResidualValue;
                if (monthlyAmount < 0) monthlyAmount = 0;
            }

            cumulative += monthlyAmount;
            bookValue  -= monthlyAmount;
            if (bookValue < asset.ResidualValue) bookValue = asset.ResidualValue;

            var isRecorded = recorded.TryGetValue(period, out var rec);
            entries.Add(new DepreciationEntryDto(
                Id:               isRecorded ? rec!.Id : 0,
                Period:           period,
                Amount:           isRecorded ? rec!.Amount : monthlyAmount,
                CumulativeAmount: isRecorded ? rec!.CumulativeAmount : cumulative,
                BookValue:        isRecorded ? rec!.BookValue : bookValue,
                IsRecorded:       isRecorded,
                CreatedAt:        isRecorded ? rec!.CreatedAt : null
            ));
        }

        return entries;
    }

    private static string PeriodKey(DateTime acquisitionDate, int monthOffset)
    {
        var d = acquisitionDate.AddMonths(monthOffset);
        return $"{d.Year:D4}-{d.Month:D2}";
    }

    private static bool IsValidPeriod(string period)
    {
        if (period.Length != 7) return false;
        if (!int.TryParse(period[..4], out var year)) return false;
        if (period[4] != '-') return false;
        if (!int.TryParse(period[5..], out var month)) return false;
        return year >= 2000 && month is >= 1 and <= 12;
    }

    private static DateTime PeriodToDate(string period)
    {
        var year  = int.Parse(period[..4]);
        var month = int.Parse(period[5..]);
        return new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private static FixedAssetDto ToDto(FixedAsset a)
    {
        var depreciated = a.DepreciationEntries.Sum(d => d.Amount);
        return new FixedAssetDto(
            a.Id,
            a.Name,
            a.Description,
            a.Category.ToString(),
            a.AcquisitionDate,
            a.AcquisitionCost,
            a.UsefulLifeMonths,
            a.ResidualValue,
            a.DepreciationMethod.ToString(),
            a.Status.ToString(),
            a.DisposedAt,
            a.Notes,
            a.SupplierId,
            a.Supplier?.Name,
            DepreciatedAmount: depreciated,
            BookValue: a.AcquisitionCost - depreciated,
            DepreciatedMonths: a.DepreciationEntries.Count,
            a.CreatedAt
        );
    }

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc   => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _                  => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        };
}
