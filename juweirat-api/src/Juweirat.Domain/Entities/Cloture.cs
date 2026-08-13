namespace Juweirat.Domain.Entities;

// Indicateurs figés après chaque clôture journalière — immuable après création.
public class Cloture
{
    public long Id { get; set; }
    public DateOnly DateHotel { get; set; }   // unique — une clôture par date
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    // Indicateurs hôteliers du jour
    public int Dispo { get; set; }            // logements disponibles (hors HS)
    public int Occ { get; set; }              // logements occupés
    public decimal Occupation { get; set; }   // % occupation
    public int CaHeb { get; set; }            // CA hébergement du jour (FCFA)
    public int CaPdj { get; set; }
    public int CaTotal { get; set; }
    public int Pm { get; set; }               // prix moyen (ADR)
    public int RevPar { get; set; }

    // Activité du jour
    public int NbArrivals { get; set; }
    public int NbDeparts { get; set; }
    public int NbNoShow { get; set; }
    public int NbLignes { get; set; }         // lignes générées dans la main courante
    public int Montant { get; set; }          // total passé en main courante
}
