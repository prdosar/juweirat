namespace Juweirat.Domain.Entities;

public class RoomBlock
{
    public long Id { get; set; }
    public long RoomId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; } // maintenance | ownerUse | blocked
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Room Room { get; set; } = null!;
}
