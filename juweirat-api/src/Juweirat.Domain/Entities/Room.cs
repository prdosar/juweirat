using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Room
{
    public long Id { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public string NameFr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionFr { get; set; }
    public string? DescriptionEn { get; set; }
    public int CapacityAdults { get; set; } = 2;
    public int CapacityChildren { get; set; } = 1;
    public decimal? SizeSqm { get; set; }
    public decimal PricePerNight { get; set; }
    public decimal? PricePerWeek { get; set; }
    public decimal? PricePerMonth { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.Available;
    public bool IsFeatured { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── PMS fields ─────────────────────────────────────────────────────────────
    // Vrai numéro d'appartement (ex. "21", "67") — clé fonctionnelle PMS.
    // Null pour les chambres vitrine uniquement (non gérées via le PMS).
    public string? PmsRoomNo { get; set; }
    public string? PmsType { get; set; }   // T1 | T2 | T3 | T4
    public string? PmsGamme { get; set; }  // standard | supérieure | privilège | suite
    public int TarifNuit { get; set; }     // FCFA — nuitée (électricité incluse)
    public int TarifN15 { get; set; }      // FCFA — forfait 15 nuits (hors élec)
    public int TarifN30 { get; set; }      // FCFA — forfait 30 nuits (hors élec)
    public MenageStatus StatutMenage { get; set; } = MenageStatus.Propre;
    public DateOnly? LastCleaned { get; set; }
    public bool HorsService { get; set; } = false;
    public int PlanCol { get; set; }       // 0 = gauche, 1 = droite
    public int PlanRow { get; set; }

    // Navigation
    public ICollection<RoomImage>          Images       { get; set; } = [];
    public ICollection<Amenity>            Amenities    { get; set; } = [];
    public ICollection<Reservation>        Reservations { get; set; } = [];
    public ICollection<RoomBlock>          Blocks       { get; set; } = [];
    public ICollection<Folio>             Folios       { get; set; } = [];
    public ICollection<MaintenanceTicket> Tickets      { get; set; } = [];
}
