using Juweirat.Application.DTOs.Companies;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompaniesController(CompanyService companyService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await companyService.GetAllAsync());

    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged([FromQuery] CompanyFilterParams filter)
        => Ok(await companyService.GetPagedAsync(filter));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await companyService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCompanyRequest req)
    {
        var (dto, error) = await companyService.CreateAsync(req);
        if (error is not null) return Conflict(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateCompanyRequest req)
    {
        var (dto, error) = await companyService.UpdateAsync(id, req);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPut("{id:long}/tarifs")]
    public async Task<IActionResult> SetTarif(long id, [FromBody] SetCompanyTarifRequest req)
    {
        var (success, error) = await companyService.SetTarifAsync(id, req);
        if (!success) return error == "Company not found" ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    [HttpPost("{id:long}/clients")]
    public async Task<IActionResult> AssignClient(long id, [FromBody] AssignClientRequest req)
    {
        var (success, error) = await companyService.AssignClientAsync(id, req.ClientId);
        if (!success) return error == "Company not found" ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    [HttpDelete("{id:long}/clients/{clientId:long}")]
    public async Task<IActionResult> RemoveClient(long id, long clientId)
    {
        var (success, error) = await companyService.RemoveClientAsync(id, clientId);
        if (!success) return NotFound(new { error });
        return NoContent();
    }

    [HttpGet("{id:long}/stays")]
    public async Task<IActionResult> GetStays(long id, [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        if (from > to) return BadRequest(new { error = "'from' must be earlier than 'to'." });
        var stays = await companyService.GetStaysAsync(id, from, to);
        return Ok(stays);
    }
}
