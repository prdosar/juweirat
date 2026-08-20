namespace Juweirat.Application.DTOs.Pms;

public record FactureDto(
    long Id,
    string Number,
    long FolioId,
    string FolioNumber,
    DateOnly Date,
    string Status,
    int PrintCount,
    int Corrections,
    DateOnly? CorrigeeLe,
    FactureSnapshotDto? Snapshot,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record FactureSnapshotDto(
    List<FactureLineDto> Lines,
    int Total,
    int Arrhes,
    int Paid,
    string? PayMode,
    string? Recipient,
    string? Client,
    string? Societe,
    string? Reservataire,
    string? UnitLabel,
    DateOnly? Arrival,
    DateOnly? Departure,
    int Nights,
    int Pax,
    bool? TvaExonere = null,
    int? TotalHt     = null,
    int? Tva         = null,
    int? TotalTtc    = null,
    decimal? TvaRate = null
);

public record FactureLineDto(string Label, int Montant);

public record RectifierRequest(
    List<FactureLineDto>? Lines = null,
    string? PayMode = null,
    string? Recipient = null
);
