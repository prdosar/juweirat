using Juweirat.Application.DTOs.Companies;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
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

    public async Task<CompanyDetailDto?> GetByIdAsync(long id)
    {
        var company = await db.Companies
            .Include(c => c.Clients)
            .Include(c => c.Tarifs).ThenInclude(t => t.Category)
            .FirstOrDefaultAsync(c => c.Id == id);
        return company is null ? null : ToDetailDto(company);
    }

    public async Task<CompanyDto> CreateAsync(CreateCompanyRequest req)
    {
        var company = new Company
        {
            Name           = req.Name,
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
        return ToDto(company);
    }

    public async Task<CompanyDto?> UpdateAsync(long id, UpdateCompanyRequest req)
    {
        var company = await db.Companies.Include(c => c.Clients).FirstOrDefaultAsync(c => c.Id == id);
        if (company is null) return null;

        if (req.Name is not null)           company.Name           = req.Name;
        if (req.ResponsableNom is not null) company.ResponsableNom = req.ResponsableNom;
        if (req.Phone is not null)          company.Phone          = req.Phone;
        if (req.Email is not null)          company.Email          = req.Email;
        if (req.Adresse is not null)        company.Adresse        = req.Adresse;
        if (req.Ville is not null)          company.Ville          = req.Ville;
        if (req.Notes is not null)          company.Notes          = req.Notes;
        if (req.IsActive is not null)       company.IsActive       = req.IsActive.Value;

        await db.SaveChangesAsync();
        return ToDto(company);
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
