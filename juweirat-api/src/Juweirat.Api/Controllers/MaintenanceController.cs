using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<MaintenanceTicket>().ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MaintenanceTicket req)
    {
        db.Set<MaintenanceTicket>().Add(req);
        await db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] MaintenanceTicket req)
    {
        if (id != req.Id) return BadRequest();
        db.Entry(req).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(req);
    }
}
