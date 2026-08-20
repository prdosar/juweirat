using Juweirat.Application.DTOs.Ventes;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class VenteDirecteService(AppDbContext db, AccountingService accountingService)
{
    public async Task<List<VenteDirecteDto>> GetAllAsync(DateOnly? date = null)
    {
        var q = db.VentesDirectes
            .Include(v => v.Prestation)
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .AsQueryable();

        if (date is not null)
            q = q.Where(v => DateOnly.FromDateTime(v.CreatedAt.ToLocalTime()) == date.Value);

        var list = await q.OrderByDescending(v => v.CreatedAt).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<FolioActifDto?> GetFolioActifAsync(long clientId)
    {
        var resa = await db.Reservations
            .Where(r => r.ClientId == clientId && r.Status == ReservationStatus.CheckedIn)
            .Include(r => r.Folio).ThenInclude(f => f!.Unit)
            .Include(r => r.Room)
            .OrderByDescending(r => r.CheckInDate)
            .FirstOrDefaultAsync();

        if (resa?.Folio is null || resa.Folio.Closed) return null;

        var room = resa.Room ?? resa.Folio.Unit;
        return new FolioActifDto(
            resa.Folio.Id,
            resa.Folio.Number,
            room.RoomNumber,
            resa.Folio.Guest
        );
    }

    public async Task<(VenteDirecteDto? dto, string? error)> CreateAsync(CreateVenteDirecteRequest req)
    {
        var prestation = await db.PrestationsAnnexes.FindAsync(req.PrestationId);
        if (prestation is null || !prestation.IsActive)
            return (null, "Prestation introuvable ou inactive");

        // Prestation flexible → prix obligatoirement saisi ; sinon on utilise le catalogue.
        decimal prixUnitaire;
        if (prestation.PrixFlexible)
        {
            if (req.PrixUnitaire is null || req.PrixUnitaire.Value <= 0)
                return (null, "Cette prestation est à prix flexible : le prix unitaire doit être saisi (> 0).");
            prixUnitaire = req.PrixUnitaire.Value;
        }
        else
        {
            prixUnitaire = prestation.PrixSeule;
        }
        var total = prixUnitaire * req.Quantite;

        Folio? folio = null;
        if (req.Mode == "SurChambre")
        {
            if (req.FolioId is null)
                return (null, "FolioId requis pour le mode SurChambre");

            folio = await db.Folios
                .Include(f => f.Unit)
                .Include(f => f.Reservation)
                .FirstOrDefaultAsync(f => f.Id == req.FolioId.Value);
            if (folio is null)  return (null, "Folio introuvable");
            if (folio.Closed)   return (null, "Ce folio est déjà clôturé");
            if (!folio.CheckedIn) return (null, "Le client n'est pas encore enregistré sur ce folio");

            var config   = await db.HotelConfig.FindAsync(1);
            var dateHotel = config?.DateHotel ?? DateOnly.FromDateTime(DateTime.Today);

            db.Postings.Add(new Posting
            {
                DateHotel  = dateHotel,
                FolioId    = folio.Id,
                UnitId     = folio.UnitId,
                Famille    = "Prestation",
                Libelle    = $"{prestation.NameFr} × {req.Quantite}",
                Montant    = (int)Math.Round(total),
            });
        }

        var vente = new VenteDirecte
        {
            PrestationId         = req.PrestationId,
            ClientId             = req.ClientId,
            ClientNom            = req.ClientNom?.Trim(),
            FolioId              = folio?.Id,
            Quantite             = req.Quantite,
            PrixUnitaireSnapshot = prixUnitaire,
            Total                = total,
            Mode                 = req.Mode,
            PaymentMethod        = req.PaymentMethod,
            Notes                = req.Notes?.Trim(),
            // TVA figée à la vente : SurChambre hérite du folio, sinon pas exonéré.
            TvaExonere           = folio?.TvaExonere ?? false,
        };

        db.VentesDirectes.Add(vente);
        await db.SaveChangesAsync();

        // Journal comptable — vente + éventuel encaissement immédiat.
        // Fire-and-forget non bloquant.
        try
        {
            // Client comptable : le client rattaché à la vente (via ID ou via le folio si SurChambre).
            long? clientForAccounting = vente.ClientId ?? folio?.Reservation?.ClientId;

            await accountingService.PostSaleAsync(
                clientId:          clientForAccounting,
                revenueKind:       AccountKind.Prestation,
                revenueOwnerRefId: vente.PrestationId,
                amountHt:         vente.Total,
                tvaExonere:        vente.TvaExonere,
                sourceType:        "VenteDirecte",
                sourceId:          vente.Id,
                label:             $"{prestation.NameFr} × {vente.Quantite}");

            // Mode=Encaissement → l'argent rentre en caisse immédiatement.
            if (vente.Mode == "Encaissement")
            {
                await accountingService.PostEncaissementAsync(
                    clientId:   clientForAccounting,
                    amount:     vente.Total,
                    sourceType: "VenteDirecte",
                    sourceId:   vente.Id,
                    label:      $"Encaissement {prestation.NameFr} · {vente.PaymentMethod ?? "Espèces"}");
            }
        }
        catch { /* silent */ }

        var created = await db.VentesDirectes
            .Include(v => v.Prestation)
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .FirstAsync(v => v.Id == vente.Id);

        return (ToDto(created), null);
    }

    // Crée plusieurs ventes en une seule opération : validation des items,
    // transaction unique (posting + entités), écritures comptables agrégées
    // (une PostSale par item, un seul PostEncaissement pour le total).
    public async Task<(List<VenteDirecteDto>? dtos, string? error)> CreateBatchAsync(BatchVenteRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return (null, "Le panier est vide.");

        // Charge toutes les prestations en une passe pour valider avant d'écrire.
        var prestationIds = req.Items.Select(i => i.PrestationId).Distinct().ToList();
        var catalogue     = await db.PrestationsAnnexes
            .Where(p => prestationIds.Contains(p.Id) && p.IsActive)
            .ToDictionaryAsync(p => p.Id);

        var lignes = new List<(BatchVenteItem Item, PrestationAnnexe Prestation, decimal PrixUnitaire, decimal Total)>();
        foreach (var item in req.Items)
        {
            if (!catalogue.TryGetValue(item.PrestationId, out var prestation))
                return (null, $"Prestation #{item.PrestationId} introuvable ou inactive.");
            if (item.Quantite <= 0)
                return (null, $"Quantité invalide pour « {prestation.NameFr} ».");

            decimal prixUnitaire;
            if (prestation.PrixFlexible)
            {
                if (item.PrixUnitaire is null || item.PrixUnitaire.Value <= 0)
                    return (null, $"« {prestation.NameFr} » est à prix flexible : le prix unitaire doit être saisi (> 0).");
                prixUnitaire = item.PrixUnitaire.Value;
            }
            else
            {
                prixUnitaire = prestation.PrixSeule;
            }
            lignes.Add((item, prestation, prixUnitaire, prixUnitaire * item.Quantite));
        }

        // Résolution du folio (une seule fois) si SurChambre.
        Folio? folio = null;
        DateOnly dateHotel = default;
        if (req.Mode == "SurChambre")
        {
            if (req.FolioId is null) return (null, "FolioId requis pour le mode SurChambre.");
            folio = await db.Folios
                .Include(f => f.Unit)
                .Include(f => f.Reservation)
                .FirstOrDefaultAsync(f => f.Id == req.FolioId.Value);
            if (folio is null)     return (null, "Folio introuvable.");
            if (folio.Closed)      return (null, "Ce folio est déjà clôturé.");
            if (!folio.CheckedIn)  return (null, "Le client n'est pas encore enregistré sur ce folio.");
            var config = await db.HotelConfig.FindAsync(1);
            dateHotel  = config?.DateHotel ?? DateOnly.FromDateTime(DateTime.Today);
        }

        // Remise en % appliquée à chaque ligne (0..100). Le total de chaque
        // ligne est réduit proportionnellement → conserve le ratio prestation/prestation
        // en compta et évite de créer une écriture "remise" séparée.
        var remisePct = Math.Clamp(req.RemisePercent, 0m, 100m);

        // Écritures en une seule transaction : ventes + postings folio.
        await using var tx = await db.Database.BeginTransactionAsync();
        var createdIds = new List<long>(lignes.Count);
        foreach (var (item, prestation, prixUnitaire, brut) in lignes)
        {
            var totalNet = remisePct > 0
                ? Math.Round(brut * (1m - remisePct / 100m), 0)
                : brut;

            if (folio is not null)
            {
                db.Postings.Add(new Posting
                {
                    DateHotel = dateHotel,
                    FolioId   = folio.Id,
                    UnitId    = folio.UnitId,
                    Famille   = "Prestation",
                    Libelle   = remisePct > 0
                        ? $"{prestation.NameFr} × {item.Quantite} (remise {remisePct:0.##}%)"
                        : $"{prestation.NameFr} × {item.Quantite}",
                    Montant   = (int)Math.Round(totalNet),
                });
            }

            var vente = new VenteDirecte
            {
                PrestationId         = prestation.Id,
                ClientId             = req.ClientId,
                ClientNom            = req.ClientNom?.Trim(),
                FolioId              = folio?.Id,
                Quantite             = item.Quantite,
                PrixUnitaireSnapshot = prixUnitaire,
                RemisePercent        = remisePct,
                Total                = totalNet,
                Mode                 = req.Mode,
                PaymentMethod        = req.PaymentMethod,
                Notes                = req.Notes?.Trim(),
                TvaExonere           = folio?.TvaExonere ?? false,
            };
            db.VentesDirectes.Add(vente);
            await db.SaveChangesAsync();
            createdIds.Add(vente.Id);
        }
        await tx.CommitAsync();

        // Écritures comptables : une PostSale par vente (comptes revenus dédiés
        // par prestation), un seul PostEncaissement agrégé pour le paiement caisse.
        try
        {
            long? clientForAccounting = req.ClientId ?? folio?.Reservation?.ClientId;
            decimal totalEncaisse     = 0;
            var venteEntities = await db.VentesDirectes
                .Where(v => createdIds.Contains(v.Id))
                .Include(v => v.Prestation)
                .ToListAsync();

            foreach (var vente in venteEntities)
            {
                await accountingService.PostSaleAsync(
                    clientId:          clientForAccounting,
                    revenueKind:       AccountKind.Prestation,
                    revenueOwnerRefId: vente.PrestationId,
                    amountHt:         vente.Total,
                    tvaExonere:        vente.TvaExonere,
                    sourceType:        "VenteDirecte",
                    sourceId:          vente.Id,
                    label:             $"{vente.Prestation.NameFr} × {vente.Quantite}");
                totalEncaisse += vente.Total;
            }

            if (req.Mode == "Encaissement" && totalEncaisse > 0 && venteEntities.Count > 0)
            {
                // Une écriture d'encaissement unique pour tout le panier — la caisse
                // voit une seule ligne agrégée au lieu d'une par prestation.
                var firstVente = venteEntities[0];
                await accountingService.PostEncaissementAsync(
                    clientId:   clientForAccounting,
                    amount:     totalEncaisse,
                    sourceType: "VenteDirecte",
                    sourceId:   firstVente.Id,
                    label:      $"Encaissement panier ({venteEntities.Count} prestation{(venteEntities.Count > 1 ? "s" : "")}) · {req.PaymentMethod ?? "Espèces"}");
            }
        }
        catch { /* silent — les ventes sont déjà persistées */ }

        var created = await db.VentesDirectes
            .Where(v => createdIds.Contains(v.Id))
            .Include(v => v.Prestation)
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .OrderBy(v => v.Id)
            .ToListAsync();

        return (created.Select(ToDto).ToList(), null);
    }

    private static VenteDirecteDto ToDto(VenteDirecte v)
    {
        var clientLabel = v.Client?.FullName ?? v.ClientNom;
        return new(
            v.Id,
            v.PrestationId,
            v.Prestation.NameFr,
            v.Prestation.Icon,
            v.ClientId,
            clientLabel,
            v.FolioId,
            v.Folio?.Number,
            v.Folio?.Unit?.RoomNumber,
            v.Quantite,
            v.PrixUnitaireSnapshot,
            v.Total,
            v.Mode,
            v.PaymentMethod,
            v.Notes,
            v.CreatedAt,
            v.TvaExonere,
            v.RemisePercent
        );
    }
}
