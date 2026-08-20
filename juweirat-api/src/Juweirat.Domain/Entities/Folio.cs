using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Folio
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty; // FL-2026-0001

    // Logement
    public long UnitId { get; set; }
    public Room Unit { get; set; } = null!;

    // Identité client
    public string? Guest { get; set; }       // prénom + nom concaténés (dénormalisé pour affichage rapide)
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string? Societe { get; set; }
    public string? Reservataire { get; set; }

    // Garantie CB (en prod : 4 derniers chiffres + empreinte uniquement)
    public string? CardNumber { get; set; }
    public string? CardExpiry { get; set; }
    public string? CardHolder { get; set; }

    // Réservation
    public FolioSegment Segment { get; set; } = FolioSegment.Direct;
    public int Pax { get; set; } = 1;
    public DateOnly Arrival { get; set; }
    public DateOnly Departure { get; set; }

    // Tarification
    public int Rate { get; set; }                // tarif/nuit effectif (FCFA)
    public int Heb { get; set; }                 // 0 = calculé (Rate × nuits)
    public TarifTier TarifTier { get; set; } = TarifTier.Nuitee;
    public bool ElecIncluded { get; set; } = true;

    // Prestations supplémentaires
    public int PdjParJour { get; set; }
    public int PdjPrix { get; set; }
    public int Kwh { get; set; }           // kWh consommés (facturation élec hors forfait, séjours ≥ 15 nuits à 230 FCFA/kWh)
    public int Debiteur { get; set; }
    public int Dependances { get; set; }

    // Encaissement
    public int Arrhes { get; set; }
    public int Paid { get; set; }
    public string? PayMode { get; set; }         // Espèces | Carte bancaire | Virement | …
    public string? FactRecipient { get; set; }   // "client" | "societe"

    // Fiscalité
    public bool TvaExonere { get; set; }

    // Cycle de vie
    public FolioResaStatus ResaStatus { get; set; } = FolioResaStatus.Confirmee;
    public bool CheckedIn { get; set; }
    public bool Closed { get; set; }
    public DateOnly? CheckoutDate { get; set; }
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public long? FactureId { get; set; }
    public Facture? Facture { get; set; }

    // Lien vers la réservation web d'origine (null si créé directement dans le PMS).
    public long? ReservationId { get; set; }
    public Reservation? Reservation { get; set; }

    public ICollection<Posting> Postings { get; set; } = [];
    public ICollection<Debtor>  Debtors  { get; set; } = [];
}
