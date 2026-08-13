using System;

namespace Juweirat.Domain.Entities;

public class MonthlyRecord
{
    public long Id { get; set; }
    public string YearMonth { get; set; } = string.Empty;
    public string UnitId { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
}
