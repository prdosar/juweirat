using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CloturesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<Cloture>().ToListAsync());

    [HttpPost("Execute")]
    public async Task<IActionResult> Execute([FromBody] CloturePayload payload)
    {
        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            // 1. Create Postings
            if (payload.Postings != null && payload.Postings.Any())
            {
                db.Set<Posting>().AddRange(payload.Postings);
            }

            // 2. Create Cloture
            if (payload.Cloture != null)
            {
                db.Set<Cloture>().Add(payload.Cloture);
            }

            // 3. Advance DateHotel in Config
            var config = await db.Set<HotelConfig>().FirstOrDefaultAsync(c => c.Id == 1);
            if (config != null && payload.Cloture != null)
            {
                config.DateHotel = payload.Cloture.DateHotel.AddDays(1);
            }

            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, ex.Message);
        }
    }
}

public class CloturePayload
{
    public Cloture Cloture { get; set; } = null!;
    public List<Posting> Postings { get; set; } = new();
}

