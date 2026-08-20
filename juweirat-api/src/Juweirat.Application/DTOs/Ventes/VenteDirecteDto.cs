using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Ventes;

public record VenteDirecteDto(
    long Id,
    long PrestationId,
    string PrestationNameFr,
    string? PrestationIcon,
    long? ClientId,
    string? ClientNom,
    long? FolioId,
    string? FolioNumber,
    string? RoomNumber,
    int Quantite,
    decimal PrixUnitaireSnapshot,
    decimal Total,
    string Mode,
    string? PaymentMethod,
    string? Notes,
    DateTime CreatedAt,
    bool TvaExonere = false
);

public record CreateVenteDirecteRequest(
    [Required][Range(1, long.MaxValue)] long PrestationId,
    [Range(1, 999)] int Quantite = 1,
    long? ClientId = null,
    string? ClientNom = null,
    long? FolioId = null,
    string Mode = "Encaissement",
    string? PaymentMethod = null,
    string? Notes = null,
    // Obligatoire uniquement quand la prestation est flexible (prix saisi à la vente).
    decimal? PrixUnitaire = null
);

public record FolioActifDto(
    long FolioId,
    string FolioNumber,
    string RoomNumber,
    string? GuestName
);

// Un item du panier — plusieurs prestations sont vendues en une seule opération.
public record BatchVenteItem(
    [Required][Range(1, long.MaxValue)] long PrestationId,
    [Range(1, 999)] int Quantite = 1,
    // Obligatoire pour les prestations à prix flexible ; ignoré sinon.
    decimal? PrixUnitaire = null
);

// Client + mode partagés pour tout le panier ; les items ci-dessous portent
// leur propre prestation/quantité/prix. Un seul encaissement agrégé est
// écrit en caisse (Mode = Encaissement) — voir CreateBatchAsync.
public record BatchVenteRequest(
    [Required][MinLength(1)] List<BatchVenteItem> Items,
    long? ClientId = null,
    string? ClientNom = null,
    long? FolioId = null,
    string Mode = "Encaissement",
    string? PaymentMethod = null,
    string? Notes = null
);
