namespace Juweirat.Application.DTOs.Pms;

public record CloturePreviewDto(
    DateOnly DateHotel,
    List<FolioPendingItemDto> PendingArrivals,   // not checked-in, not no-show
    List<FolioPendingItemDto> PendingDepartures, // checked-in but not closed
    int EstimatedActiveCount,                    // will receive a posting today
    bool CanClose
);

public record FolioPendingItemDto(long Id, string Number, string? Guest, string UnitLabel, DateOnly Date);

public record ClotureDto(
    long Id,
    DateOnly DateHotel,
    DateTime ExecutedAt,
    int Dispo,
    int Occ,
    decimal Occupation,
    int CaHeb,
    int CaPdj,
    int CaTotal,
    int Pm,
    int RevPar,
    int NbArrivals,
    int NbDeparts,
    int NbNoShow,
    int NbLignes,
    int Montant
);
