using Juweirat.Application.DTOs.Pms;
using Juweirat.Application.Notifications;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class MaintenanceService(AppDbContext db, INotificationPublisher notifications)
{
    public async Task<List<MaintenanceTicketDto>> GetAllAsync(string? status = null, string? priority = null, long? unitId = null)
    {
        var query = db.MaintenanceTickets.Include(t => t.Unit).Include(t => t.Staff).AsQueryable();

        if (status is not null && Enum.TryParse<TicketStatus>(status, true, out var s))
            query = query.Where(t => t.Status == s);
        if (priority is not null && Enum.TryParse<TicketPriority>(priority, true, out var p))
            query = query.Where(t => t.Priority == p);
        if (unitId.HasValue)
            query = query.Where(t => t.UnitId == unitId.Value);

        var tickets = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return tickets.Select(ToDto).ToList();
    }

    public async Task<MaintenanceTicketDto?> GetByIdAsync(long id)
    {
        var t = await db.MaintenanceTickets.Include(t => t.Unit).Include(t => t.Staff).FirstOrDefaultAsync(x => x.Id == id);
        return t is null ? null : ToDto(t);
    }

    public async Task<(MaintenanceTicketDto? dto, string? error)> CreateAsync(CreateMaintenanceRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) return (null, "Title is required");

        if (!Enum.TryParse<TicketPriority>(req.Priority, true, out var priority))
            priority = TicketPriority.Normale;

        var ticket = new MaintenanceTicket
        {
            Zone        = req.Zone,
            UnitId      = req.UnitId,
            Spot        = req.Spot,
            Category    = req.Category,
            Priority    = priority,
            Title       = req.Title,
            Description = req.Description,
            Tech        = req.Tech,
            StaffId     = req.StaffId,
            Cost        = req.Cost,
            Note        = req.Note,
            Status      = TicketStatus.Ouvert,
        };

        db.MaintenanceTickets.Add(ticket);
        await db.SaveChangesAsync();

        var created = await db.MaintenanceTickets.Include(t => t.Unit).Include(t => t.Staff).FirstAsync(t => t.Id == ticket.Id);
        var dto = ToDto(created);

        await notifications.MaintenanceReportedAsync(new MaintenanceReportedEvent(
            TicketId:    dto.Id,
            Zone:        dto.Zone,
            UnitLabel:   dto.UnitLabel,
            Category:    dto.Category,
            Priority:    dto.Priority,
            Title:       dto.Title,
            Description: dto.Description,
            Tech:        dto.Tech,
            OccurredAt:  DateTime.UtcNow));

        return (dto, null);
    }

    public async Task<(MaintenanceTicketDto? dto, string? error)> UpdateAsync(long id, UpdateMaintenanceRequest req)
    {
        var ticket = await db.MaintenanceTickets.Include(t => t.Unit).Include(t => t.Staff).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return (null, null);

        if (req.Zone        is not null) ticket.Zone        = req.Zone;
        if (req.UnitId      is not null) ticket.UnitId      = req.UnitId;
        if (req.Spot        is not null) ticket.Spot        = req.Spot;
        if (req.Category    is not null) ticket.Category    = req.Category;
        if (req.Title       is not null) ticket.Title       = req.Title;
        if (req.Description is not null) ticket.Description = req.Description;
        if (req.Tech        is not null) ticket.Tech        = req.Tech;
        if (req.StaffId     is not null) ticket.StaffId     = req.StaffId == 0 ? null : req.StaffId;
        if (req.Cost        is not null) ticket.Cost        = req.Cost;
        if (req.Note        is not null) ticket.Note        = req.Note;

        if (req.Priority is not null && Enum.TryParse<TicketPriority>(req.Priority, true, out var p))
            ticket.Priority = p;

        if (req.Status is not null && Enum.TryParse<TicketStatus>(req.Status, true, out var s))
        {
            ticket.Status = s;
            if (s == TicketStatus.Resolu && ticket.ResolvedAt is null)
                ticket.ResolvedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return (ToDto(ticket), null);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var ticket = await db.MaintenanceTickets.FindAsync(id);
        if (ticket is null) return false;
        db.MaintenanceTickets.Remove(ticket);
        await db.SaveChangesAsync();
        return true;
    }

    private static MaintenanceTicketDto ToDto(MaintenanceTicket t) => new(
        t.Id, t.Zone,
        t.UnitId, t.Unit?.NameFr,
        t.Spot, t.Category,
        t.Priority.ToString(), t.Title, t.Description,
        t.Tech, t.Cost, t.Status.ToString(),
        t.ResolvedAt, t.Note,
        t.CreatedAt, t.UpdatedAt,
        t.StaffId, t.Staff?.FullName, t.Staff?.Phone
    );
}
