using Juweirat.Application.DTOs.Rooms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/room-categories")]
public class RoomCategoriesController(RoomCategoryService svc, IWebHostEnvironment env) : ControllerBase
{
    private string UploadsPath => Path.Combine(env.ContentRootPath, "uploads");

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

    // Compte le nombre de chambres réellement disponibles pour une catégorie
    // sur les dates données (utilisé par le site public pour bloquer la saisie).
    [HttpGet("{id:long}/availability")]
    public async Task<IActionResult> GetAvailability(
        long id,
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut,
        [FromQuery] int adults = 1)
    {
        if (checkOut <= checkIn)
            return BadRequest(new { error = "checkOut must be after checkIn" });
        var dto = await svc.GetAvailabilityAsync(id, checkIn, checkOut, adults);
        return dto is null ? NotFound() : Ok(dto);
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

        var image = await svc.UploadImageAsync(id, file.OpenReadStream(), ext, UploadsPath);
        return image is null ? NotFound() : Ok(image);
    }

    [Authorize]
    [HttpDelete("{id:long}/images/{imageId:long}")]
    public async Task<IActionResult> DeleteImage(long id, long imageId)
    {
        var deleted = await svc.DeleteImageAsync(id, imageId, UploadsPath);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPatch("{id:long}/images/{imageId:long}/cover")]
    public async Task<IActionResult> SetCover(long id, long imageId)
    {
        var ok = await svc.SetCoverAsync(id, imageId);
        return ok ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPut("{id:long}/images/reorder")]
    public async Task<IActionResult> ReorderImages(long id, [FromBody] ReorderImagesRequest req)
    {
        if (req.ImageIds == null || req.ImageIds.Count == 0)
            return BadRequest(new { error = "ImageIds list cannot be empty" });

        var ok = await svc.ReorderImagesAsync(id, req.ImageIds);
        return ok ? NoContent() : NotFound();
    }
}

