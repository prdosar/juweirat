namespace Juweirat.Domain.Entities;

public class RoomImage
{
    public long Id { get; set; }
    public long RoomId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? AltTextFr { get; set; }
    public string? AltTextEn { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsCover { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Room Room { get; set; } = null!;
}
