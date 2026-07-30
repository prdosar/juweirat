using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Auth;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password
);
