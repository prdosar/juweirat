using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

// Facture mensuelle d'un contrat compagnie long terme.
// Une par mois par contrat (index unique sur CompanyContractId + Year + Month).
// Séparée de Facture qui reste dédiée aux cycles PMS (folios).
public class ContractInvoice
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty; // CT-INV-2026-01-0001

    public long CompanyContractId { get; set; }
    public CompanyContract Contract { get; set; } = null!;

    // Période couverte (calendrier civil : 1er au dernier jour du mois).
    public int Year  { get; set; }
    public int Month { get; set; } // 1-12
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd   { get; set; } // inclusive : dernier jour du mois

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
