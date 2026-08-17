using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Juweirat.Infrastructure.Services;

public class EmailService(IConfiguration configuration, ILogger<EmailService> logger)
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
            logger.LogWarning("[EmailService] SMTP not fully configured (Host: '{Host}', Port: '{Port}'). Email not sent.", smtpHost, smtpPortString);
            return;
        }

        int smtpPort = int.TryParse(smtpPortString, out var port) ? port : 465;

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
            client.Timeout = 15000;
            var secureOption = smtpPort == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(smtpHost, smtpPort, secureOption);
            
            if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass))
            {
                await client.AuthenticateAsync(smtpUser, smtpPass);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            logger.LogInformation("[EmailService] Email successfully sent to '{ToEmail}' with subject '{Subject}' via {Host}:{Port}", toEmail, subject, smtpHost, smtpPort);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[EmailService] Failed to send email to '{ToEmail}' via {Host}:{Port}: {Message}", toEmail, smtpHost, smtpPort, ex.Message);
        }
    }
}
