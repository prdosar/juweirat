namespace Juweirat.Domain.Entities;

// Historique des modifications d'une réservation — append-only.
// Une ligne est créée à chaque appel réussi à UpdateAsync (motif obligatoire).
// Le diff est stocké en JSONB : { field: { from, to } } sur les champs qui ont changé.
public class ReservationChangeLog
{
    public long Id { get; set; }
    public long ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    // ID de l'admin qui a effectué la modif — null si impossible à identifier (contexte anonyme).
    public long? ChangedByUserId { get; set; }

    // Motif obligatoire saisi par l'opérateur.
    public string Reason { get; set; } = string.Empty;

    // Diff structuré { fieldName: { from, to } } stocké en jsonb.
    // Champs suivis : categoryId, roomId, checkInDate, checkOutDate, nights,
    // adults, children, pricePerNightSnapshot, totalPrice, discount,
    // garantieType, tvaExonere, source.
    public string DiffJson { get; set; } = "{}";
}
