using Juweirat.Application.DTOs.Expenses;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController(SupplierService supplierService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false)
        => Ok(await supplierService.GetAllAsync(search, includeInactive));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await supplierService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupplierRequest req)
    {
        var (dto, error) = await supplierService.CreateAsync(req);
        if (error is not null) return Conflict(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateSupplierRequest req)
    {
        var (dto, error) = await supplierService.UpdateAsync(id, req);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Deactivate(long id)
    {
        var success = await supplierService.DeactivateAsync(id);
        return success ? NoContent() : NotFound();
    }
}
