namespace Juweirat.Domain.Entities;

public class VenteDirecte
{
    public long Id { get; set; }
    public long PrestationId { get; set; }
    public PrestationAnnexe Prestation { get; set; } = null!;

    public long? ClientId { get; set; }
    public Client? Client { get; set; }
    public string? ClientNom { get; set; }   // nom libre (walk-in sans profil)

    public long? FolioId { get; set; }       // renseigné quand Mode = SurChambre
    public Folio? Folio { get; set; }

    public int Quantite { get; set; } = 1;
    public decimal PrixUnitaireSnapshot { get; set; }  // prixSeule au moment de la vente
    public decimal Total { get; set; }

    public string Mode { get; set; } = "Encaissement"; // "Encaissement" | "SurChambre"
    public string? PaymentMethod { get; set; }          // "Espèces" | "Carte bancaire" | "Mobile Money"
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
