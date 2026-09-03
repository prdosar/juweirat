using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Expenses;

// ── Fournisseurs ──────────────────────────────────────────────────────────
public record SupplierDto(
    long Id,
    string Name,
    string? Phone,
    string? Email,
    string? Address,
    bool IsActive,
    int ExpenseCount,
    DateTime CreatedAt
);

public record CreateSupplierRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Address
);

public record UpdateSupplierRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Address
);

// ── Catégories de charges ─────────────────────────────────────────────────
public record ExpenseCategoryDto(
    long Id,
    string Name,
    string? Color,
    bool IsActive,
    int ExpenseCount
);

public record CreateExpenseCategoryRequest(
    string Name,
    string? Color
);

public record UpdateExpenseCategoryRequest(
    string Name,
    string? Color
);

// ── Charges ───────────────────────────────────────────────────────────────
public record ExpenseDto(
    long Id,
    DateTime Date,
    string Label,
    decimal Amount,
    string? Notes,
    long CategoryId,
    string CategoryName,
    string? CategoryColor,
    long? SupplierId,
    string? SupplierName,
    long? CashRegisterId,
    string? CashRegisterName,
    long? CreatedByUserId,
    DateTime CreatedAt
);

public record CreateExpenseRequest(
    DateTime Date,
    string Label,
    decimal Amount,
    long CategoryId,
    long? SupplierId,
    long? CashRegisterId,
    string? Notes
);

// ── Rapport charges ───────────────────────────────────────────────────────
public record ExpenseByCategoryDto(
    long CategoryId,
    string CategoryName,
    string? CategoryColor,
    decimal Total,
    int Count
);

public record ExpenseReportDto(
    DateTime? From,
    DateTime? To,
    decimal TotalAmount,
    List<ExpenseByCategoryDto> ByCategory,
    List<ExpenseDto> Entries
);

public class ExpenseFilterParams : PaginationParams
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public long? CategoryId { get; set; }
    public long? SupplierId { get; set; }
}
