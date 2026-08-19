namespace Juweirat.Domain.Enums;

// Motif d'un mouvement inter-comptes dans le journal.
public enum MovementReason
{
    Vente,           // Prestation ou nuitée vendue à un client — Revenue → Client
    TvaCollectee,    // Part de TVA sur une vente — TvaCollected → Client
    Encaissement,    // Client règle son compte — Client → CashRegister
    Facture,         // Émission facture (mise en compte du client)
    SortieCaisse,    // Retrait manuel espèces (achat lessive, avance perso…)
    EntreeCaisse,    // Fond de caisse à l'ouverture, ou apport ponctuel
    Correction,      // Écriture manuelle du comptable
    Backfill         // Écriture rétroactive générée par le backfill historique
}
