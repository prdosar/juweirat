using System.Security.Claims;
using Juweirat.Application.DTOs.FixedAssets;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/fixed-assets")]
[Authorize]
public class FixedAssetsController(FixedAssetService fixedAssetService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] FixedAssetFilterParams filter)
        => Ok(await fixedAssetService.GetAllAsync(filter));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await fixedAssetService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("{id:long}/depreciation-schedule")]
    public async Task<IActionResult> GetDepreciationSchedule(long id)
    {
        var schedule = await fixedAssetService.GetDepreciationScheduleAsync(id);
        return schedule is null ? NotFound() : Ok(schedule);
    }

    [HttpPost]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Create([FromBody] CreateFixedAssetRequest req)
    {
        var userId = GetCurrentUserId();
        var (dto, error) = await fixedAssetService.CreateAsync(req, userId);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateFixedAssetRequest req)
    {
        var (dto, error) = await fixedAssetService.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("{id:long}/dispose")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Dispose(long id, [FromBody] DisposeAssetRequest req)
    {
        var error = await fixedAssetService.DisposeAsync(id, req);
        if (error is not null) return error.Contains("introuvable") ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    [HttpPost("run-depreciation")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> RunDepreciation([FromBody] RunDepreciationRequest req)
    {
        try
        {
            var result = await fixedAssetService.RunDepreciationAsync(req.Period);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private long? GetCurrentUserId()
    {
        var val = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return long.TryParse(val, out var id) ? id : null;
    }
}
