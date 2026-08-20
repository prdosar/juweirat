using Juweirat.Application.DTOs.Users;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Gestion des utilisateurs — création + édition réservées au rôle admin
// (protégé au niveau du controller). Le mot de passe est stocké en BCrypt.
public class UserService(AppDbContext db)
{
    public async Task<List<UserDto>> GetAllAsync(bool includeInactive = true)
    {
        var query = db.Users.AsQueryable();
        if (!includeInactive) query = query.Where(u => u.IsActive);
        var users = await query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ToListAsync();
        return users.Select(ToDto).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(long id)
    {
        var u = await db.Users.FindAsync(id);
        return u is null ? null : ToDto(u);
    }

    public async Task<(UserDto? dto, string? error)> CreateAsync(CreateUserRequest req)
    {
        var role = (req.Role ?? "").Trim().ToLowerInvariant();
        if (!UserRoles.IsValid(role))
            return (null, $"Rôle invalide. Valeurs autorisées : {string.Join(", ", UserRoles.All)}.");

        if (req.Password.Length < 6)
            return (null, "Le mot de passe doit contenir au moins 6 caractères.");

        var email = req.Email.Trim().ToLowerInvariant();
        var exists = await db.Users.AnyAsync(u => u.Email.ToLower() == email);
        if (exists) return (null, $"Un utilisateur avec l'email {email} existe déjà.");

        var user = new User
        {
            FirstName    = req.FirstName.Trim(),
            LastName     = req.LastName.Trim(),
            Email        = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = role,
            IsActive     = true,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return (ToDto(user), null);
    }

    public async Task<(UserDto? dto, string? error)> UpdateAsync(long id, UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return (null, null);

        if (req.FirstName is not null) user.FirstName = req.FirstName.Trim();
        if (req.LastName is not null)  user.LastName  = req.LastName.Trim();

        if (req.Email is not null)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            if (email != user.Email)
            {
                var conflict = await db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == email);
                if (conflict) return (null, $"Un autre utilisateur utilise déjà l'email {email}.");
                user.Email = email;
            }
        }

        if (req.Role is not null)
        {
            var role = req.Role.Trim().ToLowerInvariant();
            if (!UserRoles.IsValid(role))
                return (null, $"Rôle invalide. Valeurs autorisées : {string.Join(", ", UserRoles.All)}.");
            user.Role = role;
        }

        if (!string.IsNullOrEmpty(req.Password))
        {
            if (req.Password.Length < 6)
                return (null, "Le mot de passe doit contenir au moins 6 caractères.");
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        }

        if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;

        await db.SaveChangesAsync();
        return (ToDto(user), null);
    }

    private static UserDto ToDto(User u) => new(
        u.Id, u.FirstName, u.LastName, u.FullName,
        u.Email, u.Role, u.IsActive, u.LastLoginAt, u.CreatedAt
    );
}
