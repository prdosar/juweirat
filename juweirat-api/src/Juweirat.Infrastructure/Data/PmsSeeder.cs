using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

public static class PmsSeeder
{
    // Grille tarifaire complète — source : SPEC-PMS-Juweirat.md §5.2
    // Ordre : floor asc, pmsRoomNo asc (correspond à l'ordre d'insertion du seed.sql)
    private static readonly PmsRoomDef[] PmsRooms =
    [
        // Étage 2  (5 appartements)
        new("21", "T1", "standard",   30_000, 200_000,   300_000, 2, 0, 2), // tarifs à confirmer
        new("22", "T2", "supérieure", 45_000, 325_000,   600_000, 2, 0, 1),
        new("23", "T3", "supérieure", 80_000, 500_000,   900_000, 2, 1, 1),
        new("24", "T3", "supérieure", 80_000, 500_000,   900_000, 2, 0, 0),
        new("25", "T2", "privilège",  55_000, 350_000,   700_000, 2, 1, 0),
        // Étage 4  (6 appartements)
        new("41", "T1", "standard",   30_000, 200_000,   300_000, 4, 0, 2),
        new("42", "T2", "standard",   40_000, 300_000,   450_000, 4, 0, 1),
        new("43", "T3", "standard",   65_000, 450_000,   750_000, 4, 1, 2),
        new("44", "T3", "standard",   65_000, 450_000,   750_000, 4, 0, 0),
        new("45", "T2", "supérieure", 45_000, 300_000,   500_000, 4, 1, 1),
        new("46", "T1", "supérieur",  35_000, 250_000,   400_000, 4, 1, 0),
        // Étage 5  (6 appartements)
        new("51", "T1", "standard",   30_000, 200_000,   300_000, 5, 0, 2),
        new("52", "T2", "standard",   40_000, 300_000,   450_000, 5, 0, 1),
        new("53", "T3", "standard",   65_000, 450_000,   750_000, 5, 1, 2),
        new("54", "T3", "standard",   65_000, 450_000,   750_000, 5, 0, 0),
        new("55", "T2", "supérieure", 45_000, 300_000,   500_000, 5, 1, 1),
        new("56", "T1", "supérieure", 35_000, 250_000,   400_000, 5, 1, 0),
        // Étage 6  (2 appartements)
        new("61", "T1", "privilège",  40_000, 300_000,   450_000, 6, 0, 0),
        new("67", "T4", "suite",      95_000, 800_000, 1_500_000, 6, 1, 0),
    ];

    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedHotelConfigAsync(db);
        await SeedPmsRoomsAsync(db);
    }

    // ── HotelConfig — singleton ───────────────────────────────────────────────

    private static async Task SeedHotelConfigAsync(AppDbContext db)
    {
        if (!await db.HotelConfig.AnyAsync())
        {
            db.HotelConfig.Add(new HotelConfig
            {
                Id               = 1,
                BuildingName     = "Immeuble Juweirat",
                OwnerName        = "Saka Tidjani",
                City             = "Lomé",
                CurrencyCode     = "FCFA",
                CurrencyDecimals = 0,
                DateHotel        = DateOnly.FromDateTime(DateTime.UtcNow),
                ResaSeq          = 0,
                FactureSeq       = 0,
            });
            await db.SaveChangesAsync();
        }
    }

    // ── Appartements PMS ──────────────────────────────────────────────────────
    // Stratégie (base de données unifiée) :
    //   1. Si des rooms ont déjà pmsRoomNo → idempotent, juste insérer ce qui manque.
    //   2. Si des rooms existent SANS pmsRoomNo → les mettre à jour in-place (même IDs,
    //      pas de rupture pour les réservations/images liées), puis insérer ce qui reste.
    //   3. Si aucune room → insérer les 19 appartements depuis zéro.

    private static async Task SeedPmsRoomsAsync(AppDbContext db)
    {
        var existingPmsNos = await db.Rooms
            .Where(r => r.PmsRoomNo != null)
            .Select(r => r.PmsRoomNo!)
            .ToHashSetAsync();

        // Tous déjà mappés ? Vérifier s'il reste des rooms sans pmsRoomNo
        if (existingPmsNos.Count < PmsRooms.Length)
        {
            var pmsToInsert = PmsRooms
                .Where(p => !existingPmsNos.Contains(p.No))
                .OrderBy(p => p.Floor).ThenBy(p => p.No)
                .ToList();

            // Rooms existantes sans mapping PMS — on les met à jour en ordre
            var unmappedRooms = await db.Rooms
                .Where(r => r.PmsRoomNo == null)
                .OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
                .ToListAsync();

            int updateCount = Math.Min(unmappedRooms.Count, pmsToInsert.Count);

            for (int i = 0; i < updateCount; i++)
            {
                Apply(unmappedRooms[i], pmsToInsert[i]);
            }

            // PMS rooms restantes sans room existante → nouvelles lignes
            for (int i = updateCount; i < pmsToInsert.Count; i++)
            {
                db.Rooms.Add(NewRoom(pmsToInsert[i]));
            }

            if (updateCount > 0 || pmsToInsert.Count > updateCount)
                await db.SaveChangesAsync();
        }

        // S'il reste des chambres sans pmsRoomNo, leur assigner leur numéro de chambre
        var remainingWithoutPms = await db.Rooms.Where(r => r.PmsRoomNo == null).ToListAsync();
        if (remainingWithoutPms.Count > 0)
        {
            foreach (var r in remainingWithoutPms)
            {
                r.PmsRoomNo = r.RoomNumber;
            }
            await db.SaveChangesAsync();
        }
    }

    private static void Apply(Room room, PmsRoomDef p)
    {
        room.PmsRoomNo    = p.No;
        room.PmsType      = p.Type;
        room.PmsGamme     = p.Gamme;
        room.TarifNuit    = p.TarifNuit;
        room.TarifN15     = p.TarifN15;
        room.TarifN30     = p.TarifN30;
        room.Floor        = p.Floor;
        room.PlanCol      = p.Col;
        room.PlanRow      = p.Row;
        room.StatutMenage = MenageStatus.Propre;
        room.HorsService  = false;
        // Aligner les tarifs site public avec la grille PMS
        room.PricePerNight  = p.TarifNuit;
        room.PricePerMonth  = p.TarifN30;
    }

    private static Room NewRoom(PmsRoomDef p) => new()
    {
        RoomNumber    = p.No,
        Floor         = p.Floor,
        NameFr        = $"Appartement {p.No}",
        NameEn        = $"Apartment {p.No}",
        PricePerNight = p.TarifNuit,
        PricePerMonth = p.TarifN30,
        Status        = RoomStatus.Available,
        PmsRoomNo     = p.No,
        PmsType       = p.Type,
        PmsGamme      = p.Gamme,
        TarifNuit     = p.TarifNuit,
        TarifN15      = p.TarifN15,
        TarifN30      = p.TarifN30,
        StatutMenage  = MenageStatus.Propre,
        HorsService   = false,
        PlanCol       = p.Col,
        PlanRow       = p.Row,
    };

    private sealed record PmsRoomDef(
        string No, string Type, string Gamme,
        int TarifNuit, int TarifN15, int TarifN30,
        int Floor, int Col, int Row);
}
