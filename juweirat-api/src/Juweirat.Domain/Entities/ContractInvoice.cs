using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Facture périodique d'un contrat compagnie long terme.
// La périodicité dépend du contrat (Mensuel/Trimestriel/Semestriel/Annuel).
// Une facture par (contrat × periodIndex) — garanti par l'index unique en base.
// Séparée de Facture qui reste dédiée aux cycles PMS (folios).
public class ContractInvoice
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty; // CT-INV-YYYY-NNNN

    public long CompanyContractId { get; set; }
    public CompanyContract Contract { get; set; } = null!;

    // Numéro d'ordre de la période depuis le début du contrat (1-based).
    // Ex : contrat 15/06/2026 trimestriel → PeriodIndex 1 = 15/06→14/09.
    public int PeriodIndex { get; set; }

    // Nombre de mois couverts par cette facture (snapshot au moment de l'émission).
    // Miroir de contract.BillingFrequency à l'émission ; permet de rester lisible
    // même si la fréquence du contrat évolue (pas supporté aujourd'hui mais sécurise).
    // 1 = Mensuel, 3 = Trimestriel, 6 = Semestriel, 12 = Annuel.
    public int MonthsCovered { get; set; }

    // Année utilisée pour la numérotation + le tri lisible (année de PeriodStart).
    public int Year { get; set; }

    // Période couverte, alignée sur l'anniversaire du contrat.
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd   { get; set; } // inclusive : dernier jour de la période

    // Snapshot des montants — figé à l'émission pour rester correct même si le
    // contrat évolue (MonthlyRate modifié, changement de statut TVA…).
    public int TotalHt   { get; set; }
    public int Tva       { get; set; }
    public int TotalTtc  { get; set; }
    public decimal TvaRate { get; set; } // 0.18 ou 0
    public bool TvaExonere { get; set; }

    // Snapshot du statut électricité au moment de l'émission (le contrat peut
    // évoluer ; la facture émise doit rester lisible dans son état d'origine).
    public bool ElecIncluded { get; set; }

    public ContractInvoiceStatus Status { get; set; } = ContractInvoiceStatus.Issued;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public string?   PaymentMethod { get; set; } // "Virement" | "Chèque" | "Cash"
    public string?   PaymentRef    { get; set; } // n° chèque, ref virement…

    public long? IssuedByUserId { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
