namespace Juweirat.Domain.Entities;

public class ReservationPrestation
{
    public long Id { get; set; }
    public long ReservationId { get; set; }
    public long PrestationId { get; set; }
    public int Quantite { get; set; }                        // personnes × nuits (selon mode)
    public decimal PrixUnitaireSnapshot { get; set; }        // prixInclus au moment de la résa
    public decimal TotalLigne { get; set; }                  // PrixUnitaireSnapshot × Quantite

    public Reservation Reservation { get; set; } = null!;
    public PrestationAnnexe Prestation { get; set; } = null!;
}
