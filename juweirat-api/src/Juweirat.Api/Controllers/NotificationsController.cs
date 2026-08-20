using System.Text.Json;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController(EmailService emailService, AppDbContext db) : ControllerBase
{
    // Compteurs pour la cloche du header — un seul appel côté client.
    public record NotificationSummaryDto(
        string SystemDate,                       // "2026-08-19" (ISO)
        string TodayDate,                        // "2026-08-20" (ISO, jour réel serveur)
        int    PendingReservationsCount,         // résas Status=Pending
        int    WebsiteReservationsTodayCount,    // résas source=website créées durant la journée système
        int    UnreadMessagesCount,              // ContactMessages Status="New"
        int    DaysNotClosedCount                // nb de jours entre SystemDate (exclu) et TodayDate (inclus), 0 si aligné
    );

    [HttpGet("summary")]
    [Authorize]
    public async Task<IActionResult> GetSummary()
    {
        var config     = await db.HotelConfig.AsNoTracking().FirstOrDefaultAsync();
        var systemDate = config?.DateHotel ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var today      = DateOnly.FromDateTime(DateTime.UtcNow);

        var pending = await db.Reservations
            .CountAsync(r => r.Status == ReservationStatus.Pending);

        // "Dans la journée système" — bornes UTC (les timestamptz Postgres l'exigent).
        var dayStartUtc = systemDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEndUtc   = systemDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var websiteToday = await db.Reservations
            .CountAsync(r => r.Source != null
                          && r.Source.ToLower() == "website"
                          && r.CreatedAt >= dayStartUtc
                          && r.CreatedAt <= dayEndUtc);

        var unreadMessages = await db.ContactMessages
            .CountAsync(m => m.Status == "New");

        var daysNotClosed = today.DayNumber > systemDate.DayNumber
            ? today.DayNumber - systemDate.DayNumber
            : 0;

        return Ok(new NotificationSummaryDto(
            SystemDate:                    systemDate.ToString("yyyy-MM-dd"),
            TodayDate:                     today.ToString("yyyy-MM-dd"),
            PendingReservationsCount:      pending,
            WebsiteReservationsTodayCount: websiteToday,
            UnreadMessagesCount:           unreadMessages,
            DaysNotClosedCount:            daysNotClosed
        ));
    }

    public record NotificationSendRequest(
        string Type,
        string Recipient,
        string Subject,
        string Content,
        dynamic? Payload,
        string? Timestamp,
        string? Building
    );

    [HttpPost("send")]
    [AllowAnonymous]
    public async Task<IActionResult> SendNotification([FromBody] NotificationSendRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Recipient))
            return BadRequest(new { error = "Recipient is required." });

        string formattedHtml;
        string badgeText = req.Type switch
        {
            "confirmation" => "CONFIRMATION DE SÉJOUR",
            "annulation"   => "ANNULATION DE SÉJOUR",
            "noshow"       => "AVIS DE NO-SHOW / FACTURATION",
            "cloture"      => "CLÔTURE JOURNALIÈRE PMS",
            _              => "NOTIFICATION PMS"
        };

        if (req.Type == "cloture" && req.Payload != null)
        {
            try
            {
                var payloadJson = System.Text.Json.JsonSerializer.Serialize(req.Payload);
                var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;
                
                string dateHotel = root.TryGetProperty("dateHotel", out JsonElement d) ? d.GetString() ?? "" : "";
                int nbArr = root.TryGetProperty("nbArrivals", out JsonElement a) ? a.GetInt32() : 0;
                int nbDep = root.TryGetProperty("nbDeparts", out JsonElement dp) ? dp.GetInt32() : 0;
                int nbNs = root.TryGetProperty("nbNoShow", out JsonElement ns) ? ns.GetInt32() : 0;
                decimal ca = root.TryGetProperty("montant", out JsonElement m) ? m.GetDecimal() : 0;
                decimal occ = root.TryGetProperty("tauxOccup", out JsonElement o) ? o.GetDecimal() : 0;

                formattedHtml = EmailTemplateService.BuildPmsDailyClosing(dateHotel, nbArr, nbDep, nbNs, ca, 0, occ);
            }
            catch
            {
                formattedHtml = EmailTemplateService.WrapInLuxuryLayout(
                    title: req.Subject,
                    preheader: req.Content,
                    badgeText: badgeText,
                    bodyContent: $"<p style=\"font-size: 13.5px; line-height: 1.6;\">{req.Content.Replace("\n", "<br>")}</p>"
                );
            }
        }
        else
        {
            formattedHtml = EmailTemplateService.WrapInLuxuryLayout(
                title: req.Subject,
                preheader: req.Content,
                badgeText: badgeText,
                bodyContent: $"<p style=\"font-size: 13.5px; line-height: 1.6; color: #2A2622;\">{req.Content.Replace("\n", "<br>")}</p>",
                actionButtonText: "Accéder à mon séjour",
                actionButtonUrl: "https://juweirat.com"
            );
        }

        await emailService.SendEmailAsync(
            toEmail: req.Recipient,
            subject: req.Subject,
            body: formattedHtml,
            fromName: req.Building ?? "Résidence Juweirat",
            replyTo: "contact@juweirat.com"
        );

        return Ok(new { success = true });
    }
}
