using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── Existant (site public) ───────────────────────────────────────────────
    public DbSet<User>         Users          { get; set; }
    public DbSet<Room>         Rooms          { get; set; }
    public DbSet<RoomCategory> RoomCategories { get; set; }
    public DbSet<RoomImage>    RoomImages     { get; set; }
    public DbSet<Amenity>      Amenities      { get; set; }
    public DbSet<Client>       Clients        { get; set; }
    public DbSet<Reservation>  Reservations   { get; set; }
    public DbSet<Payment>      Payments       { get; set; }
    public DbSet<RoomBlock>    RoomBlocks     { get; set; }

    // ── PMS ──────────────────────────────────────────────────────────────────
    public DbSet<HotelConfig>      HotelConfig      { get; set; }
    public DbSet<Folio>            Folios           { get; set; }
    public DbSet<Facture>          Factures         { get; set; }
    public DbSet<Posting>          Postings         { get; set; }
    public DbSet<Cloture>          Clotures         { get; set; }
    public DbSet<MaintenanceTicket> MaintenanceTickets { get; set; }
    public DbSet<Debtor>           Debtors          { get; set; }
    public DbSet<ContactMessage>       ContactMessages      { get; set; }
    public DbSet<PrestationAnnexe>      PrestationsAnnexes     { get; set; }
    public DbSet<ReservationPrestation> ReservationPrestations { get; set; }
    public DbSet<VenteDirecte>          VentesDirectes         { get; set; }
    public DbSet<Company>               Companies              { get; set; }
    public DbSet<CompanyTarif>          CompanyTarifs          { get; set; }
    public DbSet<MaintenanceCategory>   MaintenanceCategories  { get; set; }
    public DbSet<MaintenanceStaff>      MaintenanceStaff       { get; set; }
    public DbSet<HousekeepingLog>       HousekeepingLogs       { get; set; }

    // ── Compta : comptes, mouvements, caisses, sessions ─────────────────────
    public DbSet<Account>          Accounts          { get; set; }
    public DbSet<AccountMovement>  AccountMovements  { get; set; }
    public DbSet<CashRegister>     CashRegisters     { get; set; }
    public DbSet<CashSession>      CashSessions      { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

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

        // ── roomCategories ────────────────────────────────────────
        modelBuilder.Entity<RoomCategory>(e =>
        {
            e.HasIndex(c => c.Slug).IsUnique();
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
            e.Property(r => r.SizeSqm).HasPrecision(5, 2);
        });

        // ── roomImages ────────────────────────────────────────────
        modelBuilder.Entity<RoomImage>(e =>
        {
            e.HasOne(i => i.Room)
             .WithMany(r => r.Images)
             .HasForeignKey(i => i.RoomId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.Category)
             .WithMany(c => c.Images)
             .HasForeignKey(i => i.CategoryId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── amenities ↔ rooms (M:N) ───────────────────────────────
        modelBuilder.Entity<Room>()
            .HasMany(r => r.Amenities)
            .WithMany(a => a.Rooms)
            .UsingEntity(j => j.ToTable("roomAmenities"));

        // ── companies ─────────────────────────────────────────────
        modelBuilder.Entity<Company>(e =>
        {
            e.Property(c => c.IsActive).HasDefaultValue(true);

            e.HasMany(c => c.Clients)
             .WithOne(cl => cl.Company)
             .HasForeignKey(cl => cl.CompanyId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasMany(c => c.Tarifs)
             .WithOne(t => t.Company)
             .HasForeignKey(t => t.CompanyId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── companyTarifs ─────────────────────────────────────────
        modelBuilder.Entity<CompanyTarif>(e =>
        {
            e.HasIndex(t => new { t.CompanyId, t.CategoryId }).IsUnique();

            e.HasOne(t => t.Category)
             .WithMany()
             .HasForeignKey(t => t.CategoryId)
             .OnDelete(DeleteBehavior.Restrict);
        });

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

            e.HasOne(r => r.Category)
             .WithMany()
             .HasForeignKey(r => r.CategoryId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Room)
             .WithMany(rm => rm.Reservations)
             .HasForeignKey(r => r.RoomId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Client)
             .WithMany(c => c.Reservations)
             .HasForeignKey(r => r.ClientId)
             .OnDelete(DeleteBehavior.Restrict);

            e.ToTable(t => t.HasCheckConstraint("ck_checkOutAfterCheckIn",
                "\"checkOutDate\" > \"checkInDate\""));
        });

        // ── prestationsAnnexes ────────────────────────────────────
        modelBuilder.Entity<PrestationAnnexe>(e =>
        {
            e.Property(p => p.PrixInclus).HasPrecision(10, 2);
            e.Property(p => p.PrixSeule).HasPrecision(10, 2);
            e.Property(p => p.IsActive).HasDefaultValue(true);
            e.Property(p => p.Mode).HasDefaultValue("ParPersonneParNuit");
        });

        // ── reservationPrestations ────────────────────────────────
        modelBuilder.Entity<ReservationPrestation>(e =>
        {
            e.Property(p => p.PrixUnitaireSnapshot).HasPrecision(10, 2);
            e.Property(p => p.TotalLigne).HasPrecision(10, 2);

            e.HasOne(p => p.Reservation)
             .WithMany(r => r.Prestations)
             .HasForeignKey(p => p.ReservationId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(p => p.Prestation)
             .WithMany(pa => pa.ReservationPrestations)
             .HasForeignKey(p => p.PrestationId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ventesDirectes ────────────────────────────────────────
        modelBuilder.Entity<VenteDirecte>(e =>
        {
            e.Property(v => v.PrixUnitaireSnapshot).HasPrecision(10, 2);
            e.Property(v => v.Total).HasPrecision(10, 2);
            e.Property(v => v.Mode).HasDefaultValue("Encaissement");

            e.HasOne(v => v.Prestation)
             .WithMany()
             .HasForeignKey(v => v.PrestationId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(v => v.Client)
             .WithMany()
             .HasForeignKey(v => v.ClientId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(v => v.Folio)
             .WithMany()
             .HasForeignKey(v => v.FolioId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
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

        // ── maintenanceCategories ─────────────────────────────────
        modelBuilder.Entity<MaintenanceCategory>(e =>
        {
            e.Property(c => c.IsActive).HasDefaultValue(true);

            e.HasMany(c => c.Staff)
             .WithOne(s => s.Category)
             .HasForeignKey(s => s.CategoryId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── maintenanceStaff ──────────────────────────────────────
        modelBuilder.Entity<MaintenanceStaff>(e =>
        {
            e.Property(s => s.IsActive).HasDefaultValue(true);

            e.HasMany(s => s.Tickets)
             .WithOne(t => t.Staff)
             .HasForeignKey(t => t.StaffId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
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

        // ── Housekeeping logs ─────────────────────────────────────
        modelBuilder.Entity<HousekeepingLog>(e =>
        {
            e.HasOne(h => h.Room)
             .WithMany()
             .HasForeignKey(h => h.RoomId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(h => h.Staff)
             .WithMany()
             .HasForeignKey(h => h.StaffId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(h => new { h.RoomId, h.CleanedAt });
            e.HasIndex(h => h.StaffId);
        });

        // ── Compta : accounts ─────────────────────────────────────
        modelBuilder.Entity<Account>(e =>
        {
            e.Property(a => a.Kind).HasConversion<string>();
            e.Property(a => a.Balance).HasPrecision(14, 2).HasDefaultValue(0m);
            e.Property(a => a.IsActive).HasDefaultValue(true);

            // Unicité d'un compte auxiliaire par tiers.
            e.HasIndex(a => new { a.Kind, a.OwnerRefId })
             .IsUnique()
             .HasFilter("\"ownerRefId\" IS NOT NULL");

            // Un seul compte système par Kind (unicité sur Kind quand OwnerRefId est null).
            e.HasIndex(a => a.Kind)
             .IsUnique()
             .HasFilter("\"ownerRefId\" IS NULL");
        });

        // ── Compta : accountMovements ─────────────────────────────
        modelBuilder.Entity<AccountMovement>(e =>
        {
            e.Property(m => m.Reason).HasConversion<string>();
            e.Property(m => m.Amount).HasPrecision(14, 2);

            e.HasOne(m => m.FromAccount)
             .WithMany()
             .HasForeignKey(m => m.FromAccountId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(m => m.ToAccount)
             .WithMany()
             .HasForeignKey(m => m.ToAccountId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(m => m.Session)
             .WithMany()
             .HasForeignKey(m => m.SessionId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);

            // Index de parcours : par période, par compte, par source métier.
            e.HasIndex(m => m.Date);
            e.HasIndex(m => new { m.FromAccountId, m.Date });
            e.HasIndex(m => new { m.ToAccountId, m.Date });
            e.HasIndex(m => new { m.SourceType, m.SourceId });
        });

        // ── Compta : cashRegisters ────────────────────────────────
        modelBuilder.Entity<CashRegister>(e =>
        {
            e.Property(r => r.IsActive).HasDefaultValue(true);
            e.HasIndex(r => r.Name).IsUnique();
        });

        // ── Compta : cashSessions ─────────────────────────────────
        modelBuilder.Entity<CashSession>(e =>
        {
            e.Property(s => s.Status).HasConversion<string>().HasDefaultValue(CashSessionStatus.Open);
            e.Property(s => s.OpeningFloat).HasPrecision(14, 2);
            e.Property(s => s.ClosingCountedTotal).HasPrecision(14, 2);

            e.HasOne(s => s.Register)
             .WithMany(r => r.Sessions)
             .HasForeignKey(s => s.RegisterId)
             .OnDelete(DeleteBehavior.Restrict);

            // Une seule session ouverte par (caisse, caissier).
            e.HasIndex(s => new { s.RegisterId, s.OpenedByUserId, s.Status })
             .IsUnique()
             .HasFilter("\"status\" = 'Open'");
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
            var updatedProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
            if (updatedProp != null)
            {
                if (updatedProp.Metadata.ClrType == typeof(DateTimeOffset) || updatedProp.Metadata.ClrType == typeof(DateTimeOffset?))
                    updatedProp.CurrentValue = DateTimeOffset.UtcNow;
                else
                    updatedProp.CurrentValue = DateTime.UtcNow;
            }

            if (entry.State == EntityState.Added)
            {
                var createdProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "CreatedAt");
                if (createdProp != null)
                {
                    if (createdProp.Metadata.ClrType == typeof(DateTimeOffset) || createdProp.Metadata.ClrType == typeof(DateTimeOffset?))
                        createdProp.CurrentValue = DateTimeOffset.UtcNow;
                    else
                        createdProp.CurrentValue = DateTime.UtcNow;
                }
            }
        }
    }
}
