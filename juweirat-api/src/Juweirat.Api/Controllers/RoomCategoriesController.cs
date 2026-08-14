using Juweirat.Application.DTOs.Rooms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/room-categories")]
public class RoomCategoriesController(RoomCategoryService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await svc.GetAllAsync());

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable(
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut,
        [FromQuery] int adults = 1)
    {
        if (checkOut <= checkIn)
            return BadRequest(new { error = "checkOut must be after checkIn" });
        return Ok(await svc.GetAvailableAsync(checkIn, checkOut, adults));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var cat = await svc.GetByIdAsync(id);
        return cat is null ? NotFound() : Ok(cat);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var cat = await svc.GetBySlugAsync(slug);
        return cat is null ? NotFound() : Ok(cat);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomCategoryRequest req)
    {
        var cat = await svc.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = cat.Id }, cat);
    }

    [Authorize]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateRoomCategoryRequest req)
    {
        var cat = await svc.UpdateAsync(id, req);
        return cat is null ? NotFound() : Ok(cat);
    }
}
