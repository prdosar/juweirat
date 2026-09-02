namespace Juweirat.Domain.Entities;

public class Debtor
{
    public long Id { get; set; }
    public string Client { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public DateOnly DueDate { get; set; }
    public int Amount { get; set; }        // FCFA
    public int Paid { get; set; }          // FCFA
    public string? PayMode { get; set; }   // dernier mode de règlement utilisé

    // Lien optionnel vers le folio source (transfert de solde)
    public long? FolioId { get; set; }
    public Folio? Folio { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
