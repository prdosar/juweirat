using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

// Force le rôle "admin" sur le compte administrateur historique de Juweirat
// pour qu'il puisse accéder au module Utilisateurs sans intervention SQL manuelle.
// Idempotent : si le rôle est déjà "admin" et le compte actif, no-op silencieux.
// Ne crée pas l'utilisateur s'il n'existe pas — on ne veut pas d'admin par défaut
// avec un mot de passe connu en base.
public static class UserSeeder
{
    private const string AdminEmail = "admin@juweirat.com";

    public static async Task SeedAsync(AppDbContext db)
    {
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == AdminEmail);
        if (admin is null) return;

        var changed = false;
        if (admin.Role != "admin")   { admin.Role     = "admin"; changed = true; }
        if (!admin.IsActive)         { admin.IsActive = true;    changed = true; }

        if (changed) await db.SaveChangesAsync();
    }
}
