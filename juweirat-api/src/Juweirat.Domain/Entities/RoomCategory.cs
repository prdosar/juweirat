namespace Juweirat.Domain.Entities;

public class RoomCategory
{
    public long Id { get; set; }
    public string Slug { get; set; } = string.Empty;   // t1-standard, t2-superieure, …
    public string PmsType { get; set; } = string.Empty; // T1 | T2 | T3 | T4
    public string PmsGamme { get; set; } = string.Empty; // standard | supérieure | privilège | suite
    public string NameFr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionFr { get; set; }
    public string? DescriptionEn { get; set; }
    public int CapacityAdults { get; set; }
    public int CapacityChildren { get; set; }

    // Tarifs représentatifs de la catégorie (FCFA)
    public int TarifNuit { get; set; }  // tarif/nuit, élec incluse (< 15 nuits)
    public int TarifN15 { get; set; }   // tarif/nuit pour séjours 15–29 nuits (hors élec)
    public int TarifN30 { get; set; }   // tarif/nuit pour séjours ≥ 30 nuits  (hors élec)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Room> Rooms { get; set; } = [];
    public ICollection<RoomImage> Images { get; set; } = [];
}
