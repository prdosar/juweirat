using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Ligne du journal — flux d'argent d'un compte vers un autre.
// Append-only : jamais d'UPDATE ni de DELETE. Une erreur se corrige par un mouvement inverse.
public class AccountMovement
{
    public long Id { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public long FromAccountId { get; set; }
    public long ToAccountId { get; set; }
    public decimal Amount { get; set; }

    public MovementReason Reason { get; set; }

    // Traçabilité vers l'entité métier à l'origine du mouvement.
    // SourceType = "Payment" | "VenteDirecte" | "Facture" | "Folio" | "Manual"
    public string? SourceType { get; set; }
    public long? SourceId { get; set; }

    // Rattachement à la session de caisse ouverte au moment du mouvement.
    public long? SessionId { get; set; }

    public long? CreatedByUserId { get; set; }
    public string? Label { get; set; }

    public Account FromAccount { get; set; } = null!;
    public Account ToAccount { get; set; } = null!;
    public CashSession? Session { get; set; }
}
