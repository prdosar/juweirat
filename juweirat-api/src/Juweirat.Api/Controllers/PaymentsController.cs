using Juweirat.Application.DTOs.Payments;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController(PaymentService paymentService) : ControllerBase
{
    [HttpGet("reservation/{reservationId:long}")]
    public async Task<IActionResult> GetByReservation(long reservationId)
        => Ok(await paymentService.GetByReservationAsync(reservationId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest req)
    {
        var (dto, error) = await paymentService.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return StatusCode(201, dto);
    }

    [HttpPost("{id:long}/gateway-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GatewayCallback(long id, [FromBody] GatewayCallbackRequest req)
    {
        var (dto, error) = await paymentService.HandleGatewayCallbackAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return Ok(dto);
    }
}
