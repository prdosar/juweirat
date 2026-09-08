using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.CompanyContracts;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class CompanyContractService(AppDbContext db)
{
    public async Task<PagedResult<CompanyContractDto>> GetPagedAsync(CompanyContractFilterParams filter)
    {
        var query = db.CompanyContracts
            .Include(c => c.Company)
            .Include(c => c.Room)
            .Include(c => c.Reservations)
            .AsQueryable();

        if (filter.CompanyId.HasValue)
            query = query.Where(c => c.CompanyId == filter.CompanyId.Value);

        if (filter.RoomId.HasValue)
            query = query.Where(c => c.RoomId == filter.RoomId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Status)
            && Enum.TryParse<ContractStatus>(filter.Status, ignoreCase: true, out var status))
            query = query.Where(c => c.Status == status);

        if (filter.ActiveOn == true)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query = query.Where(c => c.Status == ContractStatus.Active
                                     && c.StartDate <= today && today < c.EndDate);
        }

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderByDescending(c => c.StartDate);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<CompanyContractDetailDto?> GetByIdAsync(long id)
    {
        var contract = await db.CompanyContracts
            .Include(c => c.Company)
            .Include(c => c.Room)
            .Include(c => c.Reservations).ThenInclude(r => r.Client)
            .FirstOrDefaultAsync(c => c.Id == id);
        return contract is null ? null : ToDetailDto(contract);
    }

    public async Task<(CompanyContractDto? dto, string? error)> CreateAsync(
        CreateCompanyContractRequest req, long? userId)
    {
        if (req.EndDate <= req.StartDate)
            return (null, "La date de fin doit être postérieure à la date de début.");

        var company = await db.Companies.FindAsync(req.CompanyId);
        if (company is null) return (null, "Compagnie introuvable.");

        var room = await db.Rooms.FindAsync(req.RoomId);
        if (room is null) return (null, "Chambre introuvable.");

        // Overlap check : une chambre ne peut avoir 2 contrats actifs qui se chevauchent.
        // [S1, E1[ chevauche [S2, E2[ ssi S1 < E2 && S2 < E1.
        var overlap = await db.CompanyContracts.AnyAsync(c =>
            c.RoomId == req.RoomId
            && c.Status == ContractStatus.Active
            && req.StartDate < c.EndDate
            && c.StartDate < req.EndDate);
        if (overlap)
            return (null, $"La chambre {room.RoomNumber} a déjà un contrat actif sur cette période.");

        var contract = new CompanyContract
        {
            Reference       = await GenerateReferenceAsync(),
            CompanyId       = req.CompanyId,
            RoomId          = req.RoomId,
            StartDate       = req.StartDate,
            EndDate         = req.EndDate,
            MonthlyRate     = req.MonthlyRate,
            Status          = ContractStatus.Active,
            TvaExonere      = req.TvaExonere,
            ElecIncluded    = req.ElecIncluded,
            Notes           = req.Notes,
            CreatedByUserId = userId,
        };
        db.CompanyContracts.Add(contract);
        await db.SaveChangesAsync();

        contract.Company = company;
        contract.Room = room;
        contract.Reservations = [];
        return (ToDto(contract), null);
    }

    public async Task<(CompanyContractDto? dto, string? error)> UpdateAsync(
        long id, UpdateCompanyContractRequest req)
    {
        var contract = await db.CompanyContracts
            .Include(c => c.Company)
            .Include(c => c.Room)
            .Include(c => c.Reservations)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return (null, null);

        if (contract.Status != ContractStatus.Active)
            return (null, "Seul un contrat actif peut être modifié.");

        if (req.EndDate is not null)
        {
            if (req.EndDate.Value <= contract.StartDate)
                return (null, "La date de fin doit être postérieure à la date de début.");

            // Si on raccourcit le contrat, vérifier qu'aucune résa d'occupant n'en dépasse.
            var overrunning = contract.Reservations.Any(r =>
                r.Status != ReservationStatus.Cancelled
                && r.CheckOutDate > req.EndDate.Value);
            if (overrunning)
                return (null, "Impossible de réduire le contrat : des résas d'occupants dépassent la nouvelle date de fin.");

            // Overlap check avec d'autres contrats actifs sur la nouvelle période.
            var conflict = await db.CompanyContracts.AnyAsync(c =>
                c.Id != id
                && c.RoomId == contract.RoomId
                && c.Status == ContractStatus.Active
                && contract.StartDate < c.EndDate
                && c.StartDate < req.EndDate.Value);
            if (conflict)
                return (null, "Un autre contrat actif chevauche la nouvelle période.");

            contract.EndDate = req.EndDate.Value;
        }

        if (req.MonthlyRate  is not null) contract.MonthlyRate  = req.MonthlyRate.Value;
        if (req.TvaExonere   is not null) contract.TvaExonere   = req.TvaExonere.Value;
        if (req.ElecIncluded is not null) contract.ElecIncluded = req.ElecIncluded.Value;
        if (req.Notes        is not null) contract.Notes        = req.Notes;

        await db.SaveChangesAsync();
        return (ToDto(contract), null);
    }

    public async Task<(bool success, string? error)> EndAsync(long id, DateOnly? endedOn)
    {
        var contract = await db.CompanyContracts
            .Include(c => c.Reservations)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return (false, "Contrat introuvable.");
        if (contract.Status != ContractStatus.Active)
            return (false, "Seul un contrat actif peut être terminé.");

        var effectiveEnd = endedOn ?? DateOnly.FromDateTime(DateTime.UtcNow);
        if (effectiveEnd <= contract.StartDate)
            return (false, "La date de fin doit être postérieure au début du contrat.");

        var overrunning = contract.Reservations.Any(r =>
            r.Status != ReservationStatus.Cancelled
            && r.CheckOutDate > effectiveEnd);
        if (overrunning)
            return (false, "Impossible de terminer le contrat : des résas d'occupants dépassent la date de fin.");

        contract.EndDate = effectiveEnd;
        contract.Status  = ContractStatus.Ended;
        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool success, string? error)> CancelAsync(long id)
    {
        var contract = await db.CompanyContracts
            .Include(c => c.Reservations)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return (false, "Contrat introuvable.");
        if (contract.Status == ContractStatus.Cancelled)
            return (false, "Contrat déjà annulé.");

        var hasCheckedIn = contract.Reservations.Any(r =>
            r.Status == ReservationStatus.CheckedIn || r.Status == ReservationStatus.CheckedOut);
        if (hasCheckedIn)
            return (false, "Impossible d'annuler un contrat qui a déjà eu des occupants enregistrés — utiliser 'Terminer' à la place.");

        contract.Status = ContractStatus.Cancelled;
        await db.SaveChangesAsync();
        return (true, null);
    }

    // Utilisé par ReservationService (overlap check) et RoomService (badge chambre).
    // Retourne le contrat actif couvrant la période demandée sur la chambre, ou null.
    public async Task<CompanyContract?> GetActiveContractCoveringAsync(
        long roomId, DateOnly from, DateOnly to)
    {
        return await db.CompanyContracts
            .Include(c => c.Company)
            .FirstOrDefaultAsync(c =>
                c.RoomId == roomId
                && c.Status == ContractStatus.Active
                && c.StartDate <= from
                && to <= c.EndDate);
    }

    private async Task<string> GenerateReferenceAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await db.CompanyContracts.CountAsync(c => c.CreatedAt.Year == year) + 1;
        return $"CT-{year}-{count:D4}";
    }

    private static CompanyContractDto ToDto(CompanyContract c) => new(
        c.Id, c.Reference,
        c.CompanyId, c.Company.Name,
        c.RoomId, c.Room.RoomNumber, c.Room.NameFr,
        c.StartDate, c.EndDate, c.MonthlyRate,
        c.Status.ToString(), c.TvaExonere, c.ElecIncluded, c.Notes,
        c.Reservations.Count(r => r.Status != ReservationStatus.Cancelled),
        c.CreatedAt
    );

    private static CompanyContractDetailDto ToDetailDto(CompanyContract c) => new(
        c.Id, c.Reference,
        c.CompanyId, c.Company.Name,
        c.RoomId, c.Room.RoomNumber, c.Room.NameFr,
        c.StartDate, c.EndDate, c.MonthlyRate,
        c.Status.ToString(), c.TvaExonere, c.ElecIncluded, c.Notes,
        c.CreatedAt,
        c.Reservations
         .OrderBy(r => r.CheckInDate)
         .Select(r => new ContractOccupantDto(
             r.Id, r.Reference,
             r.ClientId, r.Client.FullName,
             r.CheckInDate, r.CheckOutDate, r.Nights,
             r.Status.ToString()))
         .ToList()
    );
}
