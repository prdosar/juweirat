using Juweirat.Application.DTOs.Prestations;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/prestations")]
public class PrestationsController(PrestationAnnexeService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = false)
        => Ok(await svc.GetAllAsync(activeOnly));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await svc.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePrestationRequest req)
    {
        var (dto, error) = await svc.CreateAsync(req);
        if (error is not null) return Conflict(new { error });
        return StatusCode(201, dto);
    }

    [Authorize]
    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePrestationRequest req)
    {
        var (dto, error) = await svc.UpdateAsync(id, req);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await svc.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpGet("{id:long}/consumptions")]
    public async Task<IActionResult> GetConsumptions(long id, [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        if (from > to) return BadRequest(new { error = "'from' must be earlier than 'to'." });
        var list = await svc.GetConsumptionsAsync(id, from, to);
        return Ok(list);
    }
}
