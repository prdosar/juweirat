using Juweirat.Application.DTOs.Reservations;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReservationsController(ReservationService reservationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
        => Ok(await reservationService.GetAllAsync(status));

    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged([FromQuery] ReservationFilterParams filter)
        => Ok(await reservationService.GetPagedAsync(filter));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var r = await reservationService.GetByIdAsync(id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest req)
    {
        var (dto, error) = await reservationService.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateReservationStatusRequest req)
    {
        var (dto, error) = await reservationService.UpdateStatusAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    // Aperçu de la retenue No Show — permet au popup admin d'afficher le montant
    // et de choisir le mode de paiement avant confirmation. Aucun effet de bord.
    [HttpGet("{id:long}/noshow-preview")]
    public async Task<IActionResult> PreviewNoShow(long id)
    {
        var (dto, error) = await reservationService.PreviewNoShowAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    public record ProcessNoShowRequest(string? PaymentMethod = null);

    [HttpPost("{id:long}/process-noshow")]
    public async Task<IActionResult> ProcessNoShow(long id, [FromBody] ProcessNoShowRequest? req)
    {
        var (dto, error) = await reservationService.ProcessNoShowAsync(id, req?.PaymentMethod);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    public record ProcessCancellationRequest(string? Reason = null, string? PaymentMethod = null);

    [HttpPost("{id:long}/process-cancellation")]
    public async Task<IActionResult> ProcessCancellation(long id, [FromBody] ProcessCancellationRequest? req)
    {
        var (dto, error) = await reservationService.ProcessCancellationAsync(id, req?.Reason, req?.PaymentMethod);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateReservationRequest req)
    {
        var (dto, error) = await reservationService.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("tarif-preview")]
    public async Task<IActionResult> GetTarifPreview([FromQuery] long clientId, [FromQuery] long categoryId, [FromQuery] int nights = 1)
    {
        if (clientId <= 0 || categoryId <= 0) return BadRequest(new { error = "clientId and categoryId are required" });
        var dto = await reservationService.GetTarifPreviewAsync(clientId, categoryId, nights);
        return dto is null ? NotFound(new { error = "Category not found" }) : Ok(dto);
    }
}
