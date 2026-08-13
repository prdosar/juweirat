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

}
