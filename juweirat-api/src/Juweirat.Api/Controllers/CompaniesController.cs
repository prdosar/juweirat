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

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await companyService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCompanyRequest req)
    {
        var dto = await companyService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateCompanyRequest req)
    {
        var dto = await companyService.UpdateAsync(id, req);
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
}
