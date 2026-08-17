using Juweirat.Application.DTOs.ContactMessages;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Juweirat.Infrastructure.Services;

public class ContactMessageService(AppDbContext db, EmailService emailService, ILogger<ContactMessageService> logger)
{
    public async Task<List<ContactMessageDto>> GetAllAsync(string? status = null, string? search = null)
    {
        var q = db.ContactMessages.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            q = q.Where(m => m.Status.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(m => m.Name.ToLower().Contains(s)
                          || m.Email.ToLower().Contains(s)
                          || (m.Phone != null && m.Phone.Contains(s))
                          || m.Subject.ToLower().Contains(s)
                          || m.Message.ToLower().Contains(s));
        }

        return await q.OrderByDescending(m => m.CreatedAt)
                      .Select(m => ToDto(m))
                      .ToListAsync();
    }

    public async Task<ContactMessageDto?> GetByIdAsync(long id)
    {
        var m = await db.ContactMessages.FindAsync(id);
        return m == null ? null : ToDto(m);
    }

    public async Task<ContactMessageDto> CreateAsync(string name, string email, string? phone, string subject, string message)
    {
        var entity = new ContactMessage
        {
            Name = name,
            Email = email,
            Phone = phone,
            Subject = subject,
            Message = message,
            Status = "New",
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.ContactMessages.Add(entity);
        await db.SaveChangesAsync();

        logger.LogInformation("[ContactMessage] Saved message #{Id} from '{Name}' ({Email})", entity.Id, name, email);
        return ToDto(entity);
    }

    public async Task<bool> MarkAsReadAsync(long id)
    {
        var m = await db.ContactMessages.FindAsync(id);
        if (m == null) return false;

        if (m.Status == "New")
        {
            m.Status = "Read";
            await db.SaveChangesAsync();
        }
        return true;
    }

    public async Task<(bool Success, string? Error)> ReplyAsync(long id, string replyBody, string repliedBy)
    {
        var m = await db.ContactMessages.FindAsync(id);
        if (m == null) return (false, "Message introuvable");

        try
        {
            // 1. Build beautiful HTML email reply
            string replySubject = $"Re: {m.Subject} — Résidence Juweirat";
            string replyHtml = EmailTemplateService.BuildContactReplyEmail(m.Name, m.Subject, m.Message, replyBody);

            // 2. Send email to client
            await emailService.SendEmailAsync(m.Email, replySubject, replyHtml, "Résidence Juweirat", "contact@juweirat.com");

            // 3. Send copy to contact@juweirat.com so it's archived in Roundcube/inbox
            string adminArchiveSubject = $"[RÉPONSE ENVOYÉE] Re: {m.Subject} à {m.Name} ({m.Email})";
            await emailService.SendEmailAsync("contact@juweirat.com", adminArchiveSubject, replyHtml, "Résidence Juweirat (Admin)", m.Email);

            // 4. Update message in DB
            m.Status = "Replied";
            m.ReplyMessage = replyBody;
            m.RepliedAt = DateTimeOffset.UtcNow;
            m.RepliedBy = string.IsNullOrWhiteSpace(repliedBy) ? "Direction Juweirat" : repliedBy;
            await db.SaveChangesAsync();

            logger.LogInformation("[ContactMessage] Reply sent for message #{Id} to '{Email}' by '{User}'", id, m.Email, repliedBy);
            return (true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ContactMessage] Failed to send reply for message #{Id}: {Message}", id, ex.Message);
            return (false, ex.Message);
        }
    }

    private static ContactMessageDto ToDto(ContactMessage m) => new(
        m.Id,
        m.Name,
        m.Email,
        m.Phone,
        m.Subject,
        m.Message,
        m.Status,
        m.ReplyMessage,
        m.RepliedAt,
        m.RepliedBy,
        m.CreatedAt
    );
}
