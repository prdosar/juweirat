using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Juweirat.Application.DTOs.Auth;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Juweirat.Infrastructure.Services;

public class AuthService(AppDbContext db, IConfiguration config)
{
    public async Task<(LoginResponse? response, string? error)> LoginAsync(LoginRequest req)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return (null, "Invalid email or password");

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var token   = GenerateToken(user.Id, user.Email, user.Role);
        var expires = DateTime.UtcNow.AddHours(24);

        return (new LoginResponse(token, user.Email, user.FullName, user.Role, expires), null);
    }

    private string GenerateToken(long userId, string email, string role)
    {
        var jwtConfig = config.GetSection("Jwt");
        var key       = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig["Key"]!));
        var creds     = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role,               role),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             jwtConfig["Issuer"],
            audience:           jwtConfig["Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
