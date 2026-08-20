namespace Juweirat.Domain.Enums;

// Nature d'un compte dans le journal Juweirat.
// Auxiliaire (rattaché à un tiers via OwnerRefId) OU système (OwnerRefId=null).
public enum AccountKind
{
    // ── Auxiliaires ──────────────────────────────────────────────
    Client,               // 1 par Client         (OwnerRefId = Client.Id)
    Company,              // 1 par Company        (OwnerRefId = Company.Id)
    CashRegister,         // 1 par caisse         (OwnerRefId = CashRegister.Id)
    Prestation,           // 1 par PrestationAnnexe (OwnerRefId = PrestationAnnexe.Id)
                          //   → suivre le CA généré par chaque prestation individuellement

    // ── Système ──────────────────────────────────────────────────
    TvaCollected,         // TVA collectée à reverser à l'État
    RevenueHebergement,   // CA hébergement classique (nuitées / forfaits)
    RevenueNoShow,        // Retenues No Show — isolé pour KPI et déclaration
    RevenueCancellation,  // Retenues annulation tardive — isolé pour KPI
    Expense               // Sorties diverses (achats, retraits, avances)
}
