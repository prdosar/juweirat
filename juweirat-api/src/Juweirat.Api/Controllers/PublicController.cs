using Juweirat.Application.DTOs.Clients;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PublicController(ClientService clientService, ReservationService reservationService, EmailService emailService) : ControllerBase
{
    public record PublicBookingRequest(
        string FirstName, string LastName, string Email, string Phone, string Nationality,
        long CategoryId, DateOnly CheckInDate, DateOnly CheckOutDate, int Adults, int Children, string Notes
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

        // Send email to admin
        string adminSubject = $"[WEB] Nouvelle réservation: {req.FirstName} {req.LastName}";
        string adminBody = $"<p>Une nouvelle demande de réservation a été effectuée sur le site web.</p>" +
                           $"<ul><li>Nom: {req.FirstName} {req.LastName}</li>" +
                           $"<li>Email: {req.Email}</li><li>Téléphone: {req.Phone}</li>" +
                           $"<li>Séjour: {req.CheckInDate:dd/MM/yyyy} - {req.CheckOutDate:dd/MM/yyyy}</li>" +
                           $"<li>Notes: {req.Notes}</li></ul>";
        
        await emailService.SendEmailAsync("contact@juweirat.com", adminSubject, adminBody, req.FirstName + " " + req.LastName, req.Email);

        return Ok(res);
    }

    public record PublicContactRequest(string Name, string Email, string Phone, string Subject, string Message);

    [HttpPost("contact")]
    public async Task<IActionResult> SubmitContact([FromBody] PublicContactRequest req)
    {
        string subject = $"[WEB] Nouveau message: {req.Subject}";
        string body = $"<p>Un nouveau message a été envoyé depuis le formulaire de contact du site web.</p>" +
                      $"<ul><li><b>Nom:</b> {req.Name}</li>" +
                      $"<li><b>Email:</b> {req.Email}</li>" +
                      $"<li><b>Téléphone:</b> {req.Phone}</li>" +
                      $"<li><b>Sujet:</b> {req.Subject}</li></ul>" +
                      $"<hr><p><b>Message:</b></p><p>{req.Message.Replace("\n", "<br>")}</p>";

        await emailService.SendEmailAsync("contact@juweirat.com", subject, body, req.Name, req.Email);

        return Ok();
    }
}
