using Juweirat.Application.DTOs.Pms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/pms")]
[Authorize]
public class PmsController(PmsService pms) : ControllerBase
{
    // ── Config ────────────────────────────────────────────────────────────────

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var dto = await pms.GetConfigAsync();
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdateHotelConfigRequest req)
    {
        var dto = await pms.UpdateConfigAsync(req);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Units ─────────────────────────────────────────────────────────────────

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits()
        => Ok(await pms.GetUnitsAsync());

    [HttpGet("units/{id:long}")]
    public async Task<IActionResult> GetUnit(long id)
    {
        var dto = await pms.GetUnitByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("units/{id:long}/menage")]
    public async Task<IActionResult> PatchMenage(long id, [FromBody] PatchMenageRequest req)
    {
        var (dto, error) = await pms.PatchMenageAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("units/{id:long}/hs")]
    public async Task<IActionResult> PatchHorsService(long id, [FromBody] PatchHorsServiceRequest req)
    {
        var (dto, error) = await pms.PatchHorsServiceAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Folios ────────────────────────────────────────────────────────────────

    [HttpGet("folios")]
    public async Task<IActionResult> GetFolios(
        [FromQuery] bool? closed = null,
        [FromQuery] long? unitId = null,
        [FromQuery] string? status = null)
        => Ok(await pms.GetFoliosAsync(closed, unitId, status));

    [HttpGet("folios/{id:long}")]
    public async Task<IActionResult> GetFolio(long id)
    {
        var dto = await pms.GetFolioByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios")]
    public async Task<IActionResult> CreateFolio([FromBody] CreateFolioRequest req)
    {
        var (dto, error) = await pms.CreateFolioAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetFolio), new { id = dto!.Id }, dto);
    }

    [HttpPatch("folios/{id:long}")]
    public async Task<IActionResult> UpdateFolio(long id, [FromBody] UpdateFolioRequest req)
    {
        var (dto, error) = await pms.UpdateFolioAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/checkin")]
    public async Task<IActionResult> CheckIn(long id)
    {
        var (dto, error) = await pms.CheckInAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/checkout")]
    public async Task<IActionResult> CheckOut(long id)
    {
        var (dto, error) = await pms.CheckOutAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/encaisser")]
    public async Task<IActionResult> Encaisser(long id, [FromBody] EncaisserRequest req)
    {
        var (dto, error) = await pms.EncaisserAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/transfer-debiteur")]
    public async Task<IActionResult> TransferDebiteur(long id, [FromBody] TransfertDebiteurRequest req)
    {
        var (dto, error) = await pms.TransferDebiteurAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }
}
