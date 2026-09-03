using System.Security.Claims;
using Juweirat.Application.DTOs.Expenses;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController(ExpenseService expenseService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ExpenseFilterParams filter)
        => Ok(await expenseService.GetAllAsync(filter));

    [HttpGet("report")]
    public async Task<IActionResult> GetReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
        => Ok(await expenseService.GetReportAsync(from, to));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await expenseService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Create([FromBody] CreateExpenseRequest req)
    {
        var userId = GetCurrentUserId();
        var (dto, error) = await expenseService.CreateAsync(req, userId);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Delete(long id)
    {
        var error = await expenseService.DeleteAsync(id);
        if (error is not null) return error == "Charge introuvable." ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    private long? GetCurrentUserId()
    {
        var val = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return long.TryParse(val, out var id) ? id : null;
    }
}
