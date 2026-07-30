using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>        Users        { get; set; }
    public DbSet<Room>        Rooms        { get; set; }
    public DbSet<RoomImage>   RoomImages   { get; set; }
    public DbSet<Amenity>     Amenities    { get; set; }
    public DbSet<Client>      Clients      { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<Payment>     Payments     { get; set; }
    public DbSet<RoomBlock>   RoomBlocks   { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── users ────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasDefaultValue("staff");
            e.Property(u => u.IsActive).HasDefaultValue(true);
        });

        // ── rooms ────────────────────────────────────────────────
        modelBuilder.Entity<Room>(e =>
        {
            e.HasIndex(r => r.RoomNumber).IsUnique();
            e.Property(r => r.Status)
             .HasConversion<string>()
             .HasDefaultValue(RoomStatus.Available);
            e.Property(r => r.PricePerNight).HasPrecision(10, 2);
            e.Property(r => r.PricePerWeek).HasPrecision(10, 2);
            e.Property(r => r.PricePerMonth).HasPrecision(10, 2);
            e.Property(r => r.SizeSqm).HasPrecision(5, 2);
        });

        // ── roomImages ────────────────────────────────────────────
        modelBuilder.Entity<RoomImage>(e =>
        {
            e.HasOne(i => i.Room)
             .WithMany(r => r.Images)
             .HasForeignKey(i => i.RoomId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── amenities ↔ rooms (M:N) ───────────────────────────────
        modelBuilder.Entity<Room>()
            .HasMany(r => r.Amenities)
            .WithMany(a => a.Rooms)
            .UsingEntity(j => j.ToTable("roomAmenities"));

        // ── clients ───────────────────────────────────────────────
        modelBuilder.Entity<Client>(e =>
        {
            e.HasIndex(c => c.Email).IsUnique().HasFilter("\"email\" IS NOT NULL");
        });

        // ── reservations ──────────────────────────────────────────
        modelBuilder.Entity<Reservation>(e =>
        {
            e.HasIndex(r => r.Reference).IsUnique();
            e.Property(r => r.Status)
             .HasConversion<string>()
             .HasDefaultValue(ReservationStatus.Pending);
            e.Property(r => r.Currency).HasDefaultValue("XOF");
            e.Property(r => r.PricePerNightSnapshot).HasPrecision(10, 2);
            e.Property(r => r.TotalPrice).HasPrecision(10, 2);

            e.HasOne(r => r.Room)
             .WithMany(rm => rm.Reservations)
             .HasForeignKey(r => r.RoomId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Client)
             .WithMany(c => c.Reservations)
             .HasForeignKey(r => r.ClientId)
             .OnDelete(DeleteBehavior.Restrict);

            e.ToTable(t => t.HasCheckConstraint("ck_checkOutAfterCheckIn",
                "\"checkOutDate\" > \"checkInDate\""));
        });

        // ── payments ──────────────────────────────────────────────
        modelBuilder.Entity<Payment>(e =>
        {
            e.Property(p => p.Method).HasConversion<string>();
            e.Property(p => p.Status)
             .HasConversion<string>()
             .HasDefaultValue(PaymentStatus.Pending);
            e.Property(p => p.Currency).HasDefaultValue("XOF");
            e.Property(p => p.Amount).HasPrecision(10, 2);

            e.HasOne(p => p.Reservation)
             .WithMany(r => r.Payments)
             .HasForeignKey(p => p.ReservationId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── roomBlocks ────────────────────────────────────────────
        modelBuilder.Entity<RoomBlock>(e =>
        {
            e.HasOne(b => b.Room)
             .WithMany(r => r.Blocks)
             .HasForeignKey(b => b.RoomId)
             .OnDelete(DeleteBehavior.Cascade);

            e.ToTable(t => t.HasCheckConstraint("ck_blockEndAfterStart",
                "\"endDate\" > \"startDate\""));
        });

        // Apply camelCase naming to all tables and columns
        modelBuilder.ApplyCamelCaseNaming();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;

            if (entry.State == EntityState.Added &&
                entry.Properties.Any(p => p.Metadata.Name == "CreatedAt"))
                entry.Property("CreatedAt").CurrentValue = DateTime.UtcNow;
        }
    }
}
