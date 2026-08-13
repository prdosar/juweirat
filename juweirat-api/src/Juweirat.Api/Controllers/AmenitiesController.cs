using Juweirat.Application.DTOs.Rooms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AmenitiesController(AmenityService amenityService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await amenityService.GetAllAsync());

    // [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAmenityRequest req)
    {
        var (dto, _) = await amenityService.CreateAsync(req);
        return StatusCode(201, dto);
    }

    // [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await amenityService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
