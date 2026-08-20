using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Période d'ouverture d'une caisse par un caissier.
// Un seul (RegisterId, OpenedByUserId, Status=Open) autorisé — voir index unique dans AppDbContext.
public class CashSession
{
    public long Id { get; set; }
    public long RegisterId { get; set; }

    public long OpenedByUserId { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public decimal OpeningFloat { get; set; }

    public long? ClosedByUserId { get; set; }
    public DateTime? ClosedAt { get; set; }
    // Total physiquement recompté à la clôture (tous modes confondus dans la v1 minimale).
    public decimal? ClosingCountedTotal { get; set; }

    public CashSessionStatus Status { get; set; } = CashSessionStatus.Open;
    public string? Notes { get; set; }

    public CashRegister Register { get; set; } = null!;
}
