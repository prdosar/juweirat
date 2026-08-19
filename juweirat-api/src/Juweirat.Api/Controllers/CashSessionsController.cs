using System.Security.Claims;
using Juweirat.Application.DTOs.Accounting;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/cash/sessions")]
[Authorize]
public class CashSessionsController(CashSessionService cashSessionService) : ControllerBase
{
    private long? CurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return long.TryParse(raw, out var id) ? id : null;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var dto = await cashSessionService.GetCurrentAsync(uid.Value);
        return Ok(dto); // dto may be null → 200 with body null pour indiquer "aucune session ouverte"
    }

    [HttpGet]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 50)
        => Ok(await cashSessionService.GetHistoryAsync(limit));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await cashSessionService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("{id:long}/report")]
    public async Task<IActionResult> GetReport(long id)
    {
        var report = await cashSessionService.GetReportAsync(id);
        return report is null ? NotFound() : Ok(report);
    }

    [HttpPost]
    public async Task<IActionResult> Open([FromBody] OpenCashSessionRequest req)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var (dto, error) = await cashSessionService.OpenAsync(uid.Value, req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPost("{id:long}/movements")]
    public async Task<IActionResult> AddMovement(long id, [FromBody] AddManualMovementRequest req)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var (dto, error) = await cashSessionService.AddManualMovementAsync(id, uid.Value, req);
        if (error is not null) return BadRequest(new { error });
        return Ok(dto);
    }

    [HttpPost("{id:long}/close")]
    public async Task<IActionResult> Close(long id, [FromBody] CloseCashSessionRequest req)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var (dto, error) = await cashSessionService.CloseAsync(id, uid.Value, req);
        if (error is not null) return BadRequest(new { error });
        return Ok(dto);
    }
}
