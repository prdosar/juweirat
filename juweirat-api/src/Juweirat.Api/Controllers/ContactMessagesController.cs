using System.Security.Claims;
using Juweirat.Application.DTOs.ContactMessages;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContactMessagesController(ContactMessageService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var messages = await service.GetAllAsync(status, search);
        return Ok(messages);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var msg = await service.GetByIdAsync(id);
        if (msg is null) return NotFound(new { error = "Message introuvable." });
        return Ok(msg);
    }

    [HttpPost("{id:long}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var ok = await service.MarkAsReadAsync(id);
        if (!ok) return NotFound(new { error = "Message introuvable." });
        return Ok(new { success = true });
    }

    [HttpPost("{id:long}/reply")]
    public async Task<IActionResult> Reply(long id, [FromBody] ReplyContactMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ReplyBody))
        {
            return BadRequest(new { error = "Le contenu de la réponse est requis." });
        }

        var userName = User.FindFirstValue(ClaimTypes.Name) 
                    ?? User.FindFirstValue(ClaimTypes.Email) 
                    ?? "Direction Juweirat";

        var (success, error) = await service.ReplyAsync(id, req.ReplyBody, userName);
        if (!success) return BadRequest(new { error = error ?? "Échec de l'envoi de la réponse." });

        return Ok(new { success = true });
    }
}
