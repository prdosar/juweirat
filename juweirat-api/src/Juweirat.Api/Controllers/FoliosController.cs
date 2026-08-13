using Juweirat.Application.DTOs.Folios;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoliosController(FolioService folioService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await folioService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var f = await folioService.GetByIdAsync(id);
        return f is null ? NotFound() : Ok(f);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFolioRequest req)
    {
        var (dto, error) = await folioService.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateFolioRequest req)
    {
        var (dto, error) = await folioService.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }
}
