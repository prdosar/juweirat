namespace Juweirat.Domain.Entities;

public class MaintenanceCategory
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<MaintenanceStaff> Staff { get; set; } = [];
}
