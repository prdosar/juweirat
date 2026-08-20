using Juweirat.Application.DTOs.Ventes;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ventes-directes")]
public class VentesDirectesController(VenteDirecteService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date = null)
    {
        DateOnly? d = null;
        if (date is not null && DateOnly.TryParse(date, out var parsed)) d = parsed;
        return Ok(await svc.GetAllAsync(d));
    }

    [HttpGet("folio-actif")]
    public async Task<IActionResult> GetFolioActif([FromQuery] long clientId)
    {
        var folio = await svc.GetFolioActifAsync(clientId);
        return folio is null ? NotFound() : Ok(folio);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVenteDirecteRequest req)
    {
        var (dto, error) = await svc.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return StatusCode(201, dto);
    }

    // Vente de plusieurs prestations en une seule opération (panier POS).
    // Une seule transaction, une seule écriture d'encaissement agrégée.
    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] BatchVenteRequest req)
    {
        var (dtos, error) = await svc.CreateBatchAsync(req);
        if (error is not null) return BadRequest(new { error });
        return StatusCode(201, dtos);
    }
}
