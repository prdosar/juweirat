namespace Juweirat.Domain.Entities;

// Caisse physique/logique. Ex : Réception, Bar, Coffre.
// Chaque caisse a son compte de trésorerie associé (Account.Kind=CashRegister, OwnerRefId=CashRegister.Id).
public class CashRegister
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CashSession> Sessions { get; set; } = [];
}
