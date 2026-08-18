namespace Juweirat.Domain.Entities;

public class CompanyTarif
{
    public long Id { get; set; }
    public long CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public long CategoryId { get; set; }
    public RoomCategory Category { get; set; } = null!;

    public int TarifNuit { get; set; }
    public int TarifN15 { get; set; }
    public int TarifN30 { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
