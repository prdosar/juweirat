using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class FactureService(AppDbContext db)
{
    public async Task<List<Facture>> GetAllAsync()
    {
        return await db.Factures
            .Include(f => f.Folio)
            .OrderByDescending(f => f.Date)
            .ThenByDescending(f => f.Id)
            .ToListAsync();
    }

    public async Task<Facture?> GetByIdAsync(long id)
    {
        return await db.Factures
            .Include(f => f.Folio)
            .FirstOrDefaultAsync(f => f.Id == id);
    }

    public async Task<(Facture? facture, string? error)> EmitFactureAsync(long folioId, string recipient)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == folioId);
        if (folio == null) return (null, "Folio introuvable.");

        // Check if an active facture already exists
        var existingFacture = await db.Factures.FirstOrDefaultAsync(f => f.FolioId == folioId && f.Status == FactureStatus.Emise);
        if (existingFacture != null)
        {
            return (existingFacture, null); // Already emitted
        }

        var config = await db.HotelConfig.FirstOrDefaultAsync(c => c.Id == 1);
        var date = config?.DateHotel ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Calculate nights
        int nights = 0;
        if (folio.Arrival < folio.Departure)
        {
            nights = folio.Departure.DayNumber - folio.Arrival.DayNumber;
        }

        // Calculate totals
        var lines = new List<FactureSnapshotLine>();
        int total = 0;

        if (folio.Heb > 0)
        {
            lines.Add(new FactureSnapshotLine { Label = $"Hébergement — {nights} nuit(s)", Montant = folio.Heb });
            total += folio.Heb;
        }
        
        var pdjTotal = folio.PdjParJour * folio.PdjPrix * nights;
        if (pdjTotal > 0)
        {
            lines.Add(new FactureSnapshotLine { Label = "Petit-déjeuner", Montant = pdjTotal });
            total += pdjTotal;
        }

        if (folio.Debiteur > 0)
        {
            lines.Add(new FactureSnapshotLine { Label = "Débiteur divers", Montant = folio.Debiteur });
            total += folio.Debiteur;
        }

        if (folio.Dependances > 0)
        {
            lines.Add(new FactureSnapshotLine { Label = "Dépendances", Montant = folio.Dependances });
            total += folio.Dependances;
        }

        var nextId = (await db.Factures.MaxAsync(f => (long?)f.Id) ?? 0) + 1;
        
        var facture = new Facture
        {
            Number = $"FAC-{date.Year}-{nextId:D4}",
            FolioId = folioId,
            Date = date,
            Status = FactureStatus.Emise,
            Snapshot = new FactureSnapshot
            {
                Lines = lines,
                Total = total,
                Arrhes = folio.Arrhes,
                Paid = folio.Paid,
                PayMode = folio.PayMode,
                Recipient = recipient,
                Client = folio.Guest,
                Societe = folio.Societe,
                Reservataire = folio.Reservataire,
                UnitLabel = folio.Unit != null ? $"{folio.Unit.RoomNumber} ({folio.Unit.PmsType})" : folio.UnitId.ToString(),
                Arrival = folio.Arrival,
                Departure = folio.Departure,
                Nights = nights,
                Pax = folio.Pax
            }
        };

        db.Factures.Add(facture);
        
        // Link facture to folio
        folio.FactureId = facture.Id;

        await db.SaveChangesAsync();
        return (facture, null);
    }

    public async Task<(Facture? facture, string? error)> CancelFactureAsync(long id)
    {
        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == id);
        if (facture == null) return (null, "Facture introuvable.");

        if (facture.Status == FactureStatus.Annulee)
            return (null, "La facture est déjà annulée.");

        facture.Status = FactureStatus.Annulee;
        
        // Unlink from folio
        var folio = await db.Folios.FirstOrDefaultAsync(f => f.FactureId == id);
        if (folio != null)
        {
            folio.FactureId = null;
        }

        await db.SaveChangesAsync();
        return (facture, null);
    }
}
