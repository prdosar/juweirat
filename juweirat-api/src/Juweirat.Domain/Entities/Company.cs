namespace Juweirat.Domain.Entities;

public class Company
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ResponsableNom { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string? Ville { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Client> Clients { get; set; } = [];
    public ICollection<CompanyTarif> Tarifs { get; set; } = [];
}
