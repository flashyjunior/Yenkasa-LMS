using System;
using System.Threading.Tasks;
using LMS.Data;
using LMS.Models;
using Microsoft.AspNetCore.DataProtection;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Net.Mime;
using System.Net;
using System.Text.RegularExpressions;
using System.IO;
using System.Net.Mail;

namespace LMS.Services
{
    public class EmailSender
    {
        private readonly LmsDbContext _context;
        private readonly IDataProtector _protector;
        private readonly Microsoft.Extensions.Logging.ILogger _logger;

        public EmailSender(LmsDbContext context, IDataProtectionProvider protectorProvider, Microsoft.Extensions.Logging.ILogger<EmailSender> logger)
        {
            _context = context;
            _protector = protectorProvider.CreateProtector("Lms.SmtpPasswordProtector.v1");
            _logger = logger;
        }

    public async Task SendAsync(string toEmail, string subject, string bodyHtml, byte[]? attachmentBytes = null, string? attachmentName = null)
        {
            // diagnostic: record entrance to SendAsync
            try
            {
                var logsDirDiag = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                if (!Directory.Exists(logsDirDiag)) Directory.CreateDirectory(logsDirDiag);
                var diagFile = Path.Combine(logsDirDiag, "email-sends.debug.log");
                File.AppendAllText(diagFile, $"{DateTime.UtcNow:o}\tENTER SendAsync\tTo:{toEmail}\tHasAttachment:{(attachmentBytes != null)}\n");
            }
            catch { }

            // read single config row
            var cfg = await _context.SmtpConfigs.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync();
            if (cfg == null)
            {
                try
                {
                    var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                    if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
                    var diagFile = Path.Combine(logsDir, "email-sends.debug.log");
                    File.AppendAllText(diagFile, $"{DateTime.UtcNow:o}\tCFG_NULL_BRANCH\tTo:{toEmail}\tHasAttachment:{(attachmentBytes != null)}\n");
                }
                catch { }
                // fallback: write to log in development and to a file so tests can inspect attachments
                _logger.LogInformation("[EmailSender] No SMTP config. Falling back to log. To: {to}, Subject: {subject}", toEmail, subject);
                _logger.LogDebug("Email body: {body}", bodyHtml);
                try
                {
                    var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                    if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
                    var logFile = Path.Combine(logsDir, "email-sends.log");
                    var line = $"{DateTime.UtcNow:o}\tFALLBACK\tTo:{toEmail}\tSubject:{subject}\tHasAttachment:{(attachmentBytes != null)}\tAttachmentName:{attachmentName}\n";
                    File.AppendAllText(logFile, line);
                }
                catch { }
                return;
            }

            var password = string.Empty;
            if (!string.IsNullOrEmpty(cfg.Password))
            {
                try { password = _protector.Unprotect(cfg.Password); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to unprotect SMTP password"); password = string.Empty; }
            }

            using (var client = new System.Net.Mail.SmtpClient(cfg.SmtpHost, cfg.SmtpPort))
            {
                client.EnableSsl = cfg.EnableSsl;
                if (!string.IsNullOrEmpty(cfg.User) && !string.IsNullOrEmpty(password))
                {
                    client.Credentials = new System.Net.NetworkCredential(cfg.User, password);
                }

                var from = string.IsNullOrEmpty(cfg.From) ? "no-reply@example.com" : cfg.From;

                // Decode HTML that may have been stored escaped, create plain-text fallback, and add explicit HTML alternate view.
                var decodedHtml = WebUtility.HtmlDecode(bodyHtml ?? string.Empty);
                var plainTextFallback = Regex.Replace(decodedHtml, "<[^>]+>", string.Empty);

                var msg = new System.Net.Mail.MailMessage(from, toEmail)
                {
                    Subject = subject,
                    Body = plainTextFallback, // primary plain-text body
                    IsBodyHtml = false
                };
                msg.BodyEncoding = Encoding.UTF8;
                msg.SubjectEncoding = Encoding.UTF8;

                try
                {
                    var avHtml = AlternateView.CreateAlternateViewFromString(decodedHtml, Encoding.UTF8, MediaTypeNames.Text.Html);

                    // attach inline logo if present (so template can use <img src="cid:logo.png" />)
                    try
                    {
                        var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "logo.jpg");
                        if (!File.Exists(logoPath))
                        {
                            // try fallback name
                            logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "logo.jpg");
                        }
                        if (File.Exists(logoPath))
                        {
                            var lr = new LinkedResource(logoPath, MediaTypeNames.Image.Png)
                            {
                                ContentId = "logo.jpg",
                                TransferEncoding = System.Net.Mime.TransferEncoding.Base64,
                                ContentType = new ContentType(MediaTypeNames.Image.Png)
                            };
                            avHtml.LinkedResources.Add(lr);
                        }
                    }
                    catch (Exception lrEx)
                    {
                        _logger.LogWarning(lrEx, "Failed to attach inline logo");
                    }

                    msg.AlternateViews.Add(avHtml);
                }
                catch (Exception avEx)
                {
                    _logger.LogWarning(avEx, "Failed to create HTML alternate view for email to {to}", toEmail);
                }

                // Ensure logs dir exists and write an attempt line so tests can inspect attachment presence
                try
                {
                    var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                    if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
                    var logFile = Path.Combine(logsDir, "email-sends.log");
                    var attemptLine = $"{DateTime.UtcNow:o}\tSMTP_ATTEMPT\tHost:{cfg.SmtpHost}\tTo:{toEmail}\tHasAttachment:{(attachmentBytes != null)}\tAttachmentName:{attachmentName}\n";
                    File.AppendAllText(logFile, attemptLine);
                }
                catch { }

                if (attachmentBytes != null && !string.IsNullOrEmpty(attachmentName))
                {
                    try
                    {
                        var ms = new System.IO.MemoryStream(attachmentBytes);
                        var attach = new System.Net.Mail.Attachment(ms, attachmentName, "application/pdf");
                        msg.Attachments.Add(attach);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to attach certificate to email");
                    }
                }
                try
                {
                    await client.SendMailAsync(msg);
                    _logger.LogInformation("Sent email to {to} via SMTP host {host}", toEmail, cfg.SmtpHost);
                }
                catch (System.Net.Mail.SmtpException sex)
                {
                    // Log useful diagnostic info without exposing secrets
                    _logger.LogError(sex, "SMTP failure sending email to {to} via {host}:{port} (ssl={ssl}) user={user}", toEmail, cfg.SmtpHost, cfg.SmtpPort, cfg.EnableSsl, cfg.User);
                    try
                    {
                        var logsDirEx = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                        if (!Directory.Exists(logsDirEx)) Directory.CreateDirectory(logsDirEx);
                        var errFile = Path.Combine(logsDirEx, "email-smtp-error.log");
                        var line = $"{DateTime.UtcNow:o}\tSMTP_ERROR\tHost:{cfg.SmtpHost}\tPort:{cfg.SmtpPort}\tSsl:{cfg.EnableSsl}\tUser:{cfg.User}\tStatus:{sex.StatusCode}\tMessage:{sex.Message}\n";
                        File.AppendAllText(errFile, line);

                        // Dump the email body and attachment for offline inspection
                        var dumpsDir = Path.Combine(logsDirEx, "email-dumps");
                        if (!Directory.Exists(dumpsDir)) Directory.CreateDirectory(dumpsDir);
                        var safeTo = toEmail?.Replace('@', '_').Replace(':', '_') ?? "unknown";
                        var baseName = $"{DateTime.UtcNow.ToString("yyyyMMddHHmmss")}_{safeTo}";
                        var htmlPath = Path.Combine(dumpsDir, baseName + "_body.html");
                        // write decoded HTML to dump so it renders properly when opened
                        File.WriteAllText(htmlPath, decodedHtml ?? string.Empty);
                        if (attachmentBytes != null && attachmentBytes.Length > 0 && !string.IsNullOrEmpty(attachmentName))
                        {
                            var attachPath = Path.Combine(dumpsDir, baseName + "_" + attachmentName);
                            try { File.WriteAllBytes(attachPath, attachmentBytes); }
                            catch { File.WriteAllText(Path.Combine(dumpsDir, baseName + "_attachment_error.txt"), "Failed to write attachment bytes"); }
                        }
                    }
                    catch { }

                    // Do not throw — let the app continue and rely on the logs/dumps for troubleshooting
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send email to {to} via SMTP host {host}", toEmail, cfg.SmtpHost);
                    try
                    {
                        var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                        if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
                        var errFile = Path.Combine(logsDir, "email-smtp-error.log");
                        var line = $"{DateTime.UtcNow:o}\tEMAIL_SEND_EXCEPTION\tHost:{cfg.SmtpHost}\tPort:{cfg.SmtpPort}\tSsl:{cfg.EnableSsl}\tUser:{cfg.User}\tMessage:{ex.Message}\n";
                        File.AppendAllText(errFile, line);
                    }
                    catch { }
                    return;
                }
            }
        }
    }
}
