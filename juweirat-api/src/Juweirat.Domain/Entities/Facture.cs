using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Facture
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty; // FAC-2026-0001

    public long FolioId { get; set; }
    public Folio Folio { get; set; } = null!;

    public DateOnly Date { get; set; }
    public FactureStatus Status { get; set; } = FactureStatus.Emise;
    public int PrintCount { get; set; }
    public int Corrections { get; set; }
    public DateOnly? CorrigeeLe { get; set; }

    // Snapshot figé au moment de l'émission — stocké en JSONB.
    public FactureSnapshot? Snapshot { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FactureSnapshot
{
    public List<FactureSnapshotLine> Lines { get; set; } = [];
    public int Total { get; set; }
    public int Arrhes { get; set; }
    public int Paid { get; set; }
    public string? PayMode { get; set; }
    public string? Recipient { get; set; }   // "client" | "societe"
    public string? Client { get; set; }
    public string? Societe { get; set; }
    public string? Reservataire { get; set; }
    public string? UnitLabel { get; set; }
    public DateOnly? Arrival { get; set; }
    public DateOnly? Departure { get; set; }
    public int Nights { get; set; }
    public int Pax { get; set; }
}

public class FactureSnapshotLine
{
    public string Label { get; set; } = string.Empty;
    public int Montant { get; set; }
}
