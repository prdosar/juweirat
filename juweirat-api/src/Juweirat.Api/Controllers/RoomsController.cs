using Juweirat.Application.DTOs.Rooms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController(RoomService roomService, IWebHostEnvironment env) : ControllerBase
{
    private string UploadsPath => Path.Combine(env.ContentRootPath, "uploads");

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? floor)
        => Ok(await roomService.GetAllAsync(status, floor));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var room = await roomService.GetByIdAsync(id);
        return room is null ? NotFound() : Ok(room);
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable(
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut,
        [FromQuery] int adults = 1)
    {
        if (checkOut <= checkIn)
            return BadRequest(new { error = "checkOut must be after checkIn" });
        return Ok(await roomService.GetAvailableAsync(checkIn, checkOut, adults));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomRequest req)
    {
        var room = await roomService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = room.Id }, room);
    }

    [Authorize]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateRoomRequest req)
    {
        var room = await roomService.UpdateAsync(id, req);
        return room is null ? NotFound() : Ok(room);
    }

    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await roomService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // ── Images ────────────────────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id:long}/images")]
    [RequestSizeLimit(20_000_000)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(long id, [FromForm] IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Aucun fichier fourni" });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { error = "Formats acceptés : JPG, PNG, WEBP" });

        var image = await roomService.UploadImageAsync(id, file.OpenReadStream(), ext, UploadsPath);
        return image is null ? NotFound() : Ok(image);
    }

    [Authorize]
    [HttpDelete("{id:long}/images/{imageId:long}")]
    public async Task<IActionResult> DeleteImage(long id, long imageId)
    {
        var deleted = await roomService.DeleteImageAsync(id, imageId, UploadsPath);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPatch("{id:long}/images/{imageId:long}/cover")]
    public async Task<IActionResult> SetCover(long id, long imageId)
    {
        var ok = await roomService.SetCoverAsync(id, imageId);
        return ok ? NoContent() : NotFound();
    }
}
