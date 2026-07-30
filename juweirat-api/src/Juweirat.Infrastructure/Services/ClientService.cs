using Juweirat.Application.DTOs.Clients;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class ClientService(AppDbContext db)
{
    public async Task<List<ClientDto>> GetAllAsync(string? search = null)
    {
        var query = db.Clients
            .Include(c => c.Reservations)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            query  = query.Where(c =>
                c.FirstName.ToLower().Contains(search) ||
                c.LastName.ToLower().Contains(search)  ||
                (c.Email != null && c.Email.ToLower().Contains(search)) ||
                (c.Phone != null && c.Phone.Contains(search)));
        }

        var list = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<ClientDto?> GetByIdAsync(long id)
    {
        var c = await db.Clients
            .Include(c => c.Reservations)
            .FirstOrDefaultAsync(c => c.Id == id);
        return c is null ? null : ToDto(c);
    }

    public async Task<(ClientDto? dto, string? error)> CreateAsync(CreateClientRequest req)
    {
        if (req.Email is not null)
        {
            var exists = await db.Clients.AnyAsync(c => c.Email == req.Email);
            if (exists) return (null, $"A client with email {req.Email} already exists");
        }

        var client = new Client
        {
            FirstName      = req.FirstName,
            LastName       = req.LastName,
            Email          = req.Email,
            Phone          = req.Phone,
            Nationality    = req.Nationality,
            DocumentType   = req.DocumentType,
            DocumentNumber = req.DocumentNumber,
            City           = req.City,
            Country        = req.Country,
            Notes          = req.Notes,
        };

        db.Clients.Add(client);
        await db.SaveChangesAsync();
        return (ToDto(client), null);
    }

    public async Task<ClientDto?> UpdateAsync(long id, UpdateClientRequest req)
    {
        var client = await db.Clients
            .Include(c => c.Reservations)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client is null) return null;

        if (req.FirstName is not null)      client.FirstName      = req.FirstName;
        if (req.LastName is not null)       client.LastName       = req.LastName;
        if (req.Email is not null)          client.Email          = req.Email;
        if (req.Phone is not null)          client.Phone          = req.Phone;
        if (req.Nationality is not null)    client.Nationality    = req.Nationality;
        if (req.DocumentType is not null)   client.DocumentType   = req.DocumentType;
        if (req.DocumentNumber is not null) client.DocumentNumber = req.DocumentNumber;
        if (req.City is not null)           client.City           = req.City;
        if (req.Country is not null)        client.Country        = req.Country;
        if (req.Notes is not null)          client.Notes          = req.Notes;

        await db.SaveChangesAsync();
        return ToDto(client);
    }

    private static ClientDto ToDto(Client c) => new(
        c.Id, c.FirstName, c.LastName, c.FullName,
        c.Email, c.Phone, c.Nationality,
        c.DocumentType, c.DocumentNumber,
        c.City, c.Country, c.Notes,
        c.Reservations.Count, c.CreatedAt
    );
}
