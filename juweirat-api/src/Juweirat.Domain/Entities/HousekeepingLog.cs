namespace Juweirat.Domain.Entities;

// Trace d'un événement "chambre remise propre" par une femme/valet de chambre.
// Une ligne est créée à chaque transition Sale → Propre via PatchMenageAsync.
// Append-only : jamais d'UPDATE ni DELETE, pour garder l'historique intact.
public class HousekeepingLog
{
    public long Id { get; set; }
    public long RoomId { get; set; }
    public long StaffId { get; set; }
    public DateTime CleanedAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public Room Room { get; set; } = null!;
    public MaintenanceStaff Staff { get; set; } = null!;
}
