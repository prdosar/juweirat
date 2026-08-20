using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Accounting;

public record AccountDto(
    long Id,
    string Kind,
    string Name,
    long? OwnerRefId,
    decimal Balance,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AccountMovementDto(
    long Id,
    DateTime Date,
    long FromAccountId,
    string FromAccountName,
    long ToAccountId,
    string ToAccountName,
    decimal Amount,
    string Reason,
    string? SourceType,
    long? SourceId,
    long? SessionId,
    long? CreatedByUserId,
    string? Label
);

public record CashRegisterDto(
    long Id,
    string Name,
    string? Location,
    bool IsActive,
    long? AccountId,       // compte de trésorerie associé
    decimal AccountBalance, // solde courant
    DateTime CreatedAt
);

public class AccountFilterParams : PaginationParams
{
    // Filtre par nature (Client / Company / CashRegister / Prestation / système).
    public string? Kind { get; set; }
    // Inclut les comptes désactivés dans la réponse.
    public bool? IncludeInactive { get; set; }
}

public class MovementFilterParams : PaginationParams
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public long? AccountId { get; set; }        // mouvements où le compte apparaît (from OU to)
    public string? Reason { get; set; }
    public string? SourceType { get; set; }
    public long? SessionId { get; set; }
}

// Ligne du journal de caisse — agrégation par événement métier (Payment, VenteDirecte, Facture…).
// Chaque événement produit 1 à 3 mouvements comptables (HT, TVA, encaissement) — on les regroupe
// ici pour un affichage humain : une ligne = un événement avec HT/TVA/TTC/encaissé.
public record JournalEntryDto(
    string SourceType,       // "Payment" | "VenteDirecte" | "Facture" | "Manual"
    long SourceId,
    DateTime Date,
    string Label,
    decimal Ht,              // somme des mouvements Reason=Vente
    decimal Tva,             // somme des mouvements Reason=TvaCollectee
    decimal Ttc,             // Ht + Tva
    decimal Encaisse,        // somme des mouvements Reason=Encaissement vers une caisse
    decimal Decaisse,        // somme des mouvements SortieCaisse depuis une caisse
    string? PaymentMethod    // mode de règlement récupéré depuis la source (Payment/VenteDirecte)
);

public record JournalReportDto(
    DateTime? From,
    DateTime? To,
    List<JournalEntryDto> Entries,
    decimal TotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal TotalEncaisse,
    decimal TotalDecaisse
);

public class JournalFilterParams
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    // Filtre optionnel sur le mode de paiement (Cash / MobileMoney / …).
    public string? PaymentMethod { get; set; }
}

// ── Grand livre : mouvements d'un compte avec solde progressif ─────────
public record LedgerLineDto(
    long MovementId,
    DateTime Date,
    string Direction,     // "debit" (le compte perd) | "credit" (le compte reçoit)
    decimal Amount,
    decimal Balance,      // solde après ce mouvement
    string Reason,
    string CounterpartAccountName,
    string? Label,
    string? SourceType,
    long? SourceId
);

public record LedgerReportDto(
    AccountDto Account,
    DateTime? From,
    DateTime? To,
    decimal OpeningBalance,     // solde à From (0 si From=null)
    decimal TotalDebit,          // mvts d'où le compte perd
    decimal TotalCredit,         // mvts d'où le compte reçoit
    decimal ClosingBalance,      // solde à To
    List<LedgerLineDto> Lines
);

// ── Balance : liste des comptes avec débit/crédit/solde ────────────────
public record BalanceLineDto(
    long AccountId,
    string Kind,
    string Name,
    long? OwnerRefId,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance
);

public record BalanceReportDto(
    DateTime? From,
    DateTime? To,
    string? KindFilter,
    List<BalanceLineDto> Lines,
    decimal TotalDebit,
    decimal TotalCredit
);

// ── État TVA : ventes taxables + TVA collectée par période ────────────
public record TvaReportLineDto(
    string SourceType,
    long SourceId,
    DateTime Date,
    string Label,
    decimal Ht,
    decimal Tva,
    decimal Ttc
);

public record TvaReportDto(
    DateTime? From,
    DateTime? To,
    decimal TotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal TvaRate,
    List<TvaReportLineDto> Lines
);

// ── OD manuelle : saisie multi-lignes équilibrées débit/crédit ─────────
public record OdLineRequest(
    long AccountId,
    string Direction,   // "debit" | "credit"
    decimal Amount,
    string? Label = null
);

public record CreateOdRequest(
    DateTime? Date,
    string Label,       // libellé général de l'écriture
    List<OdLineRequest> Lines
);
