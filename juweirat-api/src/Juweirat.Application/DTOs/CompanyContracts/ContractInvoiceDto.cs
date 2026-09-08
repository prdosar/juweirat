using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.CompanyContracts;

// Facture mensuelle d'un contrat compagnie.
public record ContractInvoiceDto(
    long Id,
    string Number,
    long CompanyContractId,
    string ContractReference,
    long CompanyId,
    string CompanyName,
    long RoomId,
    string RoomNumber,
    int Year,
    int Month,
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
    [Range(2020, 2100)] int Year,
    [Range(1, 12)] int Month
);

public record MarkInvoicePaidRequest(
    [Required] string PaymentMethod,     // "Virement" | "Chèque" | "Cash"
    string? PaymentRef,
    DateOnly? PaidOn                     // date d'encaissement ; défaut = aujourd'hui
);
