using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Compte du journal Juweirat.
// Un compte auxiliaire (Client/Company/CashRegister) référence son tiers via OwnerRefId
// sans FK explicite : on veut pouvoir supprimer un client sans casser l'historique du compte.
// Les comptes système (TvaCollected/Revenue/Expense) ont OwnerRefId=null.
public class Account
{
    public long Id { get; set; }
    public AccountKind Kind { get; set; }
    public string Name { get; set; } = string.Empty;

    // Réf logique vers Client.Id / Company.Id / CashRegister.Id selon Kind.
    // null pour les comptes système.
    public long? OwnerRefId { get; set; }

    // Solde cache — recalculable à partir des mouvements.
    // Convention : positif = doit à la maison / disponible en caisse.
    public decimal Balance { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
