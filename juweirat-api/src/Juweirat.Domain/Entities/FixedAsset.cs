using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class FixedAsset
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssetCategory Category { get; set; }

    public DateTime AcquisitionDate { get; set; }
    public decimal AcquisitionCost { get; set; }

    // Durée d'utilisation en mois
    public int UsefulLifeMonths { get; set; }
    public decimal ResidualValue { get; set; }
    public DepreciationMethod DepreciationMethod { get; set; }

    public AssetStatus Status { get; set; } = AssetStatus.Active;
    public DateTime? DisposedAt { get; set; }
    public string? Notes { get; set; }

    // Fournisseur de l'actif (optionnel)
    public long? SupplierId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Supplier? Supplier { get; set; }
    public ICollection<DepreciationEntry> DepreciationEntries { get; set; } = [];
}
