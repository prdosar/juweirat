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

        // Bloque uniquement si une résa hors contrat a des dates FUTURES qui chevauchent
        // la période du bail. Les résas historiques (CheckOutDate ≤ aujourd'hui) sont
        // ignorées — elles n'empêchent pas la création rétroactive d'un contrat.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var resaOverlap = await db.Reservations.AnyAsync(r =>
            r.RoomId == req.RoomId
            && r.Status != ReservationStatus.Cancelled
            && r.Status != ReservationStatus.NoShow
            && r.Status != ReservationStatus.CheckedOut
            && r.CompanyContractId == null
            && r.CheckOutDate > today
            && r.CheckInDate  < req.EndDate
            && r.CheckOutDate > req.StartDate);
        if (resaOverlap)
            return (null, $"Une réservation à venir sur la chambre {room.RoomNumber} chevauche la période du contrat.");

        var billingFreq = BillingFrequency.Monthly;
        if (!string.IsNullOrWhiteSpace(req.BillingFrequency)
            && !Enum.TryParse<BillingFrequency>(req.BillingFrequency, ignoreCase: true, out billingFreq))
        {
            return (null, $"Fréquence de facturation invalide : {req.BillingFrequency}.");
        }

        var contract = new CompanyContract
        {
            Reference        = await GenerateReferenceAsync(),
            CompanyId        = req.CompanyId,
            RoomId           = req.RoomId,
            StartDate        = req.StartDate,
            EndDate          = req.EndDate,
            MonthlyRate      = req.MonthlyRate,
            BillingFrequency = billingFreq,
            Status           = ContractStatus.Active,
            TvaExonere       = req.TvaExonere,
            ElecIncluded     = req.ElecIncluded,
            Notes            = req.Notes,
            CreatedByUserId  = userId,
        };

        // Transaction : contrat + client + résa + folio doivent être créés ensemble
        // ou rien du tout. Sans ça, un crash au milieu (ex : HotelConfig manquant)
        // laisserait un contrat orphelin en base.
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.CompanyContracts.Add(contract);
            await db.SaveChangesAsync();

            // Résa "conteneur" + folio placeholder : bloquent visuellement la chambre sur
            // toute la durée du bail (calendrier, disponibilité, Room.Status). Les occupants
            // réels (employés) créent leur propre résa avec CompanyContractId = contract.Id ;
            // CheckOverlapAsync les fait s'ignorer mutuellement.
            await CreatePlaceholderReservationAsync(contract, company, room);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        contract.Company = company;
        contract.Room = room;
        contract.Reservations = [];
        return (ToDto(contract), null);
    }

    // Crée le triptyque Client placeholder / Reservation placeholder / Folio placeholder
    // et met la chambre en "Occupée" si aujourd'hui tombe dans la période du contrat.
    // Le folio reste ouvert (Closed=false) pendant toute la durée : c'est le contrat
    // qui pilote la facturation (ContractInvoice), pas le folio.
    private async Task CreatePlaceholderReservationAsync(CompanyContract contract, Company company, Room room)
    {
        var placeholderClient = new Client
        {
            FirstName = "Contrat",
            LastName  = contract.Reference,
            CompanyId = contract.CompanyId,
            Notes     = $"Client placeholder auto-créé pour le contrat {contract.Reference} — ne représente pas un occupant réel.",
        };
        db.Clients.Add(placeholderClient);
        await db.SaveChangesAsync();

        if (room.CategoryId is null)
            throw new InvalidOperationException($"Chambre {room.RoomNumber} sans catégorie : impossible de créer la résa placeholder du contrat.");

        var nights    = contract.EndDate.DayNumber - contract.StartDate.DayNumber;
        var totalRent = ComputeContractTotalRent(contract);  // somme exacte des ContractInvoice à venir
        var pricePerNight = nights > 0 ? Math.Round((decimal)totalRent / nights, 2) : 0m;

        var reservation = new Reservation
        {
            Reference             = await GenerateReservationReferenceAsync(),
            RoomId                = contract.RoomId,
            CategoryId            = room.CategoryId.Value,
            ClientId              = placeholderClient.Id,
            CompanyContractId     = contract.Id,
            IsContractPlaceholder = true,
            CheckInDate           = contract.StartDate,
            CheckOutDate          = contract.EndDate,
            Nights                = nights,
            Adults                = 1,
            Children              = 0,
            PricePerNightSnapshot = pricePerNight,
            TarifNuitSnapshot     = 0,
            TarifN15Snapshot      = 0,
            TarifN30Snapshot      = 0,
            TotalPrice            = totalRent,
            Discount              = 0,
            Currency              = "XOF",
            Status                = ReservationStatus.Confirmed,
            Source                = "contract",
            InternalNotes         = $"Résa conteneur du contrat {contract.Reference} — loyer {contract.MonthlyRate:N0} F/mois, facturation {contract.BillingFrequency}. Encaissement via les ContractInvoice liées au contrat.",
            TvaExonere            = contract.TvaExonere,
            ConfirmedAt           = DateTime.UtcNow,
        };
        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        var config = await db.HotelConfig.FindAsync(1);
        string folioNumber;
        if (config is not null)
        {
            config.ResaSeq++;
            folioNumber = $"FL-{config.DateHotel.Year}-{config.ResaSeq:D4}";
        }
        else
        {
            var year = DateTime.UtcNow.Year;
            var count = await db.Folios.CountAsync(f => f.CreatedAt.Year == year) + 1;
            folioNumber = $"FL-{year}-{count:D4}";
        }

        var today       = DateOnly.FromDateTime(DateTime.UtcNow);
        var isActiveNow = today >= contract.StartDate && today < contract.EndDate;

        var folio = new Folio
        {
            Number        = folioNumber,
            UnitId        = contract.RoomId,
            ReservationId = reservation.Id,
            Guest         = $"Contrat {contract.Reference}",
            Nom           = contract.Reference,
            Prenom        = "Contrat",
            Societe       = company.Name,
            Segment       = FolioSegment.Societe,
            Pax           = 1,
            Arrival       = contract.StartDate,
            Departure     = contract.EndDate,
            Rate          = 0,
            Heb           = 0,
            TarifTier     = TarifTier.N30Nuits,
            ElecIncluded  = contract.ElecIncluded,
            TvaExonere    = contract.TvaExonere,
            ResaStatus    = FolioResaStatus.Confirmee,
            CheckedIn     = isActiveNow,
            CheckedInAt   = isActiveNow ? DateTime.UtcNow : null,
            Closed        = false,
            Note          = "Folio conteneur du contrat compagnie. Facturation via ContractInvoice — ne pas clôturer manuellement.",
        };
        db.Folios.Add(folio);

        if (isActiveNow)
            room.Status = RoomStatus.Occupied;

        await db.SaveChangesAsync();
    }

    // Somme HT de tous les ContractInvoice qui seront émis sur la durée du contrat.
    // Reproduit à l'identique la logique de ContractInvoiceService.GenerateAsync
    // (période naturelle + prorata sur la dernière si tronquée) pour garantir que
    // Reservation.TotalPrice = Σ ContractInvoice.TotalHt émises à terme.
    private static decimal ComputeContractTotalRent(CompanyContract c)
    {
        var monthsPerPeriod = c.BillingFrequency.MonthsPerPeriod();
        var total       = 0m;
        var periodStart = c.StartDate;
        while (periodStart < c.EndDate)
        {
            var naturalEnd   = periodStart.AddMonths(monthsPerPeriod);
            var effectiveEnd = naturalEnd < c.EndDate ? naturalEnd : c.EndDate;
            var activeDays   = effectiveEnd.DayNumber - periodStart.DayNumber;
            var fullDays     = naturalEnd.DayNumber - periodStart.DayNumber;
            if (activeDays <= 0) break;

            var periodHt = (decimal)c.MonthlyRate * monthsPerPeriod;
            var proratedHt = activeDays == fullDays
                ? periodHt
                : Math.Round(periodHt * activeDays / fullDays);
            total += proratedHt;
            periodStart = naturalEnd;
        }
        return total;
    }

    // Réf JW-YYYY-NNNNN alignée sur ReservationService.GenerateReferenceAsync.
    private async Task<string> GenerateReservationReferenceAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await db.Reservations.CountAsync(r => r.CreatedAt.Year == year) + 1;
        return $"JW-{year}-{count:D5}";
    }

    // Marque le placeholder (résa + folio) comme annulé/fermé quand le contrat se termine.
    // Libère la chambre si aucun autre folio actif ne la garde en Occupée.
    private async Task TerminatePlaceholderAsync(long contractId, bool cancel)
    {
        var placeholder = await db.Reservations
            .Include(r => r.Folio)
            .FirstOrDefaultAsync(r => r.CompanyContractId == contractId && r.IsContractPlaceholder);
        if (placeholder is null) return;

        placeholder.Status = cancel ? ReservationStatus.Cancelled : ReservationStatus.CheckedOut;
        placeholder.CancelledAt = cancel ? DateTime.UtcNow : placeholder.CancelledAt;

        if (placeholder.Folio is not null)
        {
            placeholder.Folio.ResaStatus   = cancel ? FolioResaStatus.Annulee : FolioResaStatus.Confirmee;
            placeholder.Folio.Closed       = true;
            placeholder.Folio.CheckoutDate = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        // Libère la chambre s'il n'y a plus d'autre folio ouvert dessus.
        if (placeholder.RoomId is not null)
        {
            var stillOccupied = await db.Folios.AnyAsync(f =>
                f.UnitId == placeholder.RoomId.Value
                && !f.Closed
                && f.CheckedIn
                && f.Id != (placeholder.Folio != null ? placeholder.Folio.Id : 0L));
            if (!stillOccupied)
            {
                var room = await db.Rooms.FindAsync(placeholder.RoomId.Value);
                if (room is not null && room.Status == RoomStatus.Occupied)
                    room.Status = RoomStatus.Available;
            }
        }

        await db.SaveChangesAsync();
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

            // Si on raccourcit le contrat, vérifier qu'aucune résa d'occupant réel n'en dépasse.
            // (La résa placeholder est ignorée : on la raccourcira via TerminatePlaceholderAsync.)
            var overrunning = contract.Reservations.Any(r =>
                !r.IsContractPlaceholder
                && r.Status != ReservationStatus.Cancelled
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
            !r.IsContractPlaceholder
            && r.Status != ReservationStatus.Cancelled
            && r.CheckOutDate > effectiveEnd);
        if (overrunning)
            return (false, "Impossible de terminer le contrat : des résas d'occupants dépassent la date de fin.");

        contract.EndDate = effectiveEnd;
        contract.Status  = ContractStatus.Ended;
        await db.SaveChangesAsync();

        await TerminatePlaceholderAsync(contract.Id, cancel: false);
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

        // Le placeholder n'a pas de "vrai" check-in : on l'ignore pour ce garde-fou.
        var hasCheckedIn = contract.Reservations.Any(r =>
            !r.IsContractPlaceholder
            && (r.Status == ReservationStatus.CheckedIn || r.Status == ReservationStatus.CheckedOut));
        if (hasCheckedIn)
            return (false, "Impossible d'annuler un contrat qui a déjà eu des occupants enregistrés — utiliser 'Terminer' à la place.");

        contract.Status = ContractStatus.Cancelled;
        await db.SaveChangesAsync();

        await TerminatePlaceholderAsync(contract.Id, cancel: true);
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
        c.BillingFrequency.ToString(),
        c.Status.ToString(), c.TvaExonere, c.ElecIncluded, c.Notes,
        c.Reservations.Count(r => !r.IsContractPlaceholder && r.Status != ReservationStatus.Cancelled),
        c.CreatedAt
    );

    private static CompanyContractDetailDto ToDetailDto(CompanyContract c) => new(
        c.Id, c.Reference,
        c.CompanyId, c.Company.Name,
        c.RoomId, c.Room.RoomNumber, c.Room.NameFr,
        c.StartDate, c.EndDate, c.MonthlyRate,
        c.BillingFrequency.ToString(),
        c.Status.ToString(), c.TvaExonere, c.ElecIncluded, c.Notes,
        c.CreatedAt,
        c.Reservations
         .Where(r => !r.IsContractPlaceholder)
         .OrderBy(r => r.CheckInDate)
         .Select(r => new ContractOccupantDto(
             r.Id, r.Reference,
             r.ClientId, r.Client.FullName,
             r.CheckInDate, r.CheckOutDate, r.Nights,
             r.Status.ToString()))
         .ToList()
    );
}
