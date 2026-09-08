using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Contrat long terme d'une compagnie sur une chambre.
// La chambre est bloquée pour la compagnie sur [StartDate, EndDate[ ; des Reservations
// d'occupants (personnes physiques) se rattachent au contrat via Reservation.CompanyContractId.
// La facturation est mensuelle et forfaitaire (MonthlyRate), indépendante des occupants.
public class CompanyContract
{
    public long Id { get; set; }
    public string Reference { get; set; } = string.Empty; // ex : CT-2026-0001

    public long CompanyId { get; set; }
    public long RoomId { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    // Loyer mensuel forfaitaire facturé à la compagnie (FCFA).
    public int MonthlyRate { get; set; }

    public ContractStatus Status { get; set; } = ContractStatus.Active;

    // TVA exonérée sur les factures mensuelles générées (miroir Reservation.TvaExonere).
    public bool TvaExonere { get; set; }

    public string? Notes { get; set; }

    public long? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Company Company { get; set; } = null!;
    public Room Room { get; set; } = null!;

    // Reservations d'occupants rattachées à ce contrat.
    public ICollection<Reservation> Reservations { get; set; } = [];
}
