using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.FixedAssets;

public record FixedAssetDto(
    long Id,
    string Name,
    string? Description,
    string Category,
    DateTime AcquisitionDate,
    decimal AcquisitionCost,
    int UsefulLifeMonths,
    decimal ResidualValue,
    string DepreciationMethod,
    string Status,
    DateTime? DisposedAt,
    string? Notes,
    long? SupplierId,
    string? SupplierName,
    // Calculés
    decimal DepreciatedAmount,   // total amorti à ce jour
    decimal BookValue,           // VNC courante
    int DepreciatedMonths,       // nb de dotations enregistrées
    DateTime CreatedAt
);

public record CreateFixedAssetRequest(
    string Name,
    string? Description,
    string Category,
    DateTime AcquisitionDate,
    decimal AcquisitionCost,
    int UsefulLifeMonths,
    decimal ResidualValue,
    string DepreciationMethod,
    string? Notes,
    long? SupplierId,
    long? CashRegisterId  // caisse débitée pour l'acquisition
);

public record UpdateFixedAssetRequest(
    string Name,
    string? Description,
    string? Notes
);

public record DisposeAssetRequest(
    DateTime DisposedAt,
    string? Notes
);

// ── Tableau d'amortissement ───────────────────────────────────────────────
public record DepreciationEntryDto(
    long Id,
    string Period,       // "YYYY-MM"
    decimal Amount,
    decimal CumulativeAmount,
    decimal BookValue,
    bool IsRecorded,     // true = déjà en base, false = projection future
    DateTime? CreatedAt
);

public record DepreciationScheduleDto(
    FixedAssetDto Asset,
    List<DepreciationEntryDto> Entries,
    decimal TotalDepreciation,
    decimal FinalResidualValue
);

// ── Run depreciation ──────────────────────────────────────────────────────
public record RunDepreciationRequest(
    string Period  // "YYYY-MM"
);

public record RunDepreciationResult(
    string Period,
    int AssetsProcessed,
    int Skipped,
    decimal TotalAmount
);

public class FixedAssetFilterParams : PaginationParams
{
    public string? Status { get; set; }   // "Active" | "Disposed"
    public string? Category { get; set; }
}
