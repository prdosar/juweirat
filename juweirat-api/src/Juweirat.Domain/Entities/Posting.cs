namespace Juweirat.Domain.Entities;

// Ligne de main courante — générée par la clôture journalière (append-only).
public class Posting
{
    public long Id { get; set; }
    public DateOnly DateHotel { get; set; }
    public long FolioId { get; set; }
    public Folio Folio { get; set; } = null!;
    public long UnitId { get; set; }
    public Room Unit { get; set; } = null!;
    public string Famille { get; set; } = string.Empty; // "Hébergement" | "Petit-déjeuner"
    public string Libelle { get; set; } = string.Empty;
    public int Montant { get; set; }
    public DateTime Horodatage { get; set; } = DateTime.UtcNow;
}
