using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FacturesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<Facture>().ToListAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var item = await db.Set<Facture>().FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Facture req)
    {
        db.Set<Facture>().Add(req);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = req.Id }, req);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] Facture req)
    {
        if (id != req.Id) return BadRequest();
        db.Entry(req).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(req);
    }
}
