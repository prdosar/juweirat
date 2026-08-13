namespace Juweirat.Domain.Entities;

// Singleton — toujours exactement 1 ligne (Id = 1).
public class HotelConfig
{
    public int Id { get; set; } = 1;
    public string BuildingName { get; set; } = "Immeuble Juweirat";
    public string OwnerName { get; set; } = "Saka Tidjani";
    public string City { get; set; } = "Lomé";
    public string CurrencyCode { get; set; } = "FCFA";
    public int CurrencyDecimals { get; set; } = 0;
    // Date métier (≠ now()). N'avance que par la clôture journalière.
    public DateOnly DateHotel { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    // Compteurs de numérotation continue (jamais basés sur COUNT(*)).
    public int ResaSeq { get; set; } = 0;
    public int FactureSeq { get; set; } = 0;
}
