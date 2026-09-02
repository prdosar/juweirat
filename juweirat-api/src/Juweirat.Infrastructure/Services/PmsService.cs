using Juweirat.Application.DTOs.Pms;
using Juweirat.Application.Notifications;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class PmsService(AppDbContext db, AccountingService accountingService, INotificationPublisher notifications)
{
    // Mappe le PayMode texte (ex. "Espèces", "Mobile Money (TMoney) [TX-9021]")
    // vers l'enum PaymentMethod. Le libellé complet est conservé dans Notes.
    private static PaymentMethod ParsePaymentMethod(string? payMode)
    {
        if (string.IsNullOrWhiteSpace(payMode)) return PaymentMethod.Cash;
        var s = payMode.ToLowerInvariant();
        if (s.Contains("mobile") || s.Contains("tmoney") || s.Contains("flooz")) return PaymentMethod.MobileMoney;
        if (s.Contains("carte") || s.Contains("card"))                            return PaymentMethod.CreditCard;
        if (s.Contains("virement") || s.Contains("transfer"))                    return PaymentMethod.BankTransfer;
        return PaymentMethod.Cash; // Espèces, chèque et autres → Cash + libellé dans Notes
    }

    // ── HotelConfig ──────────────────────────────────────────────────────────

    public async Task<HotelConfigDto?> GetConfigAsync()
    {
        var config = await db.HotelConfig.FindAsync(1);
        return config is null ? null : ToConfigDto(config);
    }

    public async Task<HotelConfigDto?> UpdateConfigAsync(UpdateHotelConfigRequest req)
    {
        var config = await db.HotelConfig.FindAsync(1);
        if (config is null) return null;

        if (req.BuildingName is not null)    config.BuildingName     = req.BuildingName;
        if (req.OwnerName is not null)       config.OwnerName        = req.OwnerName;
        if (req.City is not null)            config.City             = req.City;
        if (req.CurrencyCode is not null)    config.CurrencyCode     = req.CurrencyCode;
        if (req.CurrencyDecimals is not null) config.CurrencyDecimals = req.CurrencyDecimals.Value;
        if (req.DateHotel is not null)       config.DateHotel        = req.DateHotel.Value;

        await db.SaveChangesAsync();
        return ToConfigDto(config);
    }

    // ── Units ────────────────────────────────────────────────────────────────

    public async Task<List<UnitDto>> GetUnitsAsync()
    {
        var rooms = await db.Rooms
            .Include(r => r.Category)
            .OrderBy(r => r.Floor).ThenBy(r => r.PmsRoomNo ?? r.RoomNumber)
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        // La gouvernante voit l'unité effective : quand une résa est liée, la chambre
        // qui est réellement occupée est r.RoomId (source de vérité), pas f.UnitId
        // qui peut avoir drifted. Le nom/société aussi viennent de la résa liée
        // (Client + Company), fallback folio.Guest/Societe pour les walk-in.
        // Cf. [[project-architecture]].
        var activeFoliosToday = await db.Folios
            .Where(f =>
                !f.Closed &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                (f.Reservation != null
                    ? f.Reservation.CheckInDate <= today && f.Reservation.CheckOutDate > today
                    : f.Arrival <= today && f.Departure > today))
            .Select(f => new
            {
                EffectiveUnitId = f.Reservation != null && f.Reservation.RoomId != null
                    ? f.Reservation.RoomId.Value
                    : f.UnitId,
                f.Number,
                f.CreatedAt,
                // Nom : résa (Client.FirstName + LastName) si liée, sinon folio.Guest.
                ResaFirstName = f.Reservation != null ? f.Reservation.Client.FirstName : null,
                ResaLastName  = f.Reservation != null ? f.Reservation.Client.LastName  : null,
                FolioGuest    = f.Guest,
                // Société : résa.Client.Company.Name si liée, sinon folio.Societe.
                ResaCompany   = f.Reservation != null && f.Reservation.Client.Company != null
                                    ? f.Reservation.Client.Company.Name
                                    : null,
                FolioSociete  = f.Societe,
            })
            .ToListAsync();

        var activeByUnit = activeFoliosToday
            .GroupBy(x => x.EffectiveUnitId)
            .ToDictionary(g => g.Key, g =>
            {
                var latest = g.OrderByDescending(x => x.CreatedAt).First();
                var name = !string.IsNullOrWhiteSpace(latest.ResaFirstName) || !string.IsNullOrWhiteSpace(latest.ResaLastName)
                    ? $"{latest.ResaFirstName} {latest.ResaLastName}".Trim()
                    : latest.FolioGuest;
                var company = latest.ResaCompany ?? latest.FolioSociete;
                return new UnitOccupation(
                    latest.Number,
                    string.IsNullOrWhiteSpace(name) ? null : name,
                    string.IsNullOrWhiteSpace(company) ? null : company);
            });

        return rooms.Select(r => ToUnitDto(r, activeByUnit.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<UnitDto?> GetUnitByIdAsync(long id)
    {
        var room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == id);
        if (room is null) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        // Cherche l'unité effective (résa liée fait autorité). Un folio drifté sur
        // une autre chambre ne doit pas apparaître ici, et un folio dont la résa
        // pointe sur `id` doit apparaître même si f.UnitId a drifté.
        var activeFolio = await db.Folios
            .Where(f =>
                !f.Closed &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                (f.Reservation != null && f.Reservation.RoomId != null
                    ? f.Reservation.RoomId.Value == id &&
                      f.Reservation.CheckInDate <= today && f.Reservation.CheckOutDate > today
                    : f.UnitId == id &&
                      f.Arrival <= today && f.Departure > today))
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Number,
                ResaFirstName = f.Reservation != null ? f.Reservation.Client.FirstName : null,
                ResaLastName  = f.Reservation != null ? f.Reservation.Client.LastName  : null,
                FolioGuest    = f.Guest,
                ResaCompany   = f.Reservation != null && f.Reservation.Client.Company != null
                                    ? f.Reservation.Client.Company.Name
                                    : null,
                FolioSociete  = f.Societe,
            })
            .FirstOrDefaultAsync();

        UnitOccupation? occupation = null;
        if (activeFolio is not null)
        {
            var name = !string.IsNullOrWhiteSpace(activeFolio.ResaFirstName) || !string.IsNullOrWhiteSpace(activeFolio.ResaLastName)
                ? $"{activeFolio.ResaFirstName} {activeFolio.ResaLastName}".Trim()
                : activeFolio.FolioGuest;
            var company = activeFolio.ResaCompany ?? activeFolio.FolioSociete;
            occupation = new UnitOccupation(
                activeFolio.Number,
                string.IsNullOrWhiteSpace(name) ? null : name,
                string.IsNullOrWhiteSpace(company) ? null : company);
        }

        return ToUnitDto(room, occupation);
    }

    public async Task<(UnitDto? dto, string? error)> PatchMenageAsync(long id, PatchMenageRequest req)
    {
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return (null, null);

        if (!Enum.TryParse<MenageStatus>(req.StatutMenage, true, out var status))
            return (null, $"Invalid StatutMenage: {req.StatutMenage}. Valid: Propre, Sale");

        // Passage à Propre : StaffId obligatoire pour tracer qui a nettoyé.
        if (status == MenageStatus.Propre)
        {
            if (req.StaffId is null)
                return (null, "Merci d'indiquer la femme/valet de chambre qui a nettoyé.");

            var staff = await db.MaintenanceStaff.FirstOrDefaultAsync(s => s.Id == req.StaffId.Value && s.IsActive);
            if (staff is null)
                return (null, "Personnel introuvable ou inactif.");

            db.HousekeepingLogs.Add(new HousekeepingLog
            {
                RoomId    = room.Id,
                StaffId   = staff.Id,
                CleanedAt = DateTime.UtcNow,
                Notes     = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            });

            room.LastCleaned = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        room.StatutMenage = status;
        await db.SaveChangesAsync();
        return (await GetUnitByIdAsync(id), null);
    }

    public async Task<RoomHistoryDto?> GetRoomHistoryAsync(long roomId, int limit = 50)
    {
        var exists = await db.Rooms.AnyAsync(r => r.Id == roomId);
        if (!exists) return null;

        var housekeeping = await db.HousekeepingLogs
            .Include(h => h.Staff)
            .Where(h => h.RoomId == roomId)
            .OrderByDescending(h => h.CleanedAt)
            .Take(limit)
            .Select(h => new HousekeepingLogDto(
                h.Id, h.RoomId, h.StaffId,
                h.Staff.FirstName + " " + h.Staff.LastName,
                h.Staff.Phone,
                h.CleanedAt, h.Notes
            ))
            .ToListAsync();

        var tickets = await db.MaintenanceTickets
            .Include(t => t.Staff)
            .Include(t => t.Unit)
            .Where(t => t.UnitId == roomId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var maintenance = tickets.Select(t => new MaintenanceTicketDto(
            t.Id, t.Zone,
            t.UnitId, t.Unit?.NameFr,
            t.Spot, t.Category,
            t.Priority.ToString(), t.Title, t.Description,
            t.Tech, t.Cost, t.Status.ToString(),
            t.ResolvedAt, t.Note,
            t.CreatedAt, t.UpdatedAt,
            t.StaffId, t.Staff?.FullName, t.Staff?.Phone
        )).ToList();

        return new RoomHistoryDto(housekeeping, maintenance);
    }

    public async Task<(UnitDto? dto, string? error)> PatchHorsServiceAsync(long id, PatchHorsServiceRequest req)
    {
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return (null, null);

        room.HorsService = req.HorsService;
        // Rule 7: reactivating (HS → false) forces room to sale
        if (!req.HorsService)
            room.StatutMenage = MenageStatus.Sale;

        await db.SaveChangesAsync();
        return (await GetUnitByIdAsync(id), null);
    }

    // ── Folios ───────────────────────────────────────────────────────────────

    public async Task<Juweirat.Application.Common.Pagination.PagedResult<FolioDto>> GetPagedFoliosAsync(FolioFilterParams filter)
    {
        var query = db.Folios.Include(f => f.Unit).Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room).AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(f =>
                f.Number.ToLower().Contains(search) ||
                (f.Guest != null && f.Guest.ToLower().Contains(search)) ||
                (f.Nom != null && f.Nom.ToLower().Contains(search)) ||
                (f.Prenom != null && f.Prenom.ToLower().Contains(search)) ||
                (f.Societe != null && f.Societe.ToLower().Contains(search)) ||
                (f.Reservataire != null && f.Reservataire.ToLower().Contains(search)) ||
                (f.Note != null && f.Note.ToLower().Contains(search)) ||
                f.Unit.NameFr.ToLower().Contains(search) ||
                (f.Unit.PmsRoomNo != null && f.Unit.PmsRoomNo.Contains(search)) ||
                f.Unit.RoomNumber.Contains(search));
        }

        if (filter.Closed.HasValue)
            query = query.Where(f => f.Closed == filter.Closed.Value);

        if (filter.UnitId.HasValue)
            query = query.Where(f => f.UnitId == filter.UnitId.Value);

        if (!string.IsNullOrWhiteSpace(filter.ResaStatus) && Enum.TryParse<FolioStatus>(filter.ResaStatus, true, out var s))
            query = query.Where(f => f.ResaStatus == s);

        if (!string.IsNullOrWhiteSpace(filter.Segment) && Enum.TryParse<FolioSegment>(filter.Segment, true, out var seg))
            query = query.Where(f => f.Segment == seg);

        if (filter.ArrivalFrom.HasValue)
            query = query.Where(f => f.Arrival >= filter.ArrivalFrom.Value);

        if (filter.ArrivalTo.HasValue)
            query = query.Where(f => f.Arrival <= filter.ArrivalTo.Value);

        if (filter.DepartureFrom.HasValue)
            query = query.Where(f => f.Departure >= filter.DepartureFrom.Value);

        if (filter.DepartureTo.HasValue)
            query = query.Where(f => f.Departure <= filter.DepartureTo.Value);

        if (string.IsNullOrWhiteSpace(filter.SortBy))
        {
            query = query.OrderByDescending(f => f.CreatedAt);
        }

        var pagedResult = await Juweirat.Infrastructure.Extensions.QueryableExtensions.ToPagedResultAsync(query, filter, ToFolioDto);

        if (!string.IsNullOrWhiteSpace(filter.BalanceStatus))
        {
            var bs = filter.BalanceStatus.ToLower();
            if (bs == "with_balance")
            {
                var filteredItems = pagedResult.Items.Where(f => f.Solde > 0).ToList();
                return new Juweirat.Application.Common.Pagination.PagedResult<FolioDto>(
                    filteredItems, pagedResult.TotalCount, pagedResult.PageNumber, pagedResult.PageSize);
            }
            else if (bs == "settled")
            {
                var filteredItems = pagedResult.Items.Where(f => f.Solde == 0).ToList();
                return new Juweirat.Application.Common.Pagination.PagedResult<FolioDto>(
                    filteredItems, pagedResult.TotalCount, pagedResult.PageNumber, pagedResult.PageSize);
            }
        }

        return pagedResult;
    }

    public async Task<List<FolioDto>> GetFoliosAsync(bool? closed = null, long? unitId = null, string? resaStatus = null)
    {
        var query = db.Folios.Include(f => f.Unit).Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room).AsQueryable();

        if (closed.HasValue)    query = query.Where(f => f.Closed == closed.Value);
        if (unitId.HasValue)
            // Filtre sur l'unité EFFECTIVE (résa liée fait autorité, sinon folio propre).
            query = query.Where(f =>
                (f.Reservation != null && f.Reservation.RoomId != null
                    ? f.Reservation.RoomId.Value
                    : f.UnitId) == unitId.Value);
        if (resaStatus is not null && Enum.TryParse<FolioStatus>(resaStatus, true, out var s))
            query = query.Where(f => f.ResaStatus == s);

        var folios = await query.OrderByDescending(f => f.CreatedAt).ToListAsync();
        return folios.Select(ToFolioDto).ToList();
    }

    public async Task<FolioDto?> GetFolioByIdAsync(long id)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        return folio is null ? null : ToFolioDto(folio);
    }

    public async Task<ContractDataDto?> GetContractDataAsync(long folioId)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Client)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == folioId);
        if (folio is null) return null;

        var client = folio.Reservation?.Client;

        var prenomNom = (folio.Prenom is not null || folio.Nom is not null)
            ? $"{folio.Prenom ?? ""} {folio.Nom ?? ""}".Trim()
            : folio.Guest
              ?? (client is not null ? $"{client.FirstName} {client.LastName}".Trim() : null);

        var pieceId = (client?.DocumentType is not null && client.DocumentNumber is not null)
            ? $"{FormatDocType(client.DocumentType)} n° {client.DocumentNumber}"
            : null;

        var adresse = string.Join(", ", new[] { client?.City, client?.Country }.Where(x => x is not null));

        // Contrat = document juridique : les valeurs viennent de la RÉSA quand elle
        // est liée (source de vérité). Le logement est celui de la résa aussi, pour
        // que le contrat imprimé cite la chambre correctement même en cas de drift.
        var v = EffectiveView(folio);
        var contractUnit = folio.Reservation?.Room ?? folio.Unit;
        var nights = v.Departure.DayNumber - v.Arrival.DayNumber;

        return new ContractDataDto(
            PrenomNom:            prenomNom,
            Nationalite:          client?.Nationality,
            PieceIdentite:        pieceId,
            Adresse:              string.IsNullOrEmpty(adresse) ? null : adresse,
            Societe:              folio.Societe,
            AptNo:                contractUnit?.PmsRoomNo ?? contractUnit?.RoomNumber,
            Floor:                contractUnit?.Floor ?? 0,
            PmsType:              contractUnit?.PmsType,
            Arrival:              v.Arrival.ToString("yyyy-MM-dd"),
            Departure:            v.Departure.ToString("yyyy-MM-dd"),
            Nights:               nights,
            Rate:                 v.Rate,
            MonthlyLoyer:         v.Rate * 30,
            ElecIncluded:         folio.ElecIncluded,
            TarifTier:            folio.TarifTier.ToString(),
            FolioNumber:          folio.Number,
            Today:                DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd"),
            Discount:             folio.Reservation?.Discount ?? 0,
            ReservationReference: folio.Reservation?.Reference
        );
    }

    private static string FormatDocType(string t) => t switch
    {
        "passport"        => "Passeport",
        "idCard"          => "Carte Nationale d'Identité",
        "residencePermit" => "Titre de séjour",
        _                 => t,
    };

    public async Task<(FolioDto? dto, string? error)> CreateFolioAsync(CreateFolioRequest req)
    {
        var unit = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == req.UnitId);
        if (unit is null)          return (null, "Unit not found");
        if (unit.Category is null) return (null, "Unit has no category — pricing unavailable");

        var arrival   = req.Arrival   ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var departure = req.Departure ?? arrival.AddDays(1);
        if (departure <= arrival) return (null, "departure must be after arrival");

        var nights = departure.DayNumber - arrival.DayNumber;

        // Tarifs journaliers lus depuis la Category (source unique de vérité).
        var tarif    = TarifEngine.ForStay(unit.Category.TarifNuit, unit.Category.TarifN15, unit.Category.TarifN30, nights);
        var rate     = req.Rate > 0 ? req.Rate : tarif.PerNight;
        var tier     = tarif.Tier;
        var elec     = tarif.ElecIncluded;

        if (!Enum.TryParse<FolioStatus>(req.ResaStatus, true, out var resaStatus))
            resaStatus = FolioStatus.Confirmee;

        if (!Enum.TryParse<FolioSegment>(req.Segment, true, out var segment))
            segment = FolioSegment.Direct;

        var number = await NextFolioNumberAsync();

        var folio = new Folio
        {
            Number        = number,
            UnitId        = req.UnitId,
            Nom           = req.Nom,
            Prenom        = req.Prenom,
            Guest         = BuildGuest(req.Prenom, req.Nom),
            Societe       = req.Societe,
            Reservataire  = req.Reservataire,
            CardNumber    = req.CardNumber,
            CardExpiry    = req.CardExpiry,
            CardHolder    = req.CardHolder,
            Segment       = segment,
            Pax           = req.Pax,
            Arrival       = arrival,
            Departure     = departure,
            Rate          = rate,
            Heb           = req.Heb,
            TarifTier     = tier,
            ElecIncluded  = elec,
            PdjParJour    = req.PdjParJour,
            PdjPrix       = req.PdjPrix,
            Debiteur      = req.Debiteur,
            Dependances   = req.Dependances,
            Arrhes        = req.Arrhes,
            PayMode       = req.PayMode,
            FactRecipient = req.FactRecipient,
            ResaStatus    = resaStatus,
            Note          = req.Note,
        };

        db.Folios.Add(folio);
        await db.SaveChangesAsync();

        var created = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstAsync(f => f.Id == folio.Id);
        return (ToFolioDto(created), null);
    }

    public async Task<(FolioDto? dto, string? error)> UpdateFolioAsync(long id, UpdateFolioRequest req)
    {
        var folio = await db.Folios
            .Include(f => f.Unit).ThenInclude(u => u!.Category)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.Closed) return (null, "Folio is closed");

        if (req.Nom is not null)           folio.Nom          = req.Nom;
        if (req.Prenom is not null)        folio.Prenom       = req.Prenom;
        if (req.Nom is not null || req.Prenom is not null)
            folio.Guest = BuildGuest(folio.Prenom, folio.Nom);
        if (req.Societe is not null)       folio.Societe      = req.Societe;
        if (req.Reservataire is not null)  folio.Reservataire = req.Reservataire;
        if (req.CardNumber is not null)    folio.CardNumber   = req.CardNumber;
        if (req.CardExpiry is not null)    folio.CardExpiry   = req.CardExpiry;
        if (req.CardHolder is not null)    folio.CardHolder   = req.CardHolder;
        if (req.Pax.HasValue)             folio.Pax          = req.Pax.Value;
        if (req.PayMode is not null)       folio.PayMode      = req.PayMode;
        if (req.FactRecipient is not null) folio.FactRecipient = req.FactRecipient;
        if (req.Note is not null)          folio.Note         = req.Note;
        if (req.PdjParJour.HasValue)      folio.PdjParJour   = req.PdjParJour.Value;
        if (req.PdjPrix.HasValue)         folio.PdjPrix      = req.PdjPrix.Value;
        if (req.Debiteur.HasValue)        folio.Debiteur     = req.Debiteur.Value;
        if (req.Dependances.HasValue)     folio.Dependances  = req.Dependances.Value;
        if (req.Arrhes.HasValue)          folio.Arrhes       = req.Arrhes.Value;
        if (req.Heb.HasValue)             folio.Heb          = req.Heb.Value;

        if (req.Segment is not null && Enum.TryParse<FolioSegment>(req.Segment, true, out var seg))
            folio.Segment = seg;
        if (req.ResaStatus is not null && Enum.TryParse<FolioStatus>(req.ResaStatus, true, out var rs))
            folio.ResaStatus = rs;

        var datesChanged = req.Arrival.HasValue || req.Departure.HasValue;
        if (req.Arrival.HasValue)   folio.Arrival   = req.Arrival.Value;
        if (req.Departure.HasValue) folio.Departure = req.Departure.Value;

        if (folio.Departure <= folio.Arrival) return (null, "departure must be after arrival");

        // Recompute tariff when dates change and rate not manually overridden.
        // Tarifs journaliers lus depuis la Category (source unique de vérité).
        if (datesChanged && !req.Rate.HasValue)
        {
            if (folio.Unit?.Category is null) return (null, "Unit has no category — pricing unavailable");
            var nights = folio.Departure.DayNumber - folio.Arrival.DayNumber;
            var tarif  = TarifEngine.ForStay(folio.Unit.Category.TarifNuit, folio.Unit.Category.TarifN15, folio.Unit.Category.TarifN30, nights);
            folio.Rate         = tarif.PerNight;
            folio.TarifTier    = tarif.Tier;
            folio.ElecIncluded = tarif.ElecIncluded;
        }

        if (req.Rate.HasValue) folio.Rate = req.Rate.Value;

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Check-in ─────────────────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> CheckInAsync(long id)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.CheckedIn) return (null, "Already checked in");
        if (folio.Closed)    return (null, "Folio is closed");

        // Rule 3: hard block if room is not clean or hors service
        if (folio.Unit.HorsService)                           return (null, "Unit is hors service");
        if (folio.Unit.StatutMenage == MenageStatus.Sale) return (null, "Unit must be propre before check-in");

        // Enregistre l'horodatage uniquement à la vraie transition (folio pas encore
        // check-in). Un second appel accidentel ne réécrit pas l'événement d'origine.
        if (!folio.CheckedIn)
        {
            folio.CheckedIn   = true;
            folio.CheckedInAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        // Notification Angèle : le check-in vient d'être effectué (vraie transition).
        var v = EffectiveView(folio);
        var guestName = !string.IsNullOrWhiteSpace(folio.Prenom) || !string.IsNullOrWhiteSpace(folio.Nom)
            ? $"{folio.Prenom} {folio.Nom}".Trim()
            : folio.Guest;
        await notifications.ClientCheckinAsync(new ClientCheckinEvent(
            FolioId:      folio.Id,
            FolioNumber:  folio.Number,
            UnitLabel:    v.UnitName,
            Guest:        string.IsNullOrWhiteSpace(guestName) ? null : guestName,
            CompanyName:  folio.Societe,
            Arrival:      v.Arrival,
            Departure:    v.Departure,
            Nights:       v.Departure.DayNumber - v.Arrival.DayNumber,
            OccurredAt:   DateTime.UtcNow));

        return (ToFolioDto(folio), null);
    }

    // ── Check-out ────────────────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> CheckOutAsync(long id)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (!folio.CheckedIn) return (null, "Not checked in");
        if (folio.Closed)     return (null, "Folio already closed");

        var (totalHeb, totalPdj, solde) = ComputeFinancials(folio);

        // Rule 4: checkout blocked if unsettled solde
        if (solde > 0)
            return (null, $"Solde non réglé : {solde} FCFA. Encaisser ou transférer en débiteur avant de clôturer.");

        folio.Closed       = true;
        folio.CheckoutDate = DateOnly.FromDateTime(DateTime.UtcNow);
        // Départ = chambre libérée (disponible pour ré-attribution) ET marquée sale
        // (à nettoyer) en une même transaction — les deux états sont indissociables.
        folio.Unit.Status       = RoomStatus.Available;
        folio.Unit.StatutMenage = MenageStatus.Sale;

        await db.SaveChangesAsync();

        var dto = ToFolioDto(folio);
        await notifications.ClientCheckoutAsync(new ClientCheckoutEvent(
            FolioId:      dto.Id,
            FolioNumber:  dto.Number,
            UnitLabel:    dto.UnitLabel,
            Guest:        dto.Guest,
            CheckoutDate: dto.CheckoutDate,
            TotalGeneral: dto.TotalGeneral,
            OccurredAt:   DateTime.UtcNow));

        return (dto, null);
    }

    // ── Encaisser ────────────────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> EncaisserAsync(long id, EncaisserRequest req)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.Closed) return (null, "Folio is closed");

        var (_, _, solde) = ComputeFinancials(folio);

        // Rule 8: impute solde first, excess → arrhes
        var toSolde = Math.Min(req.Montant, solde);
        folio.Paid  += toSolde;
        var excess   = req.Montant - toSolde;
        if (excess > 0) folio.Arrhes += excess;

        if (req.PayMode is not null) folio.PayMode = req.PayMode;

        // Trace paiement dans la fiche client (Payments de la résa liée) — le folio
        // walk-in sans résa n'a pas de fiche client donc pas de ligne Payment ici.
        Payment? paymentEntity = null;
        if (folio.ReservationId is not null)
        {
            paymentEntity = new Payment
            {
                ReservationId = folio.ReservationId.Value,
                Amount        = req.Montant,
                Currency      = "XOF",
                Method        = ParsePaymentMethod(req.PayMode),
                Status        = PaymentStatus.Completed,
                PaidAt        = DateTime.UtcNow,
                Notes         = $"Encaissement folio {folio.Number}" + (req.PayMode is not null ? $" · {req.PayMode}" : ""),
            };
            db.Payments.Add(paymentEntity);
        }

        await db.SaveChangesAsync();

        // Journal comptable — encaissement caisse depuis compte client.
        // Fire-and-forget non bloquant.
        try
        {
            var clientId = folio.Reservation?.ClientId;
            if (clientId is not null && req.Montant > 0)
            {
                await accountingService.PostEncaissementAsync(
                    clientId:   clientId,
                    amount:     req.Montant,
                    sourceType: paymentEntity is not null ? "Payment" : "Folio",
                    sourceId:   paymentEntity?.Id ?? folio.Id,
                    label:      $"Encaissement folio {folio.Number} · {req.PayMode ?? "Espèces"}");
            }
        }
        catch { /* silent */ }

        return (ToFolioDto(folio), null);
    }

    // ── Transfert débiteur ───────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> TransferDebiteurAsync(long id, TransfertDebiteurRequest req)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations).Include(f => f.Reservation).ThenInclude(r => r!.Room)
            .FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.Closed) return (null, "Folio is closed");

        var (_, _, solde) = ComputeFinancials(folio);
        if (solde <= 0) return (null, "No outstanding balance to transfer");

        // Montant à transférer : plafonné au solde ; défaut = tout le solde.
        var montant = req.Montant.HasValue && req.Montant.Value > 0
            ? Math.Min(req.Montant.Value, solde)
            : solde;

        db.Debtors.Add(new Debtor
        {
            FolioId = folio.Id,
            Client  = folio.Guest ?? BuildGuest(folio.Prenom, folio.Nom),
            Label   = req.Label ?? $"Solde folio {folio.Number} — {folio.Unit.RoomNumber}",
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            Amount  = montant,
            Paid    = 0,
        });

        // Compte le montant transféré comme payé pour ne pas laisser le folio en dette
        // (la créance vit désormais côté Debtor).
        folio.Paid += montant;

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    // Résout l'hébergement d'un folio : priorité à la Reservation liée
    // (source unique de vérité prix), fallback sur Rate/Heb pour folios
    // standalone (créés directement au PMS sans web resa).
    // Retourne (gross, discount, net, prestationsResa) — tous en HT.
    internal static (int Gross, int Discount, int Net, int PrestationsResa)
        ResolveHeb(Folio f, int nights)
    {
        if (f.Reservation is not null)
        {
            var prestationsResa = f.Reservation.Prestations
                .Sum(p => (int)Math.Round(p.TotalLigne));
            var totalPrice = (int)Math.Round(f.Reservation.TotalPrice);
            var discount   = f.Reservation.Discount;
            // Invariant ReservationService : TotalPrice = gross + prestations − discount
            // ⇒ net = TotalPrice − prestations ; gross = net + discount
            var net   = totalPrice - prestationsResa;
            var gross = net + discount;
            return (gross, discount, net, prestationsResa);
        }
        var heb = TarifEngine.ComputeHeb(f.Rate, f.Heb, nights);
        return (heb, 0, heb, 0);
    }

    // Returns (totalHeb, totalPdj, solde) — totalHeb est NET (après remise résa)
    private static (int TotalHeb, int TotalPdj, int Solde) ComputeFinancials(Folio f)
    {
        var v               = EffectiveView(f);
        var nights          = v.Departure.DayNumber - v.Arrival.DayNumber;
        var (_, _, totalHebNet, totalPrestations) = ResolveHeb(f, nights);
        var totalPdj        = f.PdjParJour * f.PdjPrix * nights;
        // Solde en TTC : client paie TTC, prix stockés HT → ComputeSolde ajoute la TVA.
        var solde           = TarifEngine.ComputeSolde(totalHebNet, totalPdj, f.Debiteur, f.Dependances, f.Paid, f.Arrhes, v.TvaExonere, totalPrestations);
        return (totalHebNet, totalPdj, solde);
    }

    // Called within a SaveChangesAsync so config and folio are saved together
    private async Task<string> NextFolioNumberAsync()
    {
        var config = await db.HotelConfig.FindAsync(1)
            ?? throw new InvalidOperationException("HotelConfig missing — run seeder");
        config.ResaSeq++;
        return $"FL-{config.DateHotel.Year}-{config.ResaSeq:D4}";
    }

    private static string BuildGuest(string? prenom, string? nom)
        => $"{prenom} {nom}".Trim();

    private static HotelConfigDto ToConfigDto(HotelConfig c) => new(
        c.Id, c.BuildingName, c.OwnerName, c.City,
        c.CurrencyCode, c.CurrencyDecimals, c.DateHotel,
        c.ResaSeq, c.FactureSeq
    );

    // Info d'occupation courante affichée dans la vue gouvernante.
    internal record UnitOccupation(string FolioNumber, string? GuestName, string? CompanyName);

    private static UnitDto ToUnitDto(Room r, UnitOccupation? occupation) => new(
        r.Id,
        r.PmsRoomNo ?? r.RoomNumber,
        r.PmsType ?? r.Category?.PmsType ?? "T2",
        r.PmsGamme ?? r.Category?.PmsGamme ?? "standard",
        // Tarifs journaliers lus depuis la Category (source unique de vérité).
        r.Category?.TarifNuit ?? 0,
        r.Category?.TarifN15  ?? 0,
        r.Category?.TarifN30  ?? 0,
        r.StatutMenage.ToString(),
        r.LastCleaned,
        r.HorsService,
        r.Floor,
        r.PlanCol,
        r.PlanRow,
        r.NameFr,
        r.NameEn,
        occupation?.FolioNumber,
        occupation?.GuestName,
        occupation?.CompanyName
    );

    internal static FolioDto ToFolioDto(Folio f)
    {
        var v = EffectiveView(f);
        var nights          = v.Departure.DayNumber - v.Arrival.DayNumber;
        var (gross, discount, totalHeb, totalPrestations) = ResolveHeb(f, nights);
        var totalPdj        = f.PdjParJour * f.PdjPrix * nights;
        var totalDebiteur   = f.Debiteur;
        var totalDependances = f.Dependances;
        // TotalGeneral = HT (les composants sont HT). Le TTC est calculé côté client.
        var totalGeneral    = totalHeb + totalPrestations + totalPdj + totalDebiteur + totalDependances;
        var solde           = TarifEngine.ComputeSolde(totalHeb, totalPdj, totalDebiteur, totalDependances, f.Paid, f.Arrhes, v.TvaExonere, totalPrestations);
        var tva             = v.TvaExonere ? 0 : (int)Math.Round(totalGeneral * TarifEngine.TVA_RATE);
        var totalTtc        = totalGeneral + tva;

        return new FolioDto(
            f.Id, f.Number,
            v.UnitId, v.UnitName,
            f.Guest, f.Nom, f.Prenom, f.Societe, f.Reservataire,
            f.CardNumber, f.CardExpiry, f.CardHolder,
            f.Segment.ToString(), v.Pax,
            v.Arrival, v.Departure, nights,
            v.Rate, f.Heb, f.TarifTier.ToString(), f.ElecIncluded,
            f.PdjParJour, f.PdjPrix, f.Debiteur, f.Dependances,
            f.Arrhes, f.Paid, f.PayMode, f.FactRecipient,
            f.ResaStatus.ToString(), f.CheckedIn, f.Closed, f.CheckoutDate, f.Note,
            f.ReservationId, f.Reservation?.Reference, f.FactureId,
            f.CreatedAt, f.UpdatedAt,
            totalHeb, totalPdj, totalDebiteur, totalDependances, totalGeneral, solde,
            v.TvaExonere, tva, totalTtc,
            gross, discount,
            TotalPrestations: totalPrestations
        );
    }

    // Vue "effective" du folio : quand une réservation est liée, elle EST la
    // source de vérité pour chambre/dates/pax/rate/tva. Le folio a peut-être
    // drifté (bug historique avant la cascade) — cette projection fait autorité
    // en lecture. Les folios walk-in (Reservation null) utilisent leurs propres
    // colonnes. Cf. [[project-architecture]].
    internal readonly record struct FolioEffectiveView(
        long UnitId,
        string UnitName,
        DateOnly Arrival,
        DateOnly Departure,
        int Pax,
        int Rate,
        bool TvaExonere);

    internal static FolioEffectiveView EffectiveView(Folio f)
    {
        var r = f.Reservation;
        if (r is null)
        {
            return new FolioEffectiveView(
                f.UnitId,
                f.Unit?.NameFr ?? f.UnitId.ToString(),
                f.Arrival, f.Departure,
                f.Pax, f.Rate, f.TvaExonere);
        }

        var effectiveUnitId = r.RoomId ?? f.UnitId;
        // Nom de l'unité : préfère la Room chargée depuis la résa (source vraie),
        // sinon f.Unit si son Id matche l'effective (pas de drift), sinon ID brut.
        var unitName = r.Room?.NameFr
                       ?? (f.Unit is not null && f.Unit.Id == effectiveUnitId ? f.Unit.NameFr : null)
                       ?? effectiveUnitId.ToString();

        return new FolioEffectiveView(
            effectiveUnitId,
            unitName,
            r.CheckInDate, r.CheckOutDate,
            r.Adults + r.Children,
            (int)Math.Round(r.PricePerNightSnapshot),
            r.TvaExonere);
    }
}
