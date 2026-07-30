using Juweirat.Application.DTOs.Clients;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController(ClientService clientService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
        => Ok(await clientService.GetAllAsync(search));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var client = await clientService.GetByIdAsync(id);
        return client is null ? NotFound() : Ok(client);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest req)
    {
        var (dto, error) = await clientService.CreateAsync(req);
        if (error is not null) return Conflict(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateClientRequest req)
    {
        var dto = await clientService.UpdateAsync(id, req);
        return dto is null ? NotFound() : Ok(dto);
    }
}
