using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Prestations;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class ReservationService(AppDbContext db, EmailService emailService, ILogger<ReservationService> logger)
{
    public async Task<PagedResult<ReservationDto>> GetPagedAsync(ReservationFilterParams filter)
    {
        var query = db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(r =>
                r.Reference.ToLower().Contains(search) ||
                r.Client.FirstName.ToLower().Contains(search) ||
                r.Client.LastName.ToLower().Contains(search) ||
                (r.Client.Email != null && r.Client.Email.ToLower().Contains(search)) ||
                (r.Client.Phone != null && r.Client.Phone.Contains(search)) ||
                (r.Room != null && r.Room.RoomNumber.ToLower().Contains(search)) ||
                (r.Room != null && r.Room.NameFr.ToLower().Contains(search)) ||
                (r.Category != null && r.Category.NameFr.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<ReservationStatus>(filter.Status, true, out var st))
        {
            query = query.Where(r => r.Status == st);
        }

        if (filter.CategoryId.HasValue)
            query = query.Where(r => r.CategoryId == filter.CategoryId.Value);

        if (filter.RoomId.HasValue)
            query = query.Where(r => r.RoomId == filter.RoomId.Value);

        if (filter.ClientId.HasValue)
            query = query.Where(r => r.ClientId == filter.ClientId.Value);

        if (filter.StartDate.HasValue)
            query = query.Where(r => r.CheckInDate >= filter.StartDate.Value);

        if (filter.EndDate.HasValue)
            query = query.Where(r => r.CheckInDate <= filter.EndDate.Value);

        if (!string.IsNullOrWhiteSpace(filter.Source))
            query = query.Where(r => r.Source != null && r.Source.ToLower() == filter.Source.ToLower());

        if (!string.IsNullOrWhiteSpace(filter.PaymentStatus))
        {
            var payStatus = filter.PaymentStatus.ToLower();
            if (payStatus == "paid")
                query = query.Where(r => r.Payments.Sum(p => p.Amount) >= r.TotalPrice);
            else if (payStatus == "partial")
                query = query.Where(r => r.Payments.Sum(p => p.Amount) > 0 && r.Payments.Sum(p => p.Amount) < r.TotalPrice);
            else if (payStatus == "unpaid")
                query = query.Where(r => !r.Payments.Any() || r.Payments.Sum(p => p.Amount) == 0);
        }

        if (string.IsNullOrWhiteSpace(filter.SortBy))
        {
            query = query.OrderByDescending(r => r.CreatedAt);
        }

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<List<ReservationDto>> GetAllAsync(string? status = null)
    {
        var query = db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .AsQueryable();

        if (status is not null && Enum.TryParse<ReservationStatus>(status, true, out var s))
            query = query.Where(r => r.Status == s);

        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<ReservationDto?> GetByIdAsync(long id)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : ToDto(r);
    }

    public async Task<(ReservationDto? dto, string? error)> CreateAsync(CreateReservationRequest req)
    {
        if (req.CheckOutDate <= req.CheckInDate)
            return (null, "checkOutDate must be after checkInDate");

        Room? room = null;
        if (req.RoomId is not null)
        {
            room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
            if (room is null) return (null, "Room not found");
            if (room.Status != RoomStatus.Available) return (null, "Room is not available");

            var overlap = await CheckOverlapAsync(req.RoomId.Value, req.CheckInDate, req.CheckOutDate);
            if (overlap) return (null, "Room is already reserved for these dates");
        }

        var category = (req.CategoryId > 0 ? await db.RoomCategories.FindAsync(req.CategoryId) : null)
                       ?? (room?.CategoryId != null ? await db.RoomCategories.FindAsync(room.CategoryId.Value) : null)
                       ?? (room != null ? await db.RoomCategories.FirstOrDefaultAsync(c => c.PmsType == room.PmsType) : null)
                       ?? await db.RoomCategories.FirstOrDefaultAsync();

        if (category is null) return (null, "Category not found");

        var nights = req.CheckOutDate.DayNumber - req.CheckInDate.DayNumber;

        if (room is null && req.CategoryId > 0)
        {
            // Auto-assign: find first available room in the category
            var candidateIds = await db.Rooms
                .Where(r => r.CategoryId == req.CategoryId && r.Status == RoomStatus.Available)
                .Select(r => r.Id)
                .ToListAsync();

            foreach (var candidateId in candidateIds)
            {
                if (!await CheckOverlapAsync(candidateId, req.CheckInDate, req.CheckOutDate))
                {
                    room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == candidateId);
                    break;
                }
            }
        }

        // Tarification selon le palier — priorité : tarif compagnie > tarif catégorie > tarif chambre.
        // Exception : une résa venue du site web (source=website) N'APPLIQUE JAMAIS le tarif compagnie
        // même si le client est rattaché à une entreprise. Les compagnies négocient et réservent
        // uniquement via le back-office.
        var client = await db.Clients
            .Include(c => c.Company)
            .FirstOrDefaultAsync(c => c.Id == req.ClientId);
        var isWebBooking = string.Equals(req.Source, "website", StringComparison.OrdinalIgnoreCase);
        var resolved = await ResolveTarifAsync(client, category, room, applyCompanyTarif: !isWebBooking);

        Console.WriteLine(
            $"[TARIF] reservation.create clientId={req.ClientId} clientCompanyId={client?.CompanyId?.ToString() ?? "none"} " +
            $"source={req.Source ?? "n/a"} catId={category.Id} catName={category.NameFr} → tarifSource={resolved.Source} " +
            $"tarifNuit={resolved.TarifNuit} tarifN15={resolved.TarifN15} tarifN30={resolved.TarifN30} nights={nights}");

        var tarifResult   = TarifEngine.ForStay(resolved.TarifNuit, resolved.TarifN15, resolved.TarifN30, nights);
        var totalHeb      = (decimal)tarifResult.PerNight * nights;

        // Résoudre les prestations demandées
        var lignesPrestations = new List<ReservationPrestation>();
        decimal totalPrestations = 0;
        if (req.Prestations is { Count: > 0 })
        {
            var ids = req.Prestations.Select(p => p.PrestationId).Distinct().ToList();
            var catalogue = await db.PrestationsAnnexes
                .Where(p => ids.Contains(p.Id) && p.IsActive)
                .ToDictionaryAsync(p => p.Id);

            foreach (var ligne in req.Prestations)
            {
                if (!catalogue.TryGetValue(ligne.PrestationId, out var prestation)) continue;
                var ligneTotal = prestation.PrixInclus * ligne.Quantite;
                lignesPrestations.Add(new ReservationPrestation
                {
                    PrestationId           = prestation.Id,
                    Quantite               = ligne.Quantite,
                    PrixUnitaireSnapshot   = prestation.PrixInclus,
                    TotalLigne             = ligneTotal,
                });
                totalPrestations += ligneTotal;
            }
        }

        var total = totalHeb + totalPrestations;

        var reservation = new Reservation
        {
            Reference             = await GenerateReferenceAsync(),
            CategoryId            = category.Id,
            RoomId                = room?.Id,
            ClientId              = req.ClientId,
            CheckInDate           = req.CheckInDate,
            CheckOutDate          = req.CheckOutDate,
            Nights                = nights,
            Adults                = req.Adults,
            Children              = req.Children,
            PricePerNightSnapshot = tarifResult.PerNight,
            TotalPrice            = total,
            Currency              = req.Currency,
            Source                = req.Source,
            SpecialRequests       = req.SpecialRequests,
            InternalNotes         = req.InternalNotes,
            GarantieType          = req.GarantieType,
            GarantieMontantCash   = req.GarantieMontantCash,
            CarteNom              = req.CarteNom,
            CarteSuffix           = req.CarteSuffix,
            CarteExpiration       = req.CarteExpiration,
            TvaExonere            = req.TvaExonere,
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        foreach (var ligne in lignesPrestations)
        {
            ligne.ReservationId = reservation.Id;
            db.ReservationPrestations.Add(ligne);
        }
        if (lignesPrestations.Count > 0)
            await db.SaveChangesAsync();

        var created = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == reservation.Id);

        // Notifications par email pour les résas créées depuis le back-office (PMS/wizard).
        // Le site public déclenche déjà ses propres emails via PublicController — on skip donc quand Source == "website".
        if (!isWebBooking && client is not null)
        {
            _ = SendAdminBookingEmailsAsync(client, category, req);
        }

        return (ToDto(created), null);
    }

    private async Task SendAdminBookingEmailsAsync(Client client, RoomCategory category, CreateReservationRequest req)
    {
        try
        {
            var categoryName = category.NameFr ?? "Appartement Résidence Juweirat";
            var guestName    = $"{client.FirstName} {client.LastName}".Trim();

            // 1) Rappel à la réception (contact@juweirat.com)
            var adminSubject = $"[RÉSERVATION RÉCEPTION] {guestName} — {categoryName}";
            var adminBody = EmailTemplateService.BuildBookingAdminNotification(
                client.FirstName, client.LastName,
                client.Email ?? "",
                client.Phone ?? "",
                client.Nationality ?? "",
                categoryName,
                req.CheckInDate, req.CheckOutDate,
                req.Adults, req.Children,
                req.InternalNotes,
                fromAdmin: true
            );
            await emailService.SendEmailAsync("contact@juweirat.com", adminSubject, adminBody, "Réservation Juweirat", client.Email ?? "");

            // 2) Confirmation client si l'email est renseigné sur la fiche
            if (!string.IsNullOrWhiteSpace(client.Email))
            {
                var clientSubject = "Confirmation de votre réservation — Résidence Juweirat";
                var clientBody = EmailTemplateService.BuildBookingClientConfirmation(
                    client.FirstName, client.LastName,
                    categoryName,
                    req.CheckInDate, req.CheckOutDate,
                    req.Adults, req.Children,
                    fromAdmin: true
                );
                await emailService.SendEmailAsync(client.Email, clientSubject, clientBody, "Résidence Juweirat", "contact@juweirat.com");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ReservationService] Failed to send admin-booking emails for client {ClientId}", client.Id);
        }
    }

    public async Task<(ReservationDto? dto, string? error)> UpdateStatusAsync(long id, UpdateReservationStatusRequest req)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Reservation not found");

        if (!Enum.TryParse<ReservationStatus>(req.Status, true, out var newStatus))
            return (null, $"Invalid status: {req.Status}");

        if (newStatus == ReservationStatus.NoShow &&
            r.CheckInDate >= DateOnly.FromDateTime(DateTime.UtcNow))
            return (null, "Le No Show ne peut être marqué qu'après la clôture du jour d'arrivée");

        r.Status = newStatus;
        if (req.InternalNotes is not null) r.InternalNotes = req.InternalNotes;

        switch (newStatus)
        {
            case ReservationStatus.Confirmed:
                r.ConfirmedAt = DateTime.UtcNow;
                if (r.Folio is null)
                    await CreateFolioFromReservationAsync(r);
                break;
            case ReservationStatus.Cancelled:
                r.CancelledAt        = DateTime.UtcNow;
                r.CancellationReason = req.CancellationReason;
                break;
        }

        await db.SaveChangesAsync();
        return (ToDto(r), null);
    }

    public async Task<(NoShowBillingResultDto? dto, string? error)> ProcessNoShowAsync(long id)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");

        // No Show ne peut être traité qu'après la clôture du jour d'arrivée
        // (si arrivée = 18, on traite le 19 ou plus tard).
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedIn or ReservationStatus.CheckedOut)
            return (null, "Cette réservation ne peut plus être marquée No Show");
        if (r.CheckInDate >= today)
            return (null, "Le No Show ne peut être traité qu'après la clôture du jour d'arrivée");

        var alreadyBilled = r.Payments.Any(p => p.Notes != null && p.Notes.StartsWith("Retenue No Show"));
        if (alreadyBilled) return (null, "Une retenue No Show a déjà été appliquée");

        // Passage automatique en statut NoShow si nécessaire
        if (r.Status != ReservationStatus.NoShow)
            r.Status = ReservationStatus.NoShow;

        var penaltyNights = r.Nights < 15 ? 1 : r.Nights < 30 ? 2 : 4;
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;

        db.Payments.Add(new Payment
        {
            ReservationId = r.Id,
            Amount        = penaltyAmount,
            Currency      = r.Currency,
            Method        = PaymentMethod.Cash,
            Status        = PaymentStatus.Completed,
            PaidAt        = DateTime.UtcNow,
            Notes         = $"Retenue No Show — {penaltyNights} nuit{(penaltyNights > 1 ? "s" : "")}",
        });
        await db.SaveChangesAsync();

        var updated = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == id);

        return (new NoShowBillingResultDto(updated.Id, penaltyNights, penaltyAmount, updated.Currency, ToDto(updated)), null);
    }

    /// <summary>
    /// Annule une réservation en appliquant, si nécessaire, une retenue selon la règle métier :
    ///   - Séjour < 15 nuits  : gratuit si annulation avant 18h la veille de l'arrivée, sinon 1 nuitée
    ///   - Séjour 15-29 nuits : gratuit si annulation ≥ 4 jours avant l'arrivée, sinon 2 nuitées
    ///   - Séjour ≥ 30 nuits  : gratuit si annulation ≥ 7 jours avant l'arrivée, sinon 4 nuitées
    /// </summary>
    public async Task<(CancellationBillingResultDto? dto, string? error)> ProcessCancellationAsync(long id, string? reason = null, string? paymentMethod = null)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedOut or ReservationStatus.NoShow)
            return (null, "Cette réservation ne peut plus être annulée");

        var (penaltyNights, deadlineLabel, deadlinePassed) = ComputeCancellationPenalty(r.Nights, r.CheckInDate, DateTime.UtcNow);
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;

        var alreadyBilled = r.Payments.Any(p => p.Notes != null && p.Notes.StartsWith("Retenue annulation"));
        if (deadlinePassed && penaltyNights > 0 && !alreadyBilled)
        {
            if (string.IsNullOrWhiteSpace(paymentMethod))
                return (null, "Mode de paiement requis pour enregistrer la retenue.");
            if (!Enum.TryParse<PaymentMethod>(paymentMethod, ignoreCase: true, out var method))
                return (null, $"Mode de paiement invalide : « {paymentMethod} ».");

            db.Payments.Add(new Payment
            {
                ReservationId = r.Id,
                Amount        = penaltyAmount,
                Currency      = r.Currency,
                Method        = method,
                Status        = PaymentStatus.Completed,
                PaidAt        = DateTime.UtcNow,
                Notes         = $"Retenue annulation — {penaltyNights} nuit{(penaltyNights > 1 ? "s" : "")} ({deadlineLabel})",
            });
        }

        r.Status             = ReservationStatus.Cancelled;
        r.CancelledAt        = DateTime.UtcNow;
        r.CancellationReason = reason;

        await db.SaveChangesAsync();

        var updated = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == id);

        return (new CancellationBillingResultDto(
            updated.Id,
            deadlinePassed ? penaltyNights : 0,
            deadlinePassed ? penaltyAmount : 0,
            updated.Currency,
            deadlineLabel,
            ToDto(updated)
        ), null);
    }

    /// <summary>
    /// Calcule le tier applicable et si la deadline est déjà passée.
    /// Utilisée pour l'affichage préalable (frontend) et pour la facturation effective.
    /// </summary>
    public static (int penaltyNights, string deadlineLabel, bool deadlinePassed) ComputeCancellationPenalty(int nights, DateOnly checkIn, DateTime nowUtc)
    {
        var checkInAt00 = checkIn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        if (nights < 15)
        {
            var deadline = checkInAt00.AddDays(-1).AddHours(18); // 18h la veille de l'arrivée
            return (1, "avant 18h la veille de l'arrivée", nowUtc > deadline);
        }
        if (nights < 30)
        {
            var deadline = checkInAt00.AddDays(-4);              // 4 jours avant
            return (2, "au plus tard 4 jours avant l'arrivée", nowUtc > deadline);
        }
        {
            var deadline = checkInAt00.AddDays(-7);              // 1 semaine avant
            return (4, "au plus tard 1 semaine avant l'arrivée", nowUtc > deadline);
        }
    }

    /// <summary>
    /// Retourne le tarif effectivement applicable pour un client + catégorie donnés
    /// selon le waterfall : tarif compagnie > tarif catégorie > tarif chambre > défaut.
    /// </summary>
    public async Task<TarifPreviewDto?> GetTarifPreviewAsync(long clientId, long categoryId, int nights)
    {
        if (nights <= 0) nights = 1;

        var category = await db.RoomCategories.FindAsync(categoryId);
        if (category is null) return null;

        var client = await db.Clients
            .Include(c => c.Company)
            .FirstOrDefaultAsync(c => c.Id == clientId);

        var resolved = await ResolveTarifAsync(client, category, room: null);
        var tarifResult = TarifEngine.ForStay(resolved.TarifNuit, resolved.TarifN15, resolved.TarifN30, nights);

        return new TarifPreviewDto(
            tarifResult.PerNight,
            resolved.TarifNuit, resolved.TarifN15, resolved.TarifN30,
            tarifResult.Tier.ToString(),
            resolved.Source,
            resolved.Source == "company" ? client?.Company?.Name : null,
            tarifResult.PerNight * nights
        );
    }

    private async Task<(int TarifNuit, int TarifN15, int TarifN30, string Source)> ResolveTarifAsync(Client? client, RoomCategory category, Room? room, bool applyCompanyTarif = true)
    {
        CompanyTarif? companyTarif = null;
        if (applyCompanyTarif && client?.CompanyId is not null)
        {
            companyTarif = await db.CompanyTarifs.FirstOrDefaultAsync(
                t => t.CompanyId == client.CompanyId && t.CategoryId == category.Id);
        }

        var usingCompany = companyTarif != null &&
                           (companyTarif.TarifNuit > 0 || companyTarif.TarifN15 > 0 || companyTarif.TarifN30 > 0);

        var tarifNuit = companyTarif?.TarifNuit > 0 ? companyTarif.TarifNuit
                      : (category.TarifNuit > 0 ? category.TarifNuit : (room != null ? room.TarifNuit : 30000));
        var tarifN15  = companyTarif?.TarifN15 > 0 ? companyTarif.TarifN15
                      : (category.TarifN15 > 0 ? category.TarifN15 : (room != null ? room.TarifN15 : 200000));
        var tarifN30  = companyTarif?.TarifN30 > 0 ? companyTarif.TarifN30
                      : (category.TarifN30 > 0 ? category.TarifN30 : (room != null ? room.TarifN30 : 300000));

        var source = usingCompany ? "company"
                   : (category.TarifNuit > 0 || category.TarifN15 > 0 || category.TarifN30 > 0) ? "category"
                   : (room != null) ? "room"
                   : "default";

        return (tarifNuit, tarifN15, tarifN30, source);
    }

    public async Task<(ReservationDto? dto, string? error)> UpdateAsync(long id, UpdateReservationRequest req)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client).ThenInclude(c => c!.Company)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedIn
                       or ReservationStatus.CheckedOut or ReservationStatus.NoShow)
            return (null, "Cette réservation ne peut plus être modifiée (annulée, en cours ou terminée). Utilisez le PMS pour intervenir sur un séjour en cours.");

        // Champs simples (aucun impact tarifaire)
        if (req.Source is not null)               r.Source              = req.Source;
        if (req.SpecialRequests is not null)      r.SpecialRequests     = req.SpecialRequests;
        if (req.InternalNotes is not null)        r.InternalNotes       = req.InternalNotes;
        if (req.Adults.HasValue)                  r.Adults              = req.Adults.Value;
        if (req.Children.HasValue)                r.Children            = req.Children.Value;
        if (req.GarantieType is not null)         r.GarantieType        = req.GarantieType;
        if (req.GarantieMontantCash.HasValue)     r.GarantieMontantCash = req.GarantieMontantCash;
        if (req.CarteNom is not null)             r.CarteNom            = req.CarteNom;
        if (req.CarteSuffix is not null)          r.CarteSuffix         = req.CarteSuffix;
        if (req.CarteExpiration is not null)      r.CarteExpiration     = req.CarteExpiration;
        if (req.TvaExonere.HasValue)              r.TvaExonere          = req.TvaExonere.Value;

        // ── Champs impactant le tarif : dates, catégorie, chambre ──────────────
        var newCheckIn   = req.CheckInDate  ?? r.CheckInDate;
        var newCheckOut  = req.CheckOutDate ?? r.CheckOutDate;
        var newCategoryId = req.CategoryId  ?? r.CategoryId;
        var newRoomId     = req.RoomId      ?? r.RoomId;

        var stayChanged = newCheckIn   != r.CheckInDate
                       || newCheckOut  != r.CheckOutDate
                       || newCategoryId != r.CategoryId
                       || newRoomId     != r.RoomId;

        var prestationsChanged = req.Prestations is not null;

        if (stayChanged)
        {
            if (newCheckOut <= newCheckIn)
                return (null, "La date de départ doit être postérieure à la date d'arrivée.");

            var category = await db.RoomCategories.FindAsync(newCategoryId);
            if (category is null) return (null, "Catégorie introuvable.");

            Room? room = null;
            if (newRoomId is not null)
            {
                room = await db.Rooms.Include(rm => rm.Category)
                                     .FirstOrDefaultAsync(rm => rm.Id == newRoomId.Value);
                if (room is null) return (null, "Chambre introuvable.");

                var overlap = await db.Reservations.AnyAsync(x =>
                    x.Id != r.Id &&
                    x.RoomId == room.Id &&
                    x.Status != ReservationStatus.Cancelled &&
                    x.Status != ReservationStatus.NoShow &&
                    x.CheckInDate  < newCheckOut &&
                    x.CheckOutDate > newCheckIn);
                if (overlap) return (null, "Cette chambre est déjà réservée pour la nouvelle période.");
            }

            var isWebBooking = string.Equals(r.Source, "website", StringComparison.OrdinalIgnoreCase);
            var resolved = await ResolveTarifAsync(r.Client, category, room, applyCompanyTarif: !isWebBooking);
            var nights   = newCheckOut.DayNumber - newCheckIn.DayNumber;
            var tarif    = TarifEngine.ForStay(resolved.TarifNuit, resolved.TarifN15, resolved.TarifN30, nights);

            r.CheckInDate           = newCheckIn;
            r.CheckOutDate          = newCheckOut;
            r.Nights                = nights;
            r.CategoryId            = category.Id;
            r.RoomId                = room?.Id;
            r.PricePerNightSnapshot = tarif.PerNight;
            r.Category              = category;
            r.Room                  = room;
        }

        // ── Prestations : delete-then-add si liste envoyée ────────────────────
        if (prestationsChanged)
        {
            db.ReservationPrestations.RemoveRange(r.Prestations);
            r.Prestations = [];

            if (req.Prestations!.Count > 0)
            {
                var ids = req.Prestations.Select(p => p.PrestationId).Distinct().ToList();
                var catalogue = await db.PrestationsAnnexes
                    .Where(p => ids.Contains(p.Id) && p.IsActive)
                    .ToDictionaryAsync(p => p.Id);

                foreach (var ligne in req.Prestations)
                {
                    if (!catalogue.TryGetValue(ligne.PrestationId, out var prestation)) continue;
                    var totalLigne = prestation.PrixInclus * ligne.Quantite;
                    r.Prestations.Add(new ReservationPrestation
                    {
                        ReservationId        = r.Id,
                        PrestationId         = prestation.Id,
                        Quantite             = ligne.Quantite,
                        PrixUnitaireSnapshot = prestation.PrixInclus,
                        TotalLigne           = totalLigne,
                        Prestation           = prestation,
                    });
                }
            }
        }

        // ── Recalcul total et garde-fou paiement ──────────────────────────────
        if (stayChanged || prestationsChanged)
        {
            var totalHeb          = r.PricePerNightSnapshot * r.Nights;
            var totalPrestations  = r.Prestations.Sum(p => p.TotalLigne);
            var newTotal          = totalHeb + totalPrestations;

            var amountPaid = r.Payments
                .Where(p => p.Status == PaymentStatus.Completed)
                .Sum(p => p.Amount);

            if (newTotal < amountPaid && !req.AcceptRefundImbalance)
            {
                return (null,
                    $"Le nouveau total ({newTotal:0}) est inférieur au montant déjà encaissé ({amountPaid:0}). " +
                    "Confirmez la modification pour créer un avoir client de la différence.");
            }

            r.TotalPrice = newTotal;
        }

        await db.SaveChangesAsync();

        // Re-fetch pour récupérer les nouvelles prestations avec leurs Ids et le mapping DTO complet.
        var updated = await db.Reservations
            .Include(x => x.Room)
            .Include(x => x.Category)
            .Include(x => x.Client)
            .Include(x => x.Payments)
            .Include(x => x.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(x => x.Id == r.Id);

        return (ToDto(updated), null);
    }

    private async Task<bool> CheckOverlapAsync(long roomId, DateOnly checkIn, DateOnly checkOut)
    {
        var resaOverlap = await db.Reservations.AnyAsync(r =>
            r.RoomId == roomId &&
            r.Status != ReservationStatus.Cancelled &&
            r.Status != ReservationStatus.NoShow &&
            r.CheckInDate  < checkOut &&
            r.CheckOutDate > checkIn);

        if (resaOverlap) return true;

        var blockOverlap = await db.RoomBlocks.AnyAsync(b =>
            b.RoomId == roomId &&
            b.StartDate < checkOut &&
            b.EndDate   > checkIn);

        return blockOverlap;
    }

    private async Task CreateFolioFromReservationAsync(Reservation r)
    {
        var config = await db.HotelConfig.FindAsync(1);
        if (config is null) return;

        var nights = r.CheckOutDate.DayNumber - r.CheckInDate.DayNumber;
        var unit   = r.Room ?? await db.Rooms
            .Where(rm => rm.CategoryId == r.CategoryId && rm.Status == RoomStatus.Available)
            .FirstOrDefaultAsync();

        if (unit is null) return;

        var tarif = TarifEngine.ForStay(unit.TarifNuit, unit.TarifN15, unit.TarifN30, nights);

        config.ResaSeq++;
        var number = $"FL-{config.DateHotel.Year}-{config.ResaSeq:D4}";

        var folio = new Folio
        {
            Number        = number,
            UnitId        = unit.Id,
            Nom           = r.Client.LastName,
            Prenom        = r.Client.FirstName,
            Guest         = r.Client.FullName,
            Segment       = FolioSegment.Direct,
            Pax           = r.Adults,
            Arrival       = r.CheckInDate,
            Departure     = r.CheckOutDate,
            Rate          = tarif.PerNight,
            TarifTier     = tarif.Tier,
            ElecIncluded  = tarif.ElecIncluded,
            ResaStatus    = FolioStatus.Confirmee,
            ReservationId = r.Id,
            Note          = r.SpecialRequests,
            TvaExonere    = r.TvaExonere,
        };

        db.Folios.Add(folio);
    }

    private async Task<string> GenerateReferenceAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await db.Reservations.CountAsync(r => r.CreatedAt.Year == year) + 1;
        return $"JW-{year}-{count:D5}";
    }

    private static ReservationDto ToDto(Reservation r)
    {
        var totalPrestations = r.Prestations.Sum(p => p.TotalLigne);
        var totalHeb         = r.TotalPrice - totalPrestations;

        var prestationsDto = r.Prestations.Select(p => new ReservationPrestationDto(
            p.Id, p.PrestationId,
            p.Prestation.NameFr, p.Prestation.NameEn, p.Prestation.Icon, p.Prestation.Mode,
            p.Quantite, p.PrixUnitaireSnapshot, p.TotalLigne
        )).ToList();

        return new(
            r.Id, r.Reference,
            r.RoomId, r.Room?.RoomNumber, r.Room?.NameFr, r.Room?.NameEn,
            r.CategoryId, r.Category.Slug, r.Category.NameFr, r.Category.NameEn,
            r.ClientId, r.Client.FullName, r.Client.Email, r.Client.Phone,
            r.CheckInDate, r.CheckOutDate, r.Nights, r.Adults, r.Children,
            r.PricePerNightSnapshot, r.TotalPrice, r.Currency,
            r.Status.ToString(), r.Source, r.SpecialRequests, r.InternalNotes,
            r.AmountPaid, r.AmountDue,
            r.ConfirmedAt, r.CancelledAt, r.CreatedAt,
            r.GarantieType, r.GarantieMontantCash, r.CarteNom, r.CarteSuffix, r.CarteExpiration,
            totalHeb, totalPrestations, prestationsDto,
            r.TvaExonere
        );
    }
}
