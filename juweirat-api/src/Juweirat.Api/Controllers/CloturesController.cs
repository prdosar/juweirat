using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CloturesController(AppDbContext db, NightAuditService nightAuditService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<Cloture>().OrderByDescending(c => c.DateHotel).ToListAsync());

    [HttpPost("Execute")]
    public async Task<IActionResult> Execute()
    {
        var (success, error, cloture) = await nightAuditService.ExecuteNightAuditAsync();
        
        if (!success)
        {
            return BadRequest(new { error = error });
        }

        return Ok(new { message = "Clôture exécutée avec succès.", cloture });
    }
}
