using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class MaintenanceTicket
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string Zone { get; set; } = "logement"; // "logement" | "commun"
    public long? UnitId { get; set; }
    public Room? Unit { get; set; }
    public string? Spot { get; set; }          // zone spécifique si commun (ex. "parking")

    public string Category { get; set; } = string.Empty;
    public TicketPriority Priority { get; set; } = TicketPriority.Normale;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Tech { get; set; }          // technicien assigné (texte libre, rétrocompat)
    public long? StaffId { get; set; }         // intervenant enregistré
    public MaintenanceStaff? Staff { get; set; }
    public int? Cost { get; set; }             // coût en FCFA
    public TicketStatus Status { get; set; } = TicketStatus.Ouvert;
    public DateTime? ResolvedAt { get; set; }
    public string? Note { get; set; }
}
