using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Companies;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class CompanyService(AppDbContext db)
{
    public async Task<List<CompanyDto>> GetAllAsync()
    {
        var list = await db.Companies
            .Include(c => c.Clients)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<PagedResult<CompanyDto>> GetPagedAsync(CompanyFilterParams filter)
    {
        var query = db.Companies
            .Include(c => c.Clients)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                (c.ResponsableNom != null && c.ResponsableNom.ToLower().Contains(search)) ||
                (c.Ville          != null && c.Ville.ToLower().Contains(search)) ||
                (c.Email          != null && c.Email.ToLower().Contains(search)) ||
                (c.Phone          != null && c.Phone.ToLower().Contains(search)));
        }

        if (filter.IsActive.HasValue)
            query = query.Where(c => c.IsActive == filter.IsActive.Value);

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderBy(c => c.Name);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<CompanyDetailDto?> GetByIdAsync(long id)
    {
        var company = await db.Companies
            .Include(c => c.Clients)
            .Include(c => c.Tarifs).ThenInclude(t => t.Category)
            .FirstOrDefaultAsync(c => c.Id == id);
        return company is null ? null : ToDetailDto(company);
    }

    public async Task<(CompanyDto? dto, string? error)> CreateAsync(CreateCompanyRequest req)
    {
        var name = req.Name.Trim();
        var lower = name.ToLower();
        var exists = await db.Companies.AnyAsync(c => c.Name.ToLower() == lower);
        if (exists) return (null, $"Une compagnie nommée « {name} » existe déjà.");

        var company = new Company
        {
            Name           = name,
            ResponsableNom = req.ResponsableNom,
            Phone          = req.Phone,
            Email          = req.Email,
            Adresse        = req.Adresse,
            Ville          = req.Ville,
            Notes          = req.Notes,
        };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        company.Clients = [];
        return (ToDto(company), null);
    }

    public async Task<(CompanyDto? dto, string? error)> UpdateAsync(long id, UpdateCompanyRequest req)
    {
        var company = await db.Companies.Include(c => c.Clients).FirstOrDefaultAsync(c => c.Id == id);
        if (company is null) return (null, null); // controller returns 404 on null dto + null error

        if (req.Name is not null)
        {
            var name = req.Name.Trim();
            var lower = name.ToLower();
            var conflict = await db.Companies.AnyAsync(c => c.Id != id && c.Name.ToLower() == lower);
            if (conflict) return (null, $"Une compagnie nommée « {name} » existe déjà.");
            company.Name = name;
        }
        if (req.ResponsableNom is not null) company.ResponsableNom = req.ResponsableNom;
        if (req.Phone is not null)          company.Phone          = req.Phone;
        if (req.Email is not null)          company.Email          = req.Email;
        if (req.Adresse is not null)        company.Adresse        = req.Adresse;
        if (req.Ville is not null)          company.Ville          = req.Ville;
        if (req.Notes is not null)          company.Notes          = req.Notes;
        if (req.IsActive is not null)       company.IsActive       = req.IsActive.Value;

        await db.SaveChangesAsync();
        return (ToDto(company), null);
    }

    public async Task<(bool success, string? error)> SetTarifAsync(long companyId, SetCompanyTarifRequest req)
    {
        var company = await db.Companies.FindAsync(companyId);
        if (company is null) return (false, "Company not found");

        var category = await db.RoomCategories.FindAsync(req.CategoryId);
        if (category is null) return (false, "Category not found");

        var existing = await db.CompanyTarifs
            .FirstOrDefaultAsync(t => t.CompanyId == companyId && t.CategoryId == req.CategoryId);

        if (existing is null)
        {
            db.CompanyTarifs.Add(new CompanyTarif
            {
                CompanyId  = companyId,
                CategoryId = req.CategoryId,
                TarifNuit  = req.TarifNuit,
                TarifN15   = req.TarifN15,
                TarifN30   = req.TarifN30,
            });
        }
        else
        {
            existing.TarifNuit = req.TarifNuit;
            existing.TarifN15  = req.TarifN15;
            existing.TarifN30  = req.TarifN30;
        }

        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool success, string? error)> AssignClientAsync(long companyId, long clientId)
    {
        var company = await db.Companies.FindAsync(companyId);
        if (company is null) return (false, "Company not found");

        var client = await db.Clients.FindAsync(clientId);
        if (client is null) return (false, "Client not found");

        client.CompanyId = companyId;
        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool success, string? error)> RemoveClientAsync(long companyId, long clientId)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == clientId && c.CompanyId == companyId);
        if (client is null) return (false, "Client not found in this company");

        client.CompanyId = null;
        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<List<CompanyStayDto>> GetStaysAsync(long companyId, DateOnly from, DateOnly to)
    {
        // Séjours réels (occupation confirmée / en cours / passée) qui chevauchent la période demandée.
        var stays = await db.Reservations
            .Include(r => r.Client)
            .Include(r => r.Category)
            .Include(r => r.Room)
            .Where(r => r.Client.CompanyId == companyId)
            .Where(r =>
                r.Status == Juweirat.Domain.Enums.ReservationStatus.Confirmed ||
                r.Status == Juweirat.Domain.Enums.ReservationStatus.CheckedIn ||
                r.Status == Juweirat.Domain.Enums.ReservationStatus.CheckedOut)
            .Where(r => r.CheckInDate <= to && r.CheckOutDate >= from)
            .OrderByDescending(r => r.CheckInDate)
            .ToListAsync();

        return stays.Select(r =>
        {
            var overlapStart = r.CheckInDate  > from ? r.CheckInDate  : from;
            var overlapEnd   = r.CheckOutDate < to   ? r.CheckOutDate : to;
            var nightsInPeriod = Math.Max(0, overlapEnd.DayNumber - overlapStart.DayNumber);

            return new CompanyStayDto(
                r.Id,
                r.Reference,
                r.ClientId,
                r.Client.FullName,
                r.RoomId,
                r.Room?.RoomNumber,
                r.Room?.NameFr,
                r.CategoryId,
                r.Category.NameFr,
                r.CheckInDate,
                r.CheckOutDate,
                r.Nights,
                nightsInPeriod,
                r.Status.ToString()
            );
        }).ToList();
    }

    private static CompanyDto ToDto(Company c) => new(
        c.Id, c.Name, c.ResponsableNom, c.Phone, c.Email,
        c.Adresse, c.Ville, c.Notes, c.IsActive,
        c.Clients.Count, c.CreatedAt
    );

    private static CompanyDetailDto ToDetailDto(Company c) => new(
        c.Id, c.Name, c.ResponsableNom, c.Phone, c.Email,
        c.Adresse, c.Ville, c.Notes, c.IsActive, c.CreatedAt,
        c.Clients.Select(cl => new CompanyClientDto(cl.Id, cl.FullName, cl.Email, cl.Phone)).ToList(),
        c.Tarifs.Select(t => new CompanyTarifDto(
            t.Id, t.CategoryId, t.Category.NameFr, t.Category.Slug,
            t.TarifNuit, t.TarifN15, t.TarifN30
        )).ToList()
    );
}
