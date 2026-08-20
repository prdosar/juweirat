using Juweirat.Application.DTOs.Users;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

// Toutes les routes exigent role=admin dans le JWT.
// Les autres modules de l'app restent ouverts à tous les utilisateurs authentifiés
// jusqu'à ce qu'on affine les permissions par rôle.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class UsersController(UserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = true)
        => Ok(await userService.GetAllAsync(includeInactive));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await userService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        var (dto, error) = await userService.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateUserRequest req)
    {
        var (dto, error) = await userService.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }
}
