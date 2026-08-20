using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Users;

// Rôles autorisés — validé côté service.
// Pour l'instant tous les endpoints métier restent ouverts à tous ; seul le
// module utilisateurs (création/modification) exige role=admin.
public static class UserRoles
{
    public const string Admin       = "admin";
    public const string Utilisateur = "utilisateur";
    public const string Comptable   = "comptable";

    public static readonly string[] All = [Admin, Utilisateur, Comptable];

    public static bool IsValid(string? role) =>
        !string.IsNullOrWhiteSpace(role) && Array.Exists(All, r => r == role.ToLowerInvariant());
}

public record UserDto(
    long Id,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime? LastLoginAt,
    DateTime CreatedAt
);

public record CreateUserRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password,
    [Required] string Role
);

public record UpdateUserRequest(
    string? FirstName = null,
    string? LastName = null,
    [EmailAddress] string? Email = null,
    // null = pas de changement, sinon minimum 6 caractères validé côté service.
    string? Password = null,
    string? Role = null,
    bool? IsActive = null
);
