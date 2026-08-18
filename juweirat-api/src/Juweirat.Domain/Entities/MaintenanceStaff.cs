namespace Juweirat.Domain.Entities;

public class MaintenanceStaff
{
    public long Id { get; set; }
    public long CategoryId { get; set; }
    public MaintenanceCategory Category { get; set; } = null!;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}";
    public ICollection<MaintenanceTicket> Tickets { get; set; } = [];
}
