using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Accounting;

public record CashSessionDto(
    long Id,
    long RegisterId,
    string RegisterName,
    long OpenedByUserId,
    string OpenedByUserName,
    DateTime OpenedAt,
    decimal OpeningFloat,
    long? ClosedByUserId,
    string? ClosedByUserName,
    DateTime? ClosedAt,
    decimal? ClosingCountedTotal,
    string Status,
    string? Notes
);

public record OpenCashSessionRequest(
    [Required] long RegisterId,
    decimal OpeningFloat = 0m
);

public record AddManualMovementRequest(
    [Required] decimal Amount,          // toujours positif
    [Required] string Direction,        // "in" = EntreeCaisse, "out" = SortieCaisse
    [Required] string Label
);

public record CloseCashSessionRequest(
    [Required] decimal ClosingCountedTotal,
    string? Notes = null
);

// Arrêté de caisse : montants théoriques (calculés depuis les mouvements) vs réels (saisis à la clôture).
public record CashSessionReportDto(
    CashSessionDto Session,
    decimal TheoreticalTotal,           // OpeningFloat + Σ EntreeCaisse − Σ SortieCaisse + Σ Encaissement
    decimal? CountedTotal,              // saisi à la clôture, null si session ouverte
    decimal? Ecart,                     // Counted − Theoretical, null si session ouverte
    decimal TotalEncaisse,
    decimal TotalDecaisse,
    decimal TotalEntreeManuelle,
    int MovementsCount
);
