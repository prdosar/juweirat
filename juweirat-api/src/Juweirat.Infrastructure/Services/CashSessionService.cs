using Juweirat.Application.DTOs.Accounting;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

// Ouverture / clôture des sessions de caisse par caissier.
// Une seule session ouverte par (register, user) — contrainte unique en DB.
public class CashSessionService(AppDbContext db, AccountingService accountingService)
{
    public async Task<CashSessionDto?> GetCurrentAsync(long userId)
    {
        var session = await db.CashSessions
            .Include(s => s.Register)
            .FirstOrDefaultAsync(s => s.OpenedByUserId == userId && s.Status == CashSessionStatus.Open);
        if (session is null) return null;
        return await ToDtoAsync(session);
    }

    public async Task<CashSessionDto?> GetByIdAsync(long id)
    {
        var session = await db.CashSessions
            .Include(s => s.Register)
            .FirstOrDefaultAsync(s => s.Id == id);
        return session is null ? null : await ToDtoAsync(session);
    }

    public async Task<List<CashSessionDto>> GetHistoryAsync(int limit = 50)
    {
        var sessions = await db.CashSessions
            .Include(s => s.Register)
            .OrderByDescending(s => s.OpenedAt)
            .Take(limit)
            .ToListAsync();

        var dtos = new List<CashSessionDto>(sessions.Count);
        foreach (var s in sessions) dtos.Add(await ToDtoAsync(s));
        return dtos;
    }

    public async Task<(CashSessionDto? dto, string? error)> OpenAsync(long userId, OpenCashSessionRequest req)
    {
        var register = await db.CashRegisters.FirstOrDefaultAsync(r => r.Id == req.RegisterId && r.IsActive);
        if (register is null) return (null, "Caisse introuvable ou désactivée.");

        var alreadyOpen = await db.CashSessions.AnyAsync(s =>
            s.OpenedByUserId == userId && s.RegisterId == req.RegisterId && s.Status == CashSessionStatus.Open);
        if (alreadyOpen) return (null, "Vous avez déjà une session ouverte sur cette caisse.");

        var session = new CashSession
        {
            RegisterId     = register.Id,
            OpenedByUserId = userId,
            OpenedAt       = DateTime.UtcNow,
            OpeningFloat   = req.OpeningFloat,
            Status         = CashSessionStatus.Open,
        };
        db.CashSessions.Add(session);
        await db.SaveChangesAsync();

        // Écriture comptable : fond de caisse — mouvement Expense → CashRegister.
        // Le compte système "Expense" fait office de compte de contre-partie pour
        // les mouvements de trésorerie hors ventes (fond de caisse, sorties diverses).
        if (req.OpeningFloat > 0)
        {
            await accountingService.PostCashInOutAsync(
                registerId: register.Id,
                amount:     req.OpeningFloat,
                direction:  "in",
                label:      "Fond de caisse ouverture",
                sessionId:  session.Id,
                userId:     userId,
                reason:     MovementReason.EntreeCaisse);
        }

        return (await ToDtoAsync(session), null);
    }

    public async Task<(CashSessionDto? dto, string? error)> AddManualMovementAsync(long sessionId, long userId, AddManualMovementRequest req)
    {
        var session = await db.CashSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return (null, "Session introuvable.");
        if (session.Status != CashSessionStatus.Open) return (null, "Session déjà clôturée.");
        if (session.OpenedByUserId != userId) return (null, "Vous ne pouvez opérer que sur votre propre session.");
        if (req.Amount <= 0) return (null, "Le montant doit être positif.");

        var direction = req.Direction?.ToLowerInvariant();
        if (direction != "in" && direction != "out")
            return (null, "Direction invalide. Utilisez \"in\" ou \"out\".");

        var reason = direction == "in" ? MovementReason.EntreeCaisse : MovementReason.SortieCaisse;
        await accountingService.PostCashInOutAsync(
            registerId: session.RegisterId,
            amount:     req.Amount,
            direction:  direction,
            label:      req.Label,
            sessionId:  session.Id,
            userId:     userId,
            reason:     reason);

        return (await GetByIdAsync(sessionId), null);
    }

    public async Task<(CashSessionDto? dto, string? error)> CloseAsync(long sessionId, long userId, CloseCashSessionRequest req)
    {
        var session = await db.CashSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return (null, "Session introuvable.");
        if (session.Status != CashSessionStatus.Open) return (null, "Session déjà clôturée.");
        if (session.OpenedByUserId != userId) return (null, "Vous ne pouvez clôturer que votre propre session.");
        if (req.ClosingCountedTotal < 0) return (null, "Le comptage doit être positif ou nul.");

        session.Status              = CashSessionStatus.Closed;
        session.ClosedAt            = DateTime.UtcNow;
        session.ClosedByUserId      = userId;
        session.ClosingCountedTotal = req.ClosingCountedTotal;
        if (!string.IsNullOrWhiteSpace(req.Notes)) session.Notes = req.Notes.Trim();

        await db.SaveChangesAsync();
        return (await GetByIdAsync(sessionId), null);
    }

    public async Task<CashSessionReportDto?> GetReportAsync(long sessionId)
    {
        var session = await db.CashSessions
            .Include(s => s.Register)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return null;

        var movements = await db.AccountMovements
            .Where(m => m.SessionId == sessionId)
            .ToListAsync();

        var totalEncaisse       = movements.Where(m => m.Reason == MovementReason.Encaissement).Sum(m => m.Amount);
        var totalEntreeManuelle = movements.Where(m => m.Reason == MovementReason.EntreeCaisse).Sum(m => m.Amount);
        var totalDecaisse       = movements.Where(m => m.Reason == MovementReason.SortieCaisse).Sum(m => m.Amount);

        // Théorique : ce qui devrait être dans la caisse selon les mouvements.
        // On part de 0 (l'OpeningFloat est déjà comptabilisé comme EntreeCaisse à l'ouverture).
        var theoretical = totalEncaisse + totalEntreeManuelle - totalDecaisse;
        decimal? ecart = session.ClosingCountedTotal is not null
            ? session.ClosingCountedTotal - theoretical
            : null;

        return new CashSessionReportDto(
            Session:              await ToDtoAsync(session),
            TheoreticalTotal:     theoretical,
            CountedTotal:         session.ClosingCountedTotal,
            Ecart:                ecart,
            TotalEncaisse:        totalEncaisse,
            TotalDecaisse:        totalDecaisse,
            TotalEntreeManuelle:  totalEntreeManuelle,
            MovementsCount:       movements.Count
        );
    }

    // ── Mapping ─────────────────────────────────────────────────────
    private async Task<CashSessionDto> ToDtoAsync(CashSession s)
    {
        var openedBy = await db.Users.Where(u => u.Id == s.OpenedByUserId)
            .Select(u => new { u.FirstName, u.LastName }).FirstOrDefaultAsync();
        string openedByName = openedBy is null ? $"User #{s.OpenedByUserId}" : $"{openedBy.FirstName} {openedBy.LastName}".Trim();

        string? closedByName = null;
        if (s.ClosedByUserId.HasValue)
        {
            var closedBy = await db.Users.Where(u => u.Id == s.ClosedByUserId.Value)
                .Select(u => new { u.FirstName, u.LastName }).FirstOrDefaultAsync();
            closedByName = closedBy is null ? $"User #{s.ClosedByUserId}" : $"{closedBy.FirstName} {closedBy.LastName}".Trim();
        }

        return new CashSessionDto(
            s.Id,
            s.RegisterId, s.Register.Name,
            s.OpenedByUserId, openedByName,
            s.OpenedAt, s.OpeningFloat,
            s.ClosedByUserId, closedByName,
            s.ClosedAt, s.ClosingCountedTotal,
            s.Status.ToString(), s.Notes
        );
    }
}
