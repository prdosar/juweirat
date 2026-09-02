using Juweirat.Application.DTOs.Pms;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class DebiteurService(AppDbContext db)
{
    public async Task<List<DebiteurDto>> GetAllAsync()
    {
        var list = await db.Debtors
            .Include(d => d.Folio)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<DebiteurDto?> GetByIdAsync(long id)
    {
        var d = await db.Debtors.Include(d => d.Folio).FirstOrDefaultAsync(x => x.Id == id);
        return d is null ? null : ToDto(d);
    }

    public async Task<(DebiteurDto? dto, string? error)> CreateAsync(CreateDebiteurRequest req)
    {
        var d = new Debtor
        {
            Client  = req.Client,
            Label   = req.Label,
            DueDate = req.DueDate,
            Amount  = req.Amount,
            FolioId = req.FolioId,
        };

        db.Debtors.Add(d);
        await db.SaveChangesAsync();

        var created = await db.Debtors.Include(d => d.Folio).FirstAsync(x => x.Id == d.Id);
        return (ToDto(created), null);
    }

    public async Task<(DebiteurDto? dto, string? error)> UpdateAsync(long id, UpdateDebiteurRequest req)
    {
        var d = await db.Debtors.Include(d => d.Folio).FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return (null, null);

        if (req.Client  is not null) d.Client  = req.Client;
        if (req.Label   is not null) d.Label   = req.Label;
        if (req.DueDate is not null) d.DueDate = req.DueDate.Value;
        if (req.Amount  is not null) d.Amount  = req.Amount.Value;
        if (req.Paid    is not null) d.Paid    = Math.Min(req.Paid.Value, d.Amount);

        await db.SaveChangesAsync();
        return (ToDto(d), null);
    }

    public async Task<(DebiteurDto? dto, string? error)> PayAsync(long id, PayDebiteurRequest req)
    {
        var d = await db.Debtors.Include(d => d.Folio).FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return (null, null);

        d.Paid    = Math.Min(d.Paid + req.Montant, d.Amount);
        d.PayMode = req.PayMode ?? d.PayMode;
        await db.SaveChangesAsync();
        return (ToDto(d), null);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var d = await db.Debtors.FindAsync(id);
        if (d is null) return false;
        db.Debtors.Remove(d);
        await db.SaveChangesAsync();
        return true;
    }

    private static DebiteurDto ToDto(Debtor d) => new(
        d.Id, d.Client, d.Label, d.DueDate,
        d.Amount, d.Paid, Math.Max(0, d.Amount - d.Paid),
        d.FolioId, d.Folio?.Number,
        d.CreatedAt, d.UpdatedAt,
        PayMode: d.PayMode
    );
}
