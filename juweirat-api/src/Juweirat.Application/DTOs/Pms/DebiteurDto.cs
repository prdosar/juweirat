using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Pms;

public record DebiteurDto(
    long Id,
    string Client,
    string Label,
    DateOnly DueDate,
    int Amount,
    int Paid,
    int Solde,
    long? FolioId,
    string? FolioNumber,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateDebiteurRequest(
    [Required] string Client,
    [Required] string Label,
    [Required] DateOnly DueDate,
    [Required, Range(1, int.MaxValue)] int Amount,
    long? FolioId = null
);

public record UpdateDebiteurRequest(
    string? Client = null,
    string? Label = null,
    DateOnly? DueDate = null,
    int? Amount = null,
    int? Paid = null
);

public record PayDebiteurRequest([Required, Range(1, int.MaxValue)] int Montant);
