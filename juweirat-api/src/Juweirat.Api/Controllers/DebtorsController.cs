using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DebtorsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<Debtor>().ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Debtor req)
    {
        db.Set<Debtor>().Add(req);
        await db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] Debtor req)
    {
        if (id != req.Id) return BadRequest();
        db.Entry(req).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(req);
    }
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var item = await db.Set<Debtor>().FindAsync(id);
        if (item is null) return NotFound();
        db.Set<Debtor>().Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
