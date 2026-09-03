namespace Juweirat.Domain.Entities;

public class ExpenseCategory
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Expense> Expenses { get; set; } = [];
}
