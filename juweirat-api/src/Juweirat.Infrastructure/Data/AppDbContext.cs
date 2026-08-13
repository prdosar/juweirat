using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── Existant (site public) ───────────────────────────────────────────────
    public DbSet<User>        Users        { get; set; }
    public DbSet<Room>        Rooms        { get; set; }
    public DbSet<RoomImage>   RoomImages   { get; set; }
    public DbSet<Amenity>     Amenities    { get; set; }
    public DbSet<Client>      Clients      { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<Payment>     Payments     { get; set; }
    public DbSet<RoomBlock>   RoomBlocks   { get; set; }

    // ── PMS ──────────────────────────────────────────────────────────────────
    public DbSet<HotelConfig>      HotelConfig      { get; set; }
    public DbSet<Folio>            Folios           { get; set; }
    public DbSet<Facture>          Factures         { get; set; }
    public DbSet<Posting>          Postings         { get; set; }
    public DbSet<Cloture>          Clotures         { get; set; }
    public DbSet<MaintenanceTicket> MaintenanceTickets { get; set; }
    public DbSet<Debtor>           Debtors          { get; set; }
    public DbSet<MonthlyRecord>    MonthlyRecords   { get; set; }

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
            e.HasIndex(r => r.PmsRoomNo).IsUnique().HasFilter("\"pmsRoomNo\" IS NOT NULL");
            e.Property(r => r.Status)
             .HasConversion<string>()
             .HasDefaultValue(RoomStatus.Available);
            e.Property(r => r.StatutMenage)
             .HasConversion<string>()
             .HasDefaultValue(MenageStatus.Propre);
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

        // ── PMS : hotelConfig ─────────────────────────────────────
        // Singleton : toujours 1 ligne, Id = 1.
        modelBuilder.Entity<HotelConfig>(e =>
        {
            e.HasKey(c => c.Id);
        });

        // ── PMS : folios ──────────────────────────────────────────
        modelBuilder.Entity<Folio>(e =>
        {
            e.HasIndex(f => f.Number).IsUnique();
            e.Property(f => f.ResaStatus).HasConversion<string>();
            e.Property(f => f.Segment).HasConversion<string>();
            e.Property(f => f.TarifTier).HasConversion<string>();

            e.HasOne(f => f.Unit)
             .WithMany(r => r.Folios)
             .HasForeignKey(f => f.UnitId)
             .OnDelete(DeleteBehavior.Restrict);

            // Relation Facture : 1:0..1 — FK portée par Facture, pas par Folio.
            e.Property(f => f.FactureId).IsRequired(false);

            // Relation Reservation web : 1:0..1 — FK portée par Folio (ReservationId).
            e.HasOne(f => f.Reservation)
             .WithOne(r => r.Folio)
             .HasForeignKey<Folio>(f => f.ReservationId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── PMS : factures ────────────────────────────────────────
        modelBuilder.Entity<Facture>(e =>
        {
            e.HasIndex(f => f.Number).IsUnique();
            e.Property(f => f.Status).HasConversion<string>();

            e.HasOne(f => f.Folio)
             .WithOne(f => f.Facture)
             .HasForeignKey<Facture>(f => f.FolioId)
             .OnDelete(DeleteBehavior.Restrict);

            // Snapshot figé en JSONB via le support JSON natif d'EF Core 8+.
            // HasColumnName explicite car ApplyCamelCaseNaming saute les types JSON-mappés.
            e.OwnsOne(f => f.Snapshot, sb =>
            {
                sb.ToJson("snapshot");
                sb.OwnsMany(s => s.Lines);
            });
        });

        // ── PMS : postings (main courante) ────────────────────────
        modelBuilder.Entity<Posting>(e =>
        {
            e.HasOne(p => p.Folio)
             .WithMany(f => f.Postings)
             .HasForeignKey(p => p.FolioId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Unit)
             .WithMany()
             .HasForeignKey(p => p.UnitId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PMS : clotures ────────────────────────────────────────
        modelBuilder.Entity<Cloture>(e =>
        {
            e.HasIndex(c => c.DateHotel).IsUnique();
            e.Property(c => c.Occupation).HasPrecision(5, 2);
        });

        // ── PMS : maintenanceTickets ──────────────────────────────
        modelBuilder.Entity<MaintenanceTicket>(e =>
        {
            e.Property(t => t.Priority).HasConversion<string>();
            e.Property(t => t.Status).HasConversion<string>();

            e.HasOne(t => t.Unit)
             .WithMany(r => r.Tickets)
             .HasForeignKey(t => t.UnitId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── PMS : debtors ─────────────────────────────────────────
        modelBuilder.Entity<Debtor>(e =>
        {
            e.HasOne(d => d.Folio)
             .WithMany(f => f.Debtors)
             .HasForeignKey(d => d.FolioId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
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
