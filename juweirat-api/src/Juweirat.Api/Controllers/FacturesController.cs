using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FacturesController(FactureService factureService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await factureService.GetAllAsync());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var item = await factureService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("Emit/{folioId:long}")]
    public async Task<IActionResult> Emit(long folioId, [FromQuery] string recipient = "client")
    {
        var (facture, error) = await factureService.EmitFactureAsync(folioId, recipient);
        if (error != null) return BadRequest(new { error });
        return Ok(facture);
    }

    [HttpPost("{id:long}/Cancel")]
    public async Task<IActionResult> Cancel(long id)
    {
        var (facture, error) = await factureService.CancelFactureAsync(id);
        if (error != null) return BadRequest(new { error });
        return Ok(facture);
    }
}
