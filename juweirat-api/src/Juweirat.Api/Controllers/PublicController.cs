using Juweirat.Application.DTOs.Clients;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PublicController(
    AppDbContext db,
    ClientService clientService,
    ReservationService reservationService,
    RoomCategoryService categorySvc,
    EmailService emailService,
    ContactMessageService contactMessageService
) : ControllerBase
{
    public record PublicBookingRequest(
        string FirstName, string LastName, string Email, string Phone, string Nationality,
        long CategoryId, DateOnly CheckInDate, DateOnly CheckOutDate, int Adults, int Children, string Notes,
        long? RoomId = null
    );

    [HttpPost("booking")]
    public async Task<IActionResult> CreateBooking([FromBody] PublicBookingRequest req)
    {
        string? emailTrim = req.Email?.Trim();
        string? phoneTrim = req.Phone?.Trim();

        var client = await db.Clients.FirstOrDefaultAsync(c =>
            (!string.IsNullOrEmpty(emailTrim) && c.Email != null && c.Email.ToLower() == emailTrim.ToLower()) ||
            (!string.IsNullOrEmpty(phoneTrim) && c.Phone != null && c.Phone == phoneTrim));

        if (client == null)
        {
            var newClient = new Juweirat.Domain.Entities.Client
            {
                FirstName   = string.IsNullOrWhiteSpace(req.FirstName) ? "Client" : req.FirstName.Trim(),
                LastName    = string.IsNullOrWhiteSpace(req.LastName) ? "Web" : req.LastName.Trim(),
                Email       = emailTrim,
                Phone       = phoneTrim,
                Nationality = req.Nationality,
            };
            db.Clients.Add(newClient);
            await db.SaveChangesAsync();
            client = newClient;
        }

        // If RoomId is passed, resolve CategoryId if it was not explicitly provided
        long categoryId = req.CategoryId;
        if (categoryId <= 0 && req.RoomId.HasValue)
        {
            var r = await db.Rooms.FindAsync(req.RoomId.Value);
            if (r?.CategoryId.HasValue == true)
            {
                categoryId = r.CategoryId.Value;
            }
        }
        if (categoryId <= 0)
        {
            var firstCat = await db.RoomCategories.FirstOrDefaultAsync();
            if (firstCat != null) categoryId = firstCat.Id;
        }

        var createRes = new CreateReservationRequest(
            CategoryId: categoryId,
            RoomId: req.RoomId,
            ClientId: client.Id,
            CheckInDate: req.CheckInDate,
            CheckOutDate: req.CheckOutDate,
            Adults: req.Adults,
            Children: req.Children,
            Source: "website",
            SpecialRequests: req.Notes
        );

        var (res, err) = await reservationService.CreateAsync(createRes);
        if (err is not null) return BadRequest(new { error = err });

        var category = await categorySvc.GetByIdAsync(res!.CategoryId);
        string categoryName = category?.NameFr ?? res.RoomNameFr ?? "Appartement Résidence Juweirat";

        // 1. Send luxury notification to admin
        string adminSubject = $"[RÉSERVATION WEB] {req.FirstName} {req.LastName} — {res.RoomNameFr ?? categoryName}";
        string adminBody = EmailTemplateService.BuildBookingAdminNotification(
            req.FirstName, req.LastName, req.Email ?? "", req.Phone, req.Nationality,
            categoryName, req.CheckInDate, req.CheckOutDate, req.Adults, req.Children, req.Notes
        );
        await emailService.SendEmailAsync("contact@juweirat.com", adminSubject, adminBody, "Réservation Juweirat", req.Email ?? "");

        // 2. Send luxury confirmation to guest
        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            string clientSubject = $"Confirmation de votre demande de séjour — Résidence Juweirat";
            string clientBody = EmailTemplateService.BuildBookingClientConfirmation(
                req.FirstName, req.LastName, categoryName, req.CheckInDate, req.CheckOutDate, req.Adults, req.Children
            );
            await emailService.SendEmailAsync(req.Email, clientSubject, clientBody, "Résidence Juweirat", "contact@juweirat.com");
        }

        return Ok(res);
    }

    public record PublicContactRequest(string Name, string Email, string? Phone, string? Subject, string Message);

    [HttpPost("contact")]
    public async Task<IActionResult> SubmitContact([FromBody] PublicContactRequest req)
    {
        string subject = string.IsNullOrWhiteSpace(req.Subject) ? "Demande de contact" : req.Subject;
        string phone = string.IsNullOrWhiteSpace(req.Phone) ? "Non renseigné" : req.Phone;

        // 1. Persist contact message in database
        var savedMessage = await contactMessageService.CreateAsync(req.Name, req.Email, req.Phone, subject, req.Message);

        // 2. Send luxury notification to admin contact@juweirat.com with Reply-To set to sender
        string adminSubject = $"[CONTACT SITE WEB #{savedMessage.Id}] {subject} — {req.Name}";
        string adminBody = EmailTemplateService.BuildContactAdminNotification(req.Name, req.Email, phone, subject, req.Message);
        await emailService.SendEmailAsync("contact@juweirat.com", adminSubject, adminBody, "Site Juweirat", req.Email);

        // 3. Send luxury acknowledgement to sender
        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            string clientSubject = $"Accusé de réception : {subject} — Résidence Juweirat";
            string clientBody = EmailTemplateService.BuildContactClientAcknowledgement(req.Name, subject);
            await emailService.SendEmailAsync(req.Email, clientSubject, clientBody, "Résidence Juweirat", "contact@juweirat.com");
        }

        return Ok(new { success = true, id = savedMessage.Id });
    }
}
