using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Prestations;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Application.Notifications;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class ReservationService(AppDbContext db, EmailService emailService, ILogger<ReservationService> logger, AccountingService accountingService, INotificationPublisher notifications)
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
            .Include(r => r.ChangeLogs)
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
            if (overlap)
            {
                // Signal fort : le client (front, MCP, tiers) a envoyé une chambre
                // déjà prise. Signe d'un picker/filter cassé quelque part.
                logger.LogWarning(
                    "[RESA-OVERLAP] Refus création : roomId={RoomId} déjà occupé sur {CheckIn}..{CheckOut} (source={Source}, clientId={ClientId})",
                    req.RoomId.Value, req.CheckInDate, req.CheckOutDate, req.Source, req.ClientId);
                return (null, "Room is already reserved for these dates");
            }
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
                // Prestation flexible → prix saisi obligatoire ; sinon on prend le catalogue.
                decimal prixUnitaire;
                if (prestation.PrixFlexible)
                {
                    if (ligne.PrixUnitaire is null || ligne.PrixUnitaire.Value <= 0)
                        return (null, $"« {prestation.NameFr} » est à prix flexible : le prix unitaire doit être saisi (> 0).");
                    prixUnitaire = ligne.PrixUnitaire.Value;
                }
                else
                {
                    prixUnitaire = prestation.PrixInclus;
                }
                var ligneTotal = prixUnitaire * ligne.Quantite;
                lignesPrestations.Add(new ReservationPrestation
                {
                    PrestationId           = prestation.Id,
                    Quantite               = ligne.Quantite,
                    PrixUnitaireSnapshot   = prixUnitaire,
                    TotalLigne             = ligneTotal,
                });
                totalPrestations += ligneTotal;
            }
        }

        // Remise plafonnée au total (pas de total négatif). Stockée telle quelle,
        // déduite au calcul du TotalPrice.
        var discount = Math.Max(0, Math.Min(req.Discount, (int)Math.Round(totalHeb + totalPrestations)));
        var total    = totalHeb + totalPrestations - discount;

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
            // Snapshots des 3 paliers négociés — permet de recalculer le palier applicable
            // en cas de changement de dates ultérieur, sans refaire le waterfall Company > Category
            // (le tarif reste celui négocié au moment de la création).
            TarifNuitSnapshot     = resolved.TarifNuit,
            TarifN15Snapshot      = resolved.TarifN15,
            TarifN30Snapshot      = resolved.TarifN30,
            TotalPrice            = total,
            Discount              = discount,
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
            .Include(r => r.Client).ThenInclude(c => c!.Company)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == reservation.Id);

        // Notifications par email pour les résas créées depuis le back-office (PMS/wizard).
        // Le site public déclenche déjà ses propres emails via PublicController — on skip donc quand Source == "website".
        if (!isWebBooking && client is not null)
        {
            _ = SendAdminBookingEmailsAsync(client, category, req);
        }

        // Notification Angèle : toute création de résa (peu importe la source)
        // déclenche un push Telegram. Fire-and-forget côté SignalR.
        await notifications.NewReservationAsync(new NewReservationEvent(
            ReservationId:  created.Id,
            Reference:      created.Reference,
            ClientFullName: created.Client.FullName,
            CompanyName:    created.Client.Company?.Name,
            CategoryNameFr: created.Category.NameFr,
            Source:         created.Source,
            CheckInDate:    created.CheckInDate,
            CheckOutDate:   created.CheckOutDate,
            Nights:         created.Nights,
            TotalPrice:     created.TotalPrice,
            Currency:       created.Currency,
            OccurredAt:     DateTime.UtcNow));

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
            .Include(r => r.Folio)
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
                // Propager sur le folio pour ne pas bloquer la clôture — l'arrivée
                // reste sinon comptée comme « non traitée » côté ClotureService.
                if (r.Folio is not null && r.Folio.ResaStatus != FolioStatus.Annulee)
                    r.Folio.ResaStatus = FolioStatus.Annulee;
                break;
        }

        await db.SaveChangesAsync();
        return (ToDto(r), null);
    }

    // Aperçu : calcule ce que sera la retenue No Show sans rien écrire.
    // Utilisé par le popup admin pour afficher montant + mode paiement avant confirmation.
    public async Task<(NoShowPreviewDto? dto, string? error)> PreviewNoShowAsync(long id)
    {
        var r = await db.Reservations
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Folio)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (r is null) return (null, "Réservation introuvable");

        var systemDate = (await db.HotelConfig.FirstOrDefaultAsync())?.DateHotel
                         ?? DateOnly.FromDateTime(DateTime.UtcNow);
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedOut)
            return (null, "Cette réservation ne peut plus être marquée No Show");
        if (r.Folio is { CheckedIn: true, Closed: false })
            return (null, "Le client est physiquement enregistré (folio en cours) — No Show impossible");
        if (r.CheckInDate > systemDate)
            return (null, "Le No Show ne peut être traité qu'à partir du jour d'arrivée");

        var penaltyNights = r.Nights < 15 ? 1 : r.Nights < 30 ? 2 : 4;
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;
        var alreadyBilled = r.Payments.Any(p => p.Notes != null && p.Notes.StartsWith("Retenue No Show"));

        return (new NoShowPreviewDto(
            r.Id, r.Reference, r.Client.FullName,
            penaltyNights, penaltyAmount, r.Currency, alreadyBilled
        ), null);
    }

    public async Task<(NoShowBillingResultDto? dto, string? error)> ProcessNoShowAsync(long id, string? paymentMethod = null)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .Include(r => r.Folio)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");

        // No Show autorisé dès le jour d'arrivée (comparé à la date système du PMS,
        // pas à la date réelle du serveur), pour permettre de traiter les arrivées
        // manquées directement depuis la page Clôture avant de clôturer la journée.
        var systemDate = (await db.HotelConfig.FirstOrDefaultAsync())?.DateHotel
                         ?? DateOnly.FromDateTime(DateTime.UtcNow);
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedOut)
            return (null, "Cette réservation ne peut plus être marquée No Show");
        // Le folio est la source de vérité de la présence physique du client :
        // si le check-in a réellement été effectué (folio.CheckedIn), refuser.
        // Autrement, un statut résa CheckedIn (posé par erreur depuis la fiche résa
        // sans que le client soit venu) ne doit pas bloquer le traitement No Show.
        if (r.Folio is { CheckedIn: true, Closed: false })
            return (null, "Le client est physiquement enregistré (folio en cours) — No Show impossible");
        if (r.CheckInDate > systemDate)
            return (null, "Le No Show ne peut être traité qu'à partir du jour d'arrivée");

        var existingPenalty = r.Payments.FirstOrDefault(p => p.Notes != null && p.Notes.StartsWith("Retenue No Show"));

        // Passage automatique en statut NoShow si nécessaire (toujours, même
        // quand la retenue est déjà appliquée — on répare le folio bloqué
        // dans la liste de clôture).
        if (r.Status != ReservationStatus.NoShow)
            r.Status = ReservationStatus.NoShow;
        if (r.Folio is not null && r.Folio.ResaStatus != FolioStatus.NoShow)
            r.Folio.ResaStatus = FolioStatus.NoShow;

        // Retenue déjà appliquée → on ne recrée PAS de Payment (évite doublon).
        // On sauve juste les statuts corrigés et on renvoie succès avec le
        // paiement existant, pour que le popup admin retire la ligne de la liste.
        if (existingPenalty is not null)
        {
            await db.SaveChangesAsync();
            var reloaded = await db.Reservations
                .Include(r => r.Room).Include(r => r.Category).Include(r => r.Client)
                .Include(r => r.Payments)
                .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
                .FirstAsync(r => r.Id == id);
            var existingNights = r.Nights < 15 ? 1 : r.Nights < 30 ? 2 : 4;
            return (new NoShowBillingResultDto(reloaded.Id, existingNights, existingPenalty.Amount, reloaded.Currency, ToDto(reloaded)), null);
        }

        var penaltyNights = r.Nights < 15 ? 1 : r.Nights < 30 ? 2 : 4;
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;

        // Mode de paiement de la retenue : par défaut Cash, sinon celui fourni.
        var method = PaymentMethod.Cash;
        if (!string.IsNullOrWhiteSpace(paymentMethod)
            && Enum.TryParse<PaymentMethod>(paymentMethod, true, out var parsedMethod))
            method = parsedMethod;

        var penaltyPayment = new Payment
        {
            ReservationId = r.Id,
            Amount        = penaltyAmount,
            Currency      = r.Currency,
            Method        = method,
            Status        = PaymentStatus.Completed,
            PaidAt        = DateTime.UtcNow,
            Notes         = $"Retenue No Show — {penaltyNights} nuit{(penaltyNights > 1 ? "s" : "")}",
        };
        db.Payments.Add(penaltyPayment);
        await db.SaveChangesAsync();

        // Journal comptable — retenue No Show : vente HT+TVA sur compte RevenueNoShow puis encaissement caisse.
        try
        {
            await accountingService.PostSaleAsync(
                clientId:          r.ClientId,
                revenueKind:       AccountKind.RevenueNoShow,
                revenueOwnerRefId: null,
                amountHt:         penaltyAmount,
                tvaExonere:        r.TvaExonere,
                sourceType:        "Payment",
                sourceId:          penaltyPayment.Id,
                label:             $"Retenue No Show · résa {r.Reference} · {penaltyNights} nuit(s)");
            // L'encaissement est déjà écrit par le hook PaymentService — SAUF ici où le
            // Payment a été créé directement en base sans passer par PaymentService.CreateAsync.
            // On complète donc manuellement l'écriture d'encaissement.
            await accountingService.PostEncaissementAsync(
                clientId:   r.ClientId,
                amount:     penaltyAmount,
                sourceType: "Payment",
                sourceId:   penaltyPayment.Id,
                label:      $"Encaissement retenue No Show · résa {r.Reference}");
        }
        catch (Exception ex) { logger.LogError(ex, "Accounting NoShow hook failed for resa {ResaId}", r.Id); }

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
            .Include(r => r.Folio)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");
        if (r.Status is ReservationStatus.Cancelled or ReservationStatus.CheckedOut or ReservationStatus.NoShow)
            return (null, "Cette réservation ne peut plus être annulée");

        var (penaltyNights, deadlineLabel, deadlinePassed) = ComputeCancellationPenalty(r.Nights, r.CheckInDate, DateTime.UtcNow);
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;

        var alreadyBilled = r.Payments.Any(p => p.Notes != null && p.Notes.StartsWith("Retenue annulation"));
        Payment? cancellationPayment = null;
        if (deadlinePassed && penaltyNights > 0 && !alreadyBilled)
        {
            if (string.IsNullOrWhiteSpace(paymentMethod))
                return (null, "Mode de paiement requis pour enregistrer la retenue.");
            if (!Enum.TryParse<PaymentMethod>(paymentMethod, ignoreCase: true, out var method))
                return (null, $"Mode de paiement invalide : « {paymentMethod} ».");

            cancellationPayment = new Payment
            {
                ReservationId = r.Id,
                Amount        = penaltyAmount,
                Currency      = r.Currency,
                Method        = method,
                Status        = PaymentStatus.Completed,
                PaidAt        = DateTime.UtcNow,
                Notes         = $"Retenue annulation — {penaltyNights} nuit{(penaltyNights > 1 ? "s" : "")} ({deadlineLabel})",
            };
            db.Payments.Add(cancellationPayment);
        }

        r.Status             = ReservationStatus.Cancelled;
        r.CancelledAt        = DateTime.UtcNow;
        r.CancellationReason = reason;
        // Propager sur le folio pour ne pas bloquer la clôture — l'arrivée
        // reste sinon comptée comme « non traitée » côté ClotureService.
        if (r.Folio is not null && r.Folio.ResaStatus != FolioStatus.Annulee)
            r.Folio.ResaStatus = FolioStatus.Annulee;

        await db.SaveChangesAsync();

        // Journal comptable — retenue annulation : vente HT+TVA sur compte RevenueCancellation + encaissement.
        if (cancellationPayment is not null)
        {
            try
            {
                await accountingService.PostSaleAsync(
                    clientId:          r.ClientId,
                    revenueKind:       AccountKind.RevenueCancellation,
                    revenueOwnerRefId: null,
                    amountHt:         penaltyAmount,
                    tvaExonere:        r.TvaExonere,
                    sourceType:        "Payment",
                    sourceId:          cancellationPayment.Id,
                    label:             $"Retenue annulation · résa {r.Reference} · {penaltyNights} nuit(s)");
                await accountingService.PostEncaissementAsync(
                    clientId:   r.ClientId,
                    amount:     penaltyAmount,
                    sourceType: "Payment",
                    sourceId:   cancellationPayment.Id,
                    label:      $"Encaissement retenue annulation · résa {r.Reference}");
            }
            catch (Exception ex) { logger.LogError(ex, "Accounting Cancellation hook failed for resa {ResaId}", r.Id); }
        }

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
    /// selon le waterfall : tarif compagnie > tarif catégorie.
    /// (Les prix sur Room ont été supprimés — tout passe par la Category.)
    /// </summary>
    public async Task<TarifPreviewDto?> GetTarifPreviewAsync(long clientId, long categoryId, int nights, long companyId = 0)
    {
        if (nights <= 0) nights = 1;

        var category = await db.RoomCategories.FindAsync(categoryId);
        if (category is null) return null;

        Client? client = null;
        if (clientId > 0)
        {
            client = await db.Clients
                .Include(c => c.Company)
                .FirstOrDefaultAsync(c => c.Id == clientId);
        }
        // Preview pour un client pas encore créé (wizard mode "Créer un client")
        // : on synthétise un Client éphémère avec la compagnie choisie.
        if (client is null && companyId > 0)
        {
            var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == companyId);
            if (company is not null)
            {
                client = new Client { CompanyId = company.Id, Company = company };
            }
        }

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
        // Waterfall tarifaire (tous les prix sont journaliers) :
        //   1) tarif compagnie spécifique à la catégorie (si client rattaché à une compagnie)
        //   2) tarif catégorie (source de vérité par défaut)
        // Les prix sur Room ont été supprimés : tout passe par la Category.
        CompanyTarif? companyTarif = null;
        if (applyCompanyTarif && client?.CompanyId is not null)
        {
            companyTarif = await db.CompanyTarifs.FirstOrDefaultAsync(
                t => t.CompanyId == client.CompanyId && t.CategoryId == category.Id);
        }

        var usingCompany = companyTarif != null &&
                           (companyTarif.TarifNuit > 0 || companyTarif.TarifN15 > 0 || companyTarif.TarifN30 > 0);

        var tarifNuit = companyTarif?.TarifNuit > 0 ? companyTarif.TarifNuit : category.TarifNuit;
        var tarifN15  = companyTarif?.TarifN15  > 0 ? companyTarif.TarifN15  : category.TarifN15;
        var tarifN30  = companyTarif?.TarifN30  > 0 ? companyTarif.TarifN30  : category.TarifN30;

        var source = usingCompany ? "company" : "category";
        _ = room; // Room encore reçue pour signature stable — plus utilisée pour le pricing.
        return (tarifNuit, tarifN15, tarifN30, source);
    }

    public async Task<(ReservationDto? dto, string? error)> UpdateAsync(long id, UpdateReservationRequest req)
    {
        // Motif obligatoire : sert de trace dans reservationChangeLogs. Toute modif doit être justifiée.
        if (string.IsNullOrWhiteSpace(req.Reason))
            return (null, "Le motif de modification est obligatoire.");

        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client).ThenInclude(c => c!.Company)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .Include(r => r.ChangeLogs)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");
        // CheckedIn est autorisé : cas réel = client prolonge son séjour, change de chambre,
        // ajoute une prestation. En revanche annulée / partie / NoShow restent bloqués
        // (statuts terminaux, folio potentiellement facturé).
        if (r.Status is ReservationStatus.Cancelled
                       or ReservationStatus.CheckedOut
                       or ReservationStatus.NoShow)
            return (null, "Cette réservation ne peut plus être modifiée (annulée ou terminée). Utilisez le PMS pour intervenir sur un séjour clos.");

        // Snapshot AVANT modification — servira à construire le diff pour l'entrée changelog.
        var before = new
        {
            r.CategoryId, r.RoomId,
            r.CheckInDate, r.CheckOutDate, r.Nights,
            r.Adults, r.Children,
            r.PricePerNightSnapshot, r.TotalPrice, r.Discount,
            r.GarantieType, r.TvaExonere, r.Source,
            r.SpecialRequests, r.InternalNotes,
            r.TarifNuitSnapshot, r.TarifN15Snapshot, r.TarifN30Snapshot,
        };

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
        var newCheckIn    = req.CheckInDate  ?? r.CheckInDate;
        var newCheckOut   = req.CheckOutDate ?? r.CheckOutDate;
        var newCategoryId = req.CategoryId   ?? r.CategoryId;
        var newRoomId     = req.RoomId       ?? r.RoomId;

        var categoryChanged = newCategoryId != r.CategoryId;
        var datesChanged    = newCheckIn != r.CheckInDate || newCheckOut != r.CheckOutDate;
        var roomChanged     = newRoomId != r.RoomId;
        var stayChanged     = categoryChanged || datesChanged || roomChanged;

        var prestationsChanged = req.Prestations is not null;

        if (stayChanged)
        {
            if (newCheckOut <= newCheckIn)
                return (null, "La date de départ doit être postérieure à la date d'arrivée.");

            var category = categoryChanged
                ? await db.RoomCategories.FindAsync(newCategoryId)
                : r.Category;
            if (category is null) return (null, "Catégorie introuvable.");

            Room? room = null;
            if (newRoomId is not null)
            {
                room = await db.Rooms.Include(rm => rm.Category)
                                     .FirstOrDefaultAsync(rm => rm.Id == newRoomId.Value);
                if (room is null) return (null, "Chambre introuvable.");

                // Check unifié via CheckOverlapAsync (résas + blocks + folios),
                // en s'excluant soi-même pour permettre l'édition inplace.
                if (await CheckOverlapAsync(room.Id, newCheckIn, newCheckOut, excludeReservationId: r.Id))
                {
                    logger.LogWarning(
                        "[RESA-OVERLAP] Refus édition résa {ResaId} ({ResaRef}) : roomId={RoomId} déjà occupé sur {CheckIn}..{CheckOut}",
                        r.Id, r.Reference, room.Id, newCheckIn, newCheckOut);
                    return (null, "Cette chambre est déjà occupée sur la nouvelle période (autre réservation, folio actif ou blocage manuel).");
                }
            }

            var nights = newCheckOut.DayNumber - newCheckIn.DayNumber;

            // Logique tarif : dépend de si la catégorie change.
            //  - Catégorie change → waterfall complet (Company > Category) + repeuple les 3 snapshots.
            //    Un nouveau logement peut avoir un tarif compagnie différent (ou aucun).
            //  - Catégorie identique → on garde les 3 snapshots figés à la création (tarif négocié
            //    intangible) et on ne recalcule QUE le palier applicable selon le nouveau nb de nuits.
            //    Si les dates ne changent pas non plus (juste roomId), snapshot inchangé.
            if (categoryChanged)
            {
                var isWebBooking = string.Equals(r.Source, "website", StringComparison.OrdinalIgnoreCase);
                var resolved = await ResolveTarifAsync(r.Client, category, room, applyCompanyTarif: !isWebBooking);
                var tarif    = TarifEngine.ForStay(resolved.TarifNuit, resolved.TarifN15, resolved.TarifN30, nights);

                r.TarifNuitSnapshot     = resolved.TarifNuit;
                r.TarifN15Snapshot      = resolved.TarifN15;
                r.TarifN30Snapshot      = resolved.TarifN30;
                r.PricePerNightSnapshot = tarif.PerNight;
            }
            else if (datesChanged)
            {
                // Même catégorie : palier recalculé sur les tarifs snapshot d'origine.
                var tarif = TarifEngine.ForStay(r.TarifNuitSnapshot, r.TarifN15Snapshot, r.TarifN30Snapshot, nights);
                r.PricePerNightSnapshot = tarif.PerNight;
            }
            // else (seul le roomId change) → snapshot inchangé.

            r.CheckInDate  = newCheckIn;
            r.CheckOutDate = newCheckOut;
            r.Nights       = nights;
            r.CategoryId   = category.Id;
            r.RoomId       = room?.Id;
            r.Category     = category;
            r.Room         = room;
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
                    decimal prixUnitaire;
                    if (prestation.PrixFlexible)
                    {
                        if (ligne.PrixUnitaire is null || ligne.PrixUnitaire.Value <= 0)
                            return (null, $"« {prestation.NameFr} » est à prix flexible : le prix unitaire doit être saisi (> 0).");
                        prixUnitaire = ligne.PrixUnitaire.Value;
                    }
                    else
                    {
                        prixUnitaire = prestation.PrixInclus;
                    }
                    var totalLigne = prixUnitaire * ligne.Quantite;
                    r.Prestations.Add(new ReservationPrestation
                    {
                        ReservationId        = r.Id,
                        PrestationId         = prestation.Id,
                        Quantite             = ligne.Quantite,
                        PrixUnitaireSnapshot = prixUnitaire,
                        TotalLigne           = totalLigne,
                        Prestation           = prestation,
                    });
                }
            }
        }

        // Remise éditable — null = pas de changement, sinon plafonnée au brut.
        var discountChanged = req.Discount.HasValue && req.Discount.Value != r.Discount;

        // ── Recalcul total et garde-fou paiement ──────────────────────────────
        if (stayChanged || prestationsChanged || discountChanged)
        {
            var totalHeb          = r.PricePerNightSnapshot * r.Nights;
            var totalPrestations  = r.Prestations.Sum(p => p.TotalLigne);
            var brut              = totalHeb + totalPrestations;
            var discount          = req.Discount ?? r.Discount;
            discount              = Math.Max(0, Math.Min(discount, (int)Math.Round(brut)));
            var newTotal          = brut - discount;

            var amountPaid = r.Payments
                .Where(p => p.Status == PaymentStatus.Completed)
                .Sum(p => p.Amount);

            if (newTotal < amountPaid && !req.AcceptRefundImbalance)
            {
                return (null,
                    $"Le nouveau total ({newTotal:0}) est inférieur au montant déjà encaissé ({amountPaid:0}). " +
                    "Confirmez la modification pour créer un avoir client de la différence.");
            }

            r.Discount   = discount;
            r.TotalPrice = newTotal;
        }

        // ── Cascade vers le folio lié ────────────────────────────────────────
        // La réservation est la source de vérité pour les champs partagés :
        // chambre, dates, pax, tarif/nuit, exonération TVA. Le folio est un artefact
        // PMS qui reflète la résa — s'il existe et n'est pas encore archivé (Closed),
        // il DOIT être resynchronisé, sinon RoomService.GetAvailableAsync continue
        // de voir l'ancienne chambre occupée par un folio fantôme.
        // Champs propres au folio (Pdj*, Kwh, Debiteur, Arrhes, Paid, Postings, etc.)
        // ne sont jamais touchés — ce sont des opérations réception.
        var paxChanged = req.Adults.HasValue || req.Children.HasValue;
        var folioNeedsSync = stayChanged || paxChanged || req.TvaExonere.HasValue;
        var linkedFolio = folioNeedsSync
            ? await db.Folios.FirstOrDefaultAsync(f => f.ReservationId == r.Id)
            : null;
        var folioSynced = false;
        if (linkedFolio is not null && !linkedFolio.Closed)
        {
            if (roomChanged && r.RoomId is not null)
            {
                // Refuse plutôt que dupliquer si un autre folio actif occupe déjà
                // la chambre cible sur le nouveau créneau (walk-in, autre résa PMS).
                var conflictingFolio = await db.Folios.AnyAsync(f =>
                    f.Id != linkedFolio.Id &&
                    f.UnitId == r.RoomId.Value &&
                    !f.Closed &&
                    f.ResaStatus != FolioResaStatus.Annulee &&
                    f.ResaStatus != FolioResaStatus.NoShow &&
                    f.Arrival  < r.CheckOutDate &&
                    f.Departure > r.CheckInDate);
                if (conflictingFolio)
                    return (null, "Un autre folio actif occupe déjà la chambre cible sur ce créneau. Libérez-le côté PMS avant de réassigner cette réservation.");

                linkedFolio.UnitId = r.RoomId.Value;
            }
            if (datesChanged)
            {
                linkedFolio.Arrival   = r.CheckInDate;
                linkedFolio.Departure = r.CheckOutDate;
            }
            if (paxChanged)
                linkedFolio.Pax = r.Adults + r.Children;
            if (req.TvaExonere.HasValue)
                linkedFolio.TvaExonere = r.TvaExonere;
            if (stayChanged)
                linkedFolio.Rate = (int)Math.Round(r.PricePerNightSnapshot);

            linkedFolio.UpdatedAt = DateTime.UtcNow;
            folioSynced = true;
        }

        // ── Journal des modifications ────────────────────────────────────────
        // Construction du diff en comparant chaque champ tracé à sa valeur AVANT.
        // Une entrée est toujours créée (même si aucun champ suivi n'a changé) pour
        // conserver la trace du motif — un chgmt de note interne uniquement compte aussi.
        var diff = new Dictionary<string, object>();
        void Track<T>(string field, T oldValue, T newValue) where T : IEquatable<T>
        {
            if (!EqualityComparer<T>.Default.Equals(oldValue, newValue))
                diff[field] = new { from = oldValue, to = newValue };
        }
        void TrackObj(string field, object? oldValue, object? newValue)
        {
            if (!Equals(oldValue, newValue))
                diff[field] = new { from = oldValue, to = newValue };
        }
        Track("categoryId",             before.CategoryId,             r.CategoryId);
        TrackObj("roomId",              before.RoomId,                 r.RoomId);
        Track("checkInDate",            before.CheckInDate,            r.CheckInDate);
        Track("checkOutDate",           before.CheckOutDate,           r.CheckOutDate);
        Track("nights",                 before.Nights,                 r.Nights);
        Track("adults",                 before.Adults,                 r.Adults);
        Track("children",               before.Children,               r.Children);
        Track("pricePerNightSnapshot",  before.PricePerNightSnapshot,  r.PricePerNightSnapshot);
        Track("totalPrice",             before.TotalPrice,             r.TotalPrice);
        Track("discount",               before.Discount,               r.Discount);
        TrackObj("garantieType",        before.GarantieType,           r.GarantieType);
        Track("tvaExonere",             before.TvaExonere,             r.TvaExonere);
        TrackObj("source",              before.Source,                 r.Source);
        TrackObj("specialRequests",     before.SpecialRequests,        r.SpecialRequests);
        TrackObj("internalNotes",       before.InternalNotes,          r.InternalNotes);
        Track("tarifNuitSnapshot",      before.TarifNuitSnapshot,      r.TarifNuitSnapshot);
        Track("tarifN15Snapshot",       before.TarifN15Snapshot,       r.TarifN15Snapshot);
        Track("tarifN30Snapshot",       before.TarifN30Snapshot,       r.TarifN30Snapshot);
        // Prestations : trace juste "changed" (le détail est dans la table reservationPrestations).
        if (prestationsChanged) diff["prestations"] = new { changed = true };
        if (folioSynced) diff["folioSynced"] = new { folioId = linkedFolio!.Id };

        db.ReservationChangeLogs.Add(new ReservationChangeLog
        {
            ReservationId   = r.Id,
            ChangedAt       = DateTime.UtcNow,
            ChangedByUserId = null, // TODO: passer le user courant quand l'auth admin sera branchée sur ce service
            Reason          = req.Reason.Trim(),
            DiffJson        = System.Text.Json.JsonSerializer.Serialize(diff),
        });

        await db.SaveChangesAsync();

        // Re-fetch pour récupérer les nouvelles prestations avec leurs Ids et le mapping DTO complet.
        var updated = await db.Reservations
            .Include(x => x.Room)
            .Include(x => x.Category)
            .Include(x => x.Client)
            .Include(x => x.Payments)
            .Include(x => x.Prestations).ThenInclude(p => p.Prestation)
            .Include(x => x.ChangeLogs)
            .FirstAsync(x => x.Id == r.Id);

        return (ToDto(updated), null);
    }

    // Vérifie si une chambre est déjà prise sur un créneau donné, tous canaux
    // confondus : réservations, blocks manuels ET folios PMS actifs (y compris
    // walk-in sans résa). Si excludeReservationId est fourni, la résa
    // correspondante ET son folio lié sont ignorés (permet l'auto-édition sans
    // se bloquer soi-même).
    private async Task<bool> CheckOverlapAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeReservationId = null)
    {
        var resaOverlap = await db.Reservations.AnyAsync(r =>
            r.RoomId == roomId &&
            r.Status != ReservationStatus.Cancelled &&
            r.Status != ReservationStatus.NoShow &&
            r.CheckInDate  < checkOut &&
            r.CheckOutDate > checkIn &&
            (excludeReservationId == null || r.Id != excludeReservationId.Value));

        if (resaOverlap) return true;

        var blockOverlap = await db.RoomBlocks.AnyAsync(b =>
            b.RoomId == roomId &&
            b.StartDate < checkOut &&
            b.EndDate   > checkIn);

        if (blockOverlap) return true;

        // Folios actifs sur le créneau — quand une résa est liée, elle EST la
        // source de vérité (chambre + dates). Sinon (folio walk-in), on lit les
        // colonnes propres au folio. Cf. [[project-architecture]].
        var folioOverlap = await db.Folios.AnyAsync(f =>
            !f.Closed &&
            f.ResaStatus != FolioResaStatus.Annulee &&
            f.ResaStatus != FolioResaStatus.NoShow &&
            (excludeReservationId == null || f.ReservationId != excludeReservationId.Value) &&
            (f.Reservation != null && f.Reservation.RoomId != null
                ? f.Reservation.RoomId.Value == roomId &&
                  f.Reservation.CheckInDate  < checkOut &&
                  f.Reservation.CheckOutDate > checkIn
                : f.UnitId == roomId &&
                  f.Arrival  < checkOut &&
                  f.Departure > checkIn));

        return folioOverlap;
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

        // Tarifs journaliers lus depuis la Category (source unique de vérité).
        var tarif = TarifEngine.ForStay(r.Category.TarifNuit, r.Category.TarifN15, r.Category.TarifN30, nights);

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
        // TotalPrice inclut déjà la remise déduite → TotalHebergement = TotalPrice + Discount - Prestations
        var totalHeb         = r.TotalPrice + r.Discount - totalPrestations;

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
            r.TvaExonere,
            r.Discount,
            // Historique : trié plus récent d'abord pour un affichage direct côté front.
            r.ChangeLogs
                .OrderByDescending(cl => cl.ChangedAt)
                .Select(cl => new ReservationChangeLogDto(cl.Id, cl.ChangedAt, cl.ChangedByUserId, cl.Reason, cl.DiffJson))
                .ToList()
        );
    }
}
