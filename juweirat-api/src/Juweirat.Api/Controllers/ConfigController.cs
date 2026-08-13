using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var config = await db.Set<HotelConfig>().FirstOrDefaultAsync(c => c.Id == 1);
        if (config == null)
        {
            config = new HotelConfig { Id = 1, DateHotel = DateOnly.FromDateTime(DateTime.UtcNow) };
            db.Set<HotelConfig>().Add(config);
            await db.SaveChangesAsync();
        }
        return Ok(config);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] HotelConfig updatedConfig)
    {
        var config = await db.Set<HotelConfig>().FirstOrDefaultAsync(c => c.Id == 1);
        if (config == null) return NotFound();
        
        config.DateHotel = updatedConfig.DateHotel;
        await db.SaveChangesAsync();
        return Ok(config);
    }
}
