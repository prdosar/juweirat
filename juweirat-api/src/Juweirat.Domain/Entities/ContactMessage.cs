namespace Juweirat.Domain.Entities;

public class ContactMessage
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "New"; // "New", "Read", "Replied", "Archived"
    public string? ReplyMessage { get; set; }
    public DateTimeOffset? RepliedAt { get; set; }
    public string? RepliedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
