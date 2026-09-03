namespace Juweirat.Domain.Entities;

// Dotation aux amortissements mensuelle pour un actif donné.
// Unicité (AssetId, Period) garantit l'idempotence du calcul.
public class DepreciationEntry
{
    public long Id { get; set; }
    public long AssetId { get; set; }

    // Format "YYYY-MM" (ex: "2026-09")
    public string Period { get; set; } = string.Empty;

    public decimal Amount { get; set; }           // Dotation du mois
    public decimal CumulativeAmount { get; set; } // Amorti cumulé après ce mois
    public decimal BookValue { get; set; }         // VNC après ce mois

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FixedAsset Asset { get; set; } = null!;
}
