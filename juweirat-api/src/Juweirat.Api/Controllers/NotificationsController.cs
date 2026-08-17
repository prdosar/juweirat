using System.Text.Json;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class NotificationsController(EmailService emailService) : ControllerBase
{
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
