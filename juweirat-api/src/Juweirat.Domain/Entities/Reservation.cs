using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Reservation
{
    public long Id { get; set; }
    public string Reference { get; set; } = string.Empty; // JW-2026-00042
    public long? RoomId { get; set; }
    public long CategoryId { get; set; }
    public long ClientId { get; set; }
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int Nights { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; } = 0;
    public decimal PricePerNightSnapshot { get; set; }
    // Snapshots des 3 paliers tarifaires résolus au moment de la création (waterfall Company > Category).
    // Permet de recalculer le palier applicable si les dates changent sans refaire le waterfall
    // (comportement voulu : "garder le tarif négocié initial même si les dates changent, tant que
    // la catégorie ne change pas").
    public int TarifNuitSnapshot { get; set; }
    public int TarifN15Snapshot  { get; set; }
    public int TarifN30Snapshot  { get; set; }
    public decimal TotalPrice { get; set; }
    // Remise appliquée à la résa en FCFA — déduite de TotalPrice. 0 par défaut.
    // Visible sur le contrat de bail et l'estimatif comptable.
    public int Discount { get; set; }
    public string Currency { get; set; } = "XOF";
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;
    public string? Source { get; set; } // website | phone | walkIn | bookingCom | airbnb
    public string? SpecialRequests { get; set; }
    public string? InternalNotes { get; set; }

    // Garantie
    public string? GarantieType { get; set; }          // "Cash" | "Carte"
    public decimal? GarantieMontantCash { get; set; }
    public string? CarteNom { get; set; }
    public string? CarteSuffix { get; set; }            // 4 derniers chiffres
    public string? CarteExpiration { get; set; }        // MM/YYYY

    // Exonération TVA — appliquée à toutes les factures dérivées (folio, prestations SurChambre).
    public bool TvaExonere { get; set; }

    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Room? Room { get; set; }
    public RoomCategory Category { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<ReservationPrestation> Prestations { get; set; } = [];

    // Folio PMS créé lorsque la réservation est prise en charge par la réception.
    public Folio? Folio { get; set; }

    // Historique des modifications (append-only). Chaque modif via UpdateAsync ajoute une ligne.
    public ICollection<ReservationChangeLog> ChangeLogs { get; set; } = [];

    public decimal AmountPaid => Payments
        .Where(p => p.Status == PaymentStatus.Completed)
        .Sum(p => p.Amount);

    public decimal AmountDue => TotalPrice - AmountPaid;
}
