namespace Juweirat.Domain.Entities;

public class Expense
{
    public long Id { get; set; }
    public DateTime Date { get; set; }
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    public long CategoryId { get; set; }
    public long? SupplierId { get; set; }

    // Caisse depuis laquelle la charge a été payée (null = non précisée)
    public long? CashRegisterId { get; set; }

    public long? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ExpenseCategory Category { get; set; } = null!;
    public Supplier? Supplier { get; set; }
    public CashRegister? CashRegister { get; set; }
}
