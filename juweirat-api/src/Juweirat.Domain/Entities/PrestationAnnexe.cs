namespace Juweirat.Domain.Entities;

public class PrestationAnnexe
{
    public long Id { get; set; }
    public string NameFr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string Mode { get; set; } = "ParPersonneParNuit"; // ParPersonneParNuit | ParPersonne | Forfait
    public decimal PrixInclus { get; set; }  // tarif quand inclus dans une réservation
    public decimal PrixSeule { get; set; }   // tarif en prestation indépendante
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ReservationPrestation> ReservationPrestations { get; set; } = [];
}
