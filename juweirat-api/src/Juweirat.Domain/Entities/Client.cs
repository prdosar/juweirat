namespace Juweirat.Domain.Entities;

public class Client
{
    public long Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Nationality { get; set; }
    public string? DocumentType { get; set; } // passport | idCard | residencePermit
    public string? DocumentNumber { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public long? CompanyId { get; set; }
    public Company? Company { get; set; }

    public string FullName => $"{FirstName} {LastName}";
    public ICollection<Reservation> Reservations { get; set; } = [];
}
