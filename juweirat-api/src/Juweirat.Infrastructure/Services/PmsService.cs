using Juweirat.Application.DTOs.Pms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class PmsService(AppDbContext db)
{
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
        var activeByUnit = await db.Folios
            .Where(f =>
                !f.Closed &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                f.Arrival <= today && f.Departure > today)
            .GroupBy(f => f.UnitId)
            .Select(g => new { UnitId = g.Key, Number = g.OrderByDescending(x => x.CreatedAt).First().Number })
            .ToDictionaryAsync(x => x.UnitId, x => x.Number);

        return rooms.Select(r => ToUnitDto(r, activeByUnit.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<UnitDto?> GetUnitByIdAsync(long id)
    {
        var room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == id);
        if (room is null) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeFolio = await db.Folios
            .Where(f =>
                f.UnitId == id && !f.Closed &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                f.Arrival <= today && f.Departure > today)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.Number)
            .FirstOrDefaultAsync();

        return ToUnitDto(room, activeFolio);
    }

    public async Task<(UnitDto? dto, string? error)> PatchMenageAsync(long id, PatchMenageRequest req)
    {
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return (null, null);

        if (!Enum.TryParse<MenageStatus>(req.StatutMenage, true, out var status))
            return (null, $"Invalid StatutMenage: {req.StatutMenage}. Valid: Propre, Sale");

        room.StatutMenage = status;
        if (status == MenageStatus.Propre)
            room.LastCleaned = DateOnly.FromDateTime(DateTime.UtcNow);

        await db.SaveChangesAsync();
        return (await GetUnitByIdAsync(id), null);
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

    public async Task<List<FolioDto>> GetFoliosAsync(bool? closed = null, long? unitId = null, string? resaStatus = null)
    {
        var query = db.Folios.Include(f => f.Unit).AsQueryable();

        if (closed.HasValue)    query = query.Where(f => f.Closed == closed.Value);
        if (unitId.HasValue)    query = query.Where(f => f.UnitId == unitId.Value);
        if (resaStatus is not null && Enum.TryParse<FolioStatus>(resaStatus, true, out var s))
            query = query.Where(f => f.ResaStatus == s);

        var folios = await query.OrderByDescending(f => f.CreatedAt).ToListAsync();
        return folios.Select(ToFolioDto).ToList();
    }

    public async Task<FolioDto?> GetFolioByIdAsync(long id)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
        return folio is null ? null : ToFolioDto(folio);
    }

    public async Task<ContractDataDto?> GetContractDataAsync(long folioId)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Client)
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

        var nights = folio.Departure.DayNumber - folio.Arrival.DayNumber;

        return new ContractDataDto(
            PrenomNom:     prenomNom,
            Nationalite:   client?.Nationality,
            PieceIdentite: pieceId,
            Adresse:       string.IsNullOrEmpty(adresse) ? null : adresse,
            Societe:       folio.Societe,
            AptNo:         folio.Unit.PmsRoomNo ?? folio.Unit.RoomNumber,
            Floor:         folio.Unit.Floor,
            PmsType:       folio.Unit.PmsType,
            Arrival:       folio.Arrival.ToString("yyyy-MM-dd"),
            Departure:     folio.Departure.ToString("yyyy-MM-dd"),
            Nights:        nights,
            Rate:          folio.Rate,
            MonthlyLoyer:  folio.Rate * 30,
            ElecIncluded:  folio.ElecIncluded,
            TarifTier:     folio.TarifTier.ToString(),
            FolioNumber:   folio.Number,
            Today:         DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")
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
        var unit = await db.Rooms.FindAsync(req.UnitId);
        if (unit is null) return (null, "Unit not found");

        var arrival   = req.Arrival   ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var departure = req.Departure ?? arrival.AddDays(1);
        if (departure <= arrival) return (null, "departure must be after arrival");

        var nights = departure.DayNumber - arrival.DayNumber;

        var tarif    = TarifEngine.ForStay(unit.TarifNuit, unit.TarifN15, unit.TarifN30, nights);
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

        var created = await db.Folios.Include(f => f.Unit).FirstAsync(f => f.Id == folio.Id);
        return (ToFolioDto(created), null);
    }

    public async Task<(FolioDto? dto, string? error)> UpdateFolioAsync(long id, UpdateFolioRequest req)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
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

        // Recompute tariff when dates change and rate not manually overridden
        if (datesChanged && !req.Rate.HasValue)
        {
            var nights = folio.Departure.DayNumber - folio.Arrival.DayNumber;
            var tarif  = TarifEngine.ForStay(folio.Unit.TarifNuit, folio.Unit.TarifN15, folio.Unit.TarifN30, nights);
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
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.CheckedIn) return (null, "Already checked in");
        if (folio.Closed)    return (null, "Folio is closed");

        // Rule 3: hard block if room is not clean or hors service
        if (folio.Unit.HorsService)                           return (null, "Unit is hors service");
        if (folio.Unit.StatutMenage == MenageStatus.Sale) return (null, "Unit must be propre before check-in");

        folio.CheckedIn = true;

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Check-out ────────────────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> CheckOutAsync(long id)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (!folio.CheckedIn) return (null, "Not checked in");
        if (folio.Closed)     return (null, "Folio already closed");

        var (totalHeb, totalPdj, solde) = ComputeFinancials(folio);

        // Rule 4: checkout blocked if unsettled solde
        if (solde > 0)
            return (null, $"Solde non réglé : {solde} FCFA. Encaisser ou transférer en débiteur avant de clôturer.");

        folio.Closed       = true;
        folio.CheckoutDate = DateOnly.FromDateTime(DateTime.UtcNow);
        folio.Unit.StatutMenage = MenageStatus.Sale; // rule 4: checkout → sale

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Encaisser ────────────────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> EncaisserAsync(long id, EncaisserRequest req)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.Closed) return (null, "Folio is closed");

        var (_, _, solde) = ComputeFinancials(folio);

        // Rule 8: impute solde first, excess → arrhes
        var toSolde = Math.Min(req.Montant, solde);
        folio.Paid  += toSolde;
        var excess   = req.Montant - toSolde;
        if (excess > 0) folio.Arrhes += excess;

        if (req.PayMode is not null) folio.PayMode = req.PayMode;

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Transfert débiteur ───────────────────────────────────────────────────

    public async Task<(FolioDto? dto, string? error)> TransferDebiteurAsync(long id, TransfertDebiteurRequest req)
    {
        var folio = await db.Folios.Include(f => f.Unit).FirstOrDefaultAsync(f => f.Id == id);
        if (folio is null) return (null, null);
        if (folio.Closed) return (null, "Folio is closed");

        var (_, _, solde) = ComputeFinancials(folio);
        if (solde <= 0) return (null, "No outstanding balance to transfer");

        db.Debtors.Add(new Debtor
        {
            FolioId = folio.Id,
            Client  = folio.Guest ?? BuildGuest(folio.Prenom, folio.Nom),
            Label   = req.Label ?? $"Solde folio {folio.Number} — {folio.Unit.RoomNumber}",
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            Amount  = solde,
            Paid    = 0,
        });

        // Settle folio by counting transferred amount as paid
        folio.Paid += solde;

        await db.SaveChangesAsync();
        return (ToFolioDto(folio), null);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    // Returns (totalHeb, totalPdj, solde)
    private static (int TotalHeb, int TotalPdj, int Solde) ComputeFinancials(Folio f)
    {
        var nights          = f.Departure.DayNumber - f.Arrival.DayNumber;
        var totalHeb        = TarifEngine.ComputeHeb(f.Rate, f.Heb, nights);
        var totalPdj        = f.PdjParJour * f.PdjPrix * nights;
        var solde           = TarifEngine.ComputeSolde(totalHeb, totalPdj, f.Debiteur, f.Dependances, f.Paid, f.Arrhes);
        return (totalHeb, totalPdj, solde);
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

    private static UnitDto ToUnitDto(Room r, string? currentFolioNumber) => new(
        r.Id,
        r.PmsRoomNo ?? r.RoomNumber,
        r.PmsType ?? r.Category?.PmsType ?? "T2",
        r.PmsGamme ?? r.Category?.PmsGamme ?? "standard",
        r.TarifNuit > 0 ? r.TarifNuit : (int)r.PricePerNight,
        r.TarifN15 > 0 ? r.TarifN15 : (int)(r.PricePerWeek.HasValue ? r.PricePerWeek.Value * 2 : r.PricePerNight * 15 * 0.8m),
        r.TarifN30 > 0 ? r.TarifN30 : (int)(r.PricePerMonth.HasValue ? r.PricePerMonth.Value : r.PricePerNight * 30 * 0.65m),
        r.StatutMenage.ToString(),
        r.LastCleaned,
        r.HorsService,
        r.Floor,
        r.PlanCol,
        r.PlanRow,
        r.NameFr,
        r.NameEn,
        currentFolioNumber
    );

    internal static FolioDto ToFolioDto(Folio f)
    {
        var nights          = f.Departure.DayNumber - f.Arrival.DayNumber;
        var totalHeb        = TarifEngine.ComputeHeb(f.Rate, f.Heb, nights);
        var totalPdj        = f.PdjParJour * f.PdjPrix * nights;
        var totalDebiteur   = f.Debiteur;
        var totalDependances = f.Dependances;
        var totalGeneral    = totalHeb + totalPdj + totalDebiteur + totalDependances;
        var solde           = TarifEngine.ComputeSolde(totalHeb, totalPdj, totalDebiteur, totalDependances, f.Paid, f.Arrhes);

        return new FolioDto(
            f.Id, f.Number,
            f.UnitId, f.Unit?.NameFr ?? f.UnitId.ToString(),
            f.Guest, f.Nom, f.Prenom, f.Societe, f.Reservataire,
            f.CardNumber, f.CardExpiry, f.CardHolder,
            f.Segment.ToString(), f.Pax,
            f.Arrival, f.Departure, nights,
            f.Rate, f.Heb, f.TarifTier.ToString(), f.ElecIncluded,
            f.PdjParJour, f.PdjPrix, f.Debiteur, f.Dependances,
            f.Arrhes, f.Paid, f.PayMode, f.FactRecipient,
            f.ResaStatus.ToString(), f.CheckedIn, f.Closed, f.CheckoutDate, f.Note,
            f.ReservationId, f.FactureId,
            f.CreatedAt, f.UpdatedAt,
            totalHeb, totalPdj, totalDebiteur, totalDependances, totalGeneral, solde
        );
    }
}
