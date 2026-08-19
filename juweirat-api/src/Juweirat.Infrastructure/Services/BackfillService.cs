using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Rejeu comptable des événements métier existants — utile pour remplir le journal
// avec les paiements/ventes/factures antérieurs au déploiement du module.
// Idempotent : chaque source est identifiée par (SourceType, SourceId), on saute
// tout ce qui a déjà une écriture.
public class BackfillService(AppDbContext db, AccountingService accountingService)
{
    public record BackfillResult(int Payments, int Ventes, int Factures, int NoShow, int Cancellations);

    public async Task<BackfillResult> RunAsync()
    {
        // Set des (SourceType, SourceId) déjà journalisés — pour l'idempotence.
        var already = await db.AccountMovements
            .Where(m => m.SourceType != null && m.SourceId != null)
            .Select(m => new { m.SourceType, m.SourceId })
            .Distinct()
            .ToListAsync();
        var alreadySet = already
            .Select(x => $"{x.SourceType}#{x.SourceId}")
            .ToHashSet();

        int pCount = 0, vCount = 0, fCount = 0, nsCount = 0, caCount = 0;

        // ── Payments ────────────────────────────────────────────────
        var payments = await db.Payments
            .Include(p => p.Reservation)
            .Where(p => p.Status == PaymentStatus.Completed)
            .OrderBy(p => p.PaidAt)
            .ToListAsync();

        foreach (var p in payments)
        {
            var key = $"Payment#{p.Id}";
            if (alreadySet.Contains(key)) continue;

            // Cas retenue No Show / Annulation : re-comptabilise en revenu spécifique + encaissement.
            bool isNoShow       = p.Notes != null && p.Notes.StartsWith("Retenue No Show");
            bool isCancellation = p.Notes != null && p.Notes.StartsWith("Retenue annulation");
            var  resa           = p.Reservation;

            if (isNoShow && resa is not null)
            {
                await accountingService.PostSaleAsync(
                    clientId: resa.ClientId, revenueKind: AccountKind.RevenueNoShow, revenueOwnerRefId: null,
                    amountTtc: p.Amount, tvaExonere: resa.TvaExonere,
                    sourceType: "Payment", sourceId: p.Id,
                    label: $"[Backfill] Retenue No Show · résa {resa.Reference}");
                await accountingService.PostEncaissementAsync(
                    clientId: resa.ClientId, amount: p.Amount,
                    sourceType: "Payment", sourceId: p.Id,
                    label: $"[Backfill] Encaissement retenue No Show · résa {resa.Reference}");
                nsCount++;
            }
            else if (isCancellation && resa is not null)
            {
                await accountingService.PostSaleAsync(
                    clientId: resa.ClientId, revenueKind: AccountKind.RevenueCancellation, revenueOwnerRefId: null,
                    amountTtc: p.Amount, tvaExonere: resa.TvaExonere,
                    sourceType: "Payment", sourceId: p.Id,
                    label: $"[Backfill] Retenue annulation · résa {resa.Reference}");
                await accountingService.PostEncaissementAsync(
                    clientId: resa.ClientId, amount: p.Amount,
                    sourceType: "Payment", sourceId: p.Id,
                    label: $"[Backfill] Encaissement retenue annulation · résa {resa.Reference}");
                caCount++;
            }
            else if (resa is not null)
            {
                await accountingService.PostEncaissementAsync(
                    clientId: resa.ClientId, amount: p.Amount,
                    sourceType: "Payment", sourceId: p.Id,
                    label: $"[Backfill] Paiement résa {resa.Reference} · {p.Method}");
                pCount++;
            }
            alreadySet.Add(key);
        }

        // ── Ventes Directes ─────────────────────────────────────────
        var ventes = await db.VentesDirectes
            .Include(v => v.Prestation)
            .Include(v => v.Folio).ThenInclude(f => f!.Reservation)
            .OrderBy(v => v.CreatedAt)
            .ToListAsync();

        foreach (var v in ventes)
        {
            var key = $"VenteDirecte#{v.Id}";
            if (alreadySet.Contains(key)) continue;

            long? clientId = v.ClientId ?? v.Folio?.Reservation?.ClientId;

            await accountingService.PostSaleAsync(
                clientId:          clientId,
                revenueKind:       AccountKind.Prestation,
                revenueOwnerRefId: v.PrestationId,
                amountTtc:         v.Total,
                tvaExonere:        v.TvaExonere,
                sourceType:        "VenteDirecte",
                sourceId:          v.Id,
                label:             $"[Backfill] {v.Prestation.NameFr} × {v.Quantite}");

            if (v.Mode == "Encaissement")
            {
                await accountingService.PostEncaissementAsync(
                    clientId:   clientId,
                    amount:     v.Total,
                    sourceType: "VenteDirecte",
                    sourceId:   v.Id,
                    label:      $"[Backfill] Encaissement {v.Prestation.NameFr}");
            }
            vCount++;
            alreadySet.Add(key);
        }

        // ── Factures ────────────────────────────────────────────────
        var factures = await db.Factures
            .Include(f => f.Folio).ThenInclude(f => f!.Reservation)
            .Where(f => f.Status == FactureStatus.Emise)
            .OrderBy(f => f.Date)
            .ToListAsync();

        foreach (var f in factures)
        {
            var key = $"Facture#{f.Id}";
            if (alreadySet.Contains(key)) continue;
            if (f.Snapshot is null) continue;
            var clientId = f.Folio?.Reservation?.ClientId;
            if (clientId is null) continue;

            await accountingService.PostSaleAsync(
                clientId:          clientId,
                revenueKind:       AccountKind.RevenueHebergement,
                revenueOwnerRefId: null,
                amountTtc:         f.Snapshot.Total,
                tvaExonere:        f.Folio?.TvaExonere ?? false,
                sourceType:        "Facture",
                sourceId:          f.Id,
                label:             $"[Backfill] Facture {f.Number}");
            fCount++;
            alreadySet.Add(key);
        }

        return new BackfillResult(pCount, vCount, fCount, nsCount, caCount);
    }
}
