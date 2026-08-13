using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class NightAuditService(AppDbContext db)
{
    public async Task<(bool success, string? errorMessage, Cloture? cloture)> ExecuteNightAuditAsync()
    {
        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var config = await db.HotelConfig.FirstOrDefaultAsync(c => c.Id == 1);
            if (config == null) return (false, "Configuration système introuvable (HotelConfig).", null);

            var currentDate = config.DateHotel;

            // 1. Validation : Bloquer si arrivées ou départs non traités
            var pendingArrivals = await db.Folios.CountAsync(f => f.Arrival == currentDate && !f.CheckedIn && f.ResaStatus != FolioResaStatus.Annulee && f.ResaStatus != FolioResaStatus.NoShow);
            var pendingDepartures = await db.Folios.CountAsync(f => f.Departure <= currentDate && !f.Closed && f.ResaStatus != FolioResaStatus.Annulee);

            if (pendingArrivals > 0 || pendingDepartures > 0)
            {
                return (false, $"Impossible de clôturer : {pendingArrivals} arrivée(s) en attente, {pendingDepartures} départ(s) en attente.", null);
            }

            // 2. Génération de la Main Courante (Postings) pour les clients "In House"
            var inHouseFolios = await db.Folios
                .Include(f => f.Unit)
                .Where(f => f.CheckedIn && !f.Closed)
                .ToListAsync();

            var postings = new List<Posting>();
            int caHeb = 0, caPdj = 0;

            foreach (var folio in inHouseFolios)
            {
                // Frais d'hébergement
                if (folio.Rate > 0)
                {
                    postings.Add(new Posting
                    {
                        DateHotel = currentDate,
                        FolioId = folio.Id,
                        UnitId = folio.UnitId,
                        Famille = "Hébergement",
                        Libelle = $"Hébergement nuit du {currentDate:dd/MM/yyyy}",
                        Montant = folio.Rate,
                        Horodatage = DateTime.UtcNow
                    });
                    caHeb += folio.Rate;
                }

                // Frais de petit-déjeuner
                if (folio.PdjParJour > 0 && folio.PdjPrix > 0)
                {
                    var pdjMontant = folio.PdjParJour * folio.PdjPrix;
                    postings.Add(new Posting
                    {
                        DateHotel = currentDate,
                        FolioId = folio.Id,
                        UnitId = folio.UnitId,
                        Famille = "Petit-déjeuner",
                        Libelle = $"PDJ ({folio.PdjParJour} pax) - {currentDate:dd/MM/yyyy}",
                        Montant = pdjMontant,
                        Horodatage = DateTime.UtcNow
                    });
                    caPdj += pdjMontant;
                }
            }

            if (postings.Any())
            {
                db.Postings.AddRange(postings);
            }

            // 3. Archivage des Indicateurs (Cloture)
            var totalRooms = await db.Rooms.CountAsync(r => r.Status != RoomStatus.Maintenance);
            var occRooms = inHouseFolios.Count;
            decimal occPercent = totalRooms > 0 ? Math.Round((decimal)occRooms / totalRooms * 100, 2) : 0;
            var noShows = await db.Folios.CountAsync(f => f.Arrival == currentDate && f.ResaStatus == FolioResaStatus.NoShow);
            var realArrivals = await db.Folios.CountAsync(f => f.Arrival == currentDate && f.CheckedIn);
            var realDeparts = await db.Folios.CountAsync(f => f.CheckoutDate == currentDate && f.Closed);

            var cloture = new Cloture
            {
                DateHotel = currentDate,
                ExecutedAt = DateTime.UtcNow,
                Dispo = totalRooms,
                Occ = occRooms,
                Occupation = occPercent,
                CaHeb = caHeb,
                CaPdj = caPdj,
                CaTotal = caHeb + caPdj,
                Pm = occRooms > 0 ? (caHeb / occRooms) : 0,
                RevPar = totalRooms > 0 ? (caHeb / totalRooms) : 0,
                NbArrivals = realArrivals,
                NbDeparts = realDeparts,
                NbNoShow = noShows,
                NbLignes = postings.Count,
                Montant = caHeb + caPdj
            };

            db.Clotures.Add(cloture);

            // 4. Avancement de la Date Hôtel système
            config.DateHotel = currentDate.AddDays(1);

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null, cloture);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, $"Erreur critique lors de la clôture : {ex.Message}", null);
        }
    }
}
