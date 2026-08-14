using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace Juweirat.Infrastructure.Services;

public class EmailService(IConfiguration configuration)
{
    public async Task SendEmailAsync(string toEmail, string subject, string body, string fromName = "Juweirat Website", string replyTo = "")
    {
        var smtpHost = configuration["Smtp:Host"];
        var smtpPortString = configuration["Smtp:Port"];
        var smtpUser = configuration["Smtp:User"];
        var smtpPass = configuration["Smtp:Pass"];
        var fromEmail = configuration["Smtp:From"] ?? "contact@juweirat.com";

        if (string.IsNullOrEmpty(smtpHost) || string.IsNullOrEmpty(smtpPortString))
        {
            // Fallback for development if not configured
            Console.WriteLine("[EmailService] SMTP not fully configured. Email was not sent.");
            return;
        }

        int smtpPort = int.TryParse(smtpPortString, out var port) ? port : 587;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(new MailboxAddress("", toEmail));
        
        if (!string.IsNullOrEmpty(replyTo))
        {
            message.ReplyTo.Add(new MailboxAddress("", replyTo));
        }

        message.Subject = subject;

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = body
        };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            
            if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass))
            {
                await client.AuthenticateAsync(smtpUser, smtpPass);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailService] Failed to send email: {ex.Message}");
        }
    }
}
