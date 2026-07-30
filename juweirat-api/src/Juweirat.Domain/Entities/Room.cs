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

    // Navigation
    public ICollection<RoomImage> Images { get; set; } = [];
    public ICollection<Amenity> Amenities { get; set; } = [];
    public ICollection<Reservation> Reservations { get; set; } = [];
    public ICollection<RoomBlock> Blocks { get; set; } = [];
}
