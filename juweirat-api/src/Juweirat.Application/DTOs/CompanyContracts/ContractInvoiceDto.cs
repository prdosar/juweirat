using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.CompanyContracts;

// Facture périodique d'un contrat compagnie (mensuelle/trimestrielle/semestrielle/annuelle).
public record ContractInvoiceDto(
    long Id,
    string Number,
    long CompanyContractId,
    string ContractReference,
    long CompanyId,
    string CompanyName,
    long RoomId,
    string RoomNumber,
    int PeriodIndex,           // 1-based, période depuis début du contrat
    int MonthsCovered,         // 1 | 3 | 6 | 12 (snapshot)
    int Year,                  // année de PeriodStart (numérotation + tri)
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    int TotalHt,
    int Tva,
    int TotalTtc,
    decimal TvaRate,
    bool TvaExonere,
    bool ElecIncluded,
    string Status,           // Issued | Paid | Cancelled
    DateTime IssuedAt,
    DateTime? PaidAt,
    string? PaymentMethod,
    string? PaymentRef,
    string? Notes,
    DateTime CreatedAt
);

public record GenerateContractInvoiceRequest(
    [Range(1, 240)] int PeriodIndex   // 1..N ; borne haute large (20 ans max mensuel)
);

public record MarkInvoicePaidRequest(
    [Required] string PaymentMethod,     // "Virement" | "Chèque" | "Cash"
    string? PaymentRef,
    DateOnly? PaidOn                     // date d'encaissement ; défaut = aujourd'hui
);
