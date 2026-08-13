using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PostingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await db.Set<Posting>().ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Posting req)
    {
        db.Set<Posting>().Add(req);
        await db.SaveChangesAsync();
        return Ok(req);
    }
}
