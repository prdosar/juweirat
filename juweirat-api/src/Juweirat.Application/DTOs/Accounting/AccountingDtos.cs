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
