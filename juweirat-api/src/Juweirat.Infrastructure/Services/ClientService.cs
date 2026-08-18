using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Clients;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class ClientService(AppDbContext db)
{
    public async Task<PagedResult<ClientDto>> GetPagedAsync(ClientFilterParams filter)
    {
        var query = db.Clients
            .Include(c => c.Reservations)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(c =>
                c.FirstName.ToLower().Contains(search) ||
                c.LastName.ToLower().Contains(search)  ||
                (c.Email != null && c.Email.ToLower().Contains(search)) ||
                (c.Phone != null && c.Phone.Contains(search)) ||
                (c.DocumentNumber != null && c.DocumentNumber.ToLower().Contains(search)) ||
                (c.City != null && c.City.ToLower().Contains(search)) ||
                (c.Country != null && c.Country.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Nationality))
            query = query.Where(c => c.Nationality == filter.Nationality);

        if (!string.IsNullOrWhiteSpace(filter.DocumentType))
            query = query.Where(c => c.DocumentType == filter.DocumentType);

        if (!string.IsNullOrWhiteSpace(filter.City))
            query = query.Where(c => c.City != null && c.City.ToLower().Contains(filter.City.ToLower()));

        if (!string.IsNullOrWhiteSpace(filter.Country))
            query = query.Where(c => c.Country != null && c.Country.ToLower().Contains(filter.Country.ToLower()));

        if (filter.HasReservations.HasValue)
        {
            query = filter.HasReservations.Value
                ? query.Where(c => c.Reservations.Any())
                : query.Where(c => !c.Reservations.Any());
        }

        if (string.IsNullOrWhiteSpace(filter.SortBy))
        {
            query = query.OrderByDescending(c => c.CreatedAt);
        }

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<List<ClientDto>> GetAllAsync(string? search = null)
    {
        var query = db.Clients
            .Include(c => c.Reservations)
            .Include(c => c.Company)
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
            .Include(c => c.Company)
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
            CompanyId      = req.CompanyId,
        };

        db.Clients.Add(client);
        await db.SaveChangesAsync();
        return (ToDto(client), null);
    }

    public async Task<ClientDto?> UpdateAsync(long id, UpdateClientRequest req)
    {
        var client = await db.Clients
            .Include(c => c.Reservations)
            .Include(c => c.Company)
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
        if (req.CompanyId is not null)      client.CompanyId      = req.CompanyId == 0 ? null : req.CompanyId;

        await db.SaveChangesAsync();
        return ToDto(client);
    }

    private static ClientDto ToDto(Client c) => new(
        c.Id, c.FirstName, c.LastName, c.FullName,
        c.Email, c.Phone, c.Nationality,
        c.DocumentType, c.DocumentNumber,
        c.City, c.Country, c.Notes,
        c.Reservations.Count, c.CreatedAt,
        c.CompanyId, c.Company?.Name
    );
}
