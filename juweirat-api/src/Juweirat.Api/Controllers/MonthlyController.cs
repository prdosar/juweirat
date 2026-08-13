using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MonthlyController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var records = await db.Set<MonthlyRecord>().ToListAsync();
        // Return a nested dict: { "2026-08": { "42": { ... }, "43": { ... } } }
        var result = new Dictionary<string, Dictionary<string, object>>();
        foreach(var r in records)
        {
            if (!result.ContainsKey(r.YearMonth)) result[r.YearMonth] = new();
            result[r.YearMonth][r.UnitId] = JsonSerializer.Deserialize<object>(r.DataJson);
        }
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> BulkSave([FromBody] Dictionary<string, Dictionary<string, object>> payload)
    {
        // Simple full replacement for the prototype
        db.Set<MonthlyRecord>().RemoveRange(db.Set<MonthlyRecord>());
        await db.SaveChangesAsync();

        foreach(var kvp in payload)
        {
            foreach(var unitKvp in kvp.Value)
            {
                db.Set<MonthlyRecord>().Add(new MonthlyRecord 
                { 
                    YearMonth = kvp.Key, 
                    UnitId = unitKvp.Key, 
                    DataJson = JsonSerializer.Serialize(unitKvp.Value) 
                });
            }
        }
        await db.SaveChangesAsync();
        return Ok();
    }
}
