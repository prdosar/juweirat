using Juweirat.Application.DTOs.Clients;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PublicController(
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
        var clients = await clientService.GetAllAsync(req.Email ?? req.Phone);
        var client = clients.FirstOrDefault(c => c.Email == req.Email || c.Phone == req.Phone);

        if (client == null)
        {
            var (newClient, errClient) = await clientService.CreateAsync(new CreateClientRequest(
                req.FirstName, req.LastName, req.Email, req.Phone, req.Nationality, null, null, null, null, null
            ));
            
            if (errClient != null) return Conflict(new { error = errClient });
            client = newClient;
        }

        var createRes = new CreateReservationRequest(
            CategoryId: req.CategoryId,
            RoomId: req.RoomId,
            ClientId: client!.Id,
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
