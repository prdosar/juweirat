using Juweirat.Application.DTOs.Auth;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var (response, error) = await authService.LoginAsync(req);
        if (error is not null) return Unauthorized(new { error });
        return Ok(response);
    }
}
