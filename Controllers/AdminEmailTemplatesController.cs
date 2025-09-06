using System;
using System.Collections.Generic;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using LMS.Data;
using LMS.Models;
using System.Linq;
using LMS.Services;

namespace LMS.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminEmailTemplatesController : ControllerBase
    {
        private readonly LmsDbContext _context;
        private readonly IDataProtector _protector;
        private readonly EmailSender _emailSender;
        private readonly EmailTemplateService _templateService;

        public class SendTestDto
        {
            public string? Subject { get; set; }
            public string? Body { get; set; }
            public string? Email { get; set; }
            // optional tokens caller may include in future
            // public IDictionary<string,string>? Tokens { get; set; }
        }

        public AdminEmailTemplatesController(LmsDbContext context, IDataProtectionProvider protectorProvider, EmailSender emailSender, EmailTemplateService templateService)
        {
            _context = context;
            _protector = protectorProvider.CreateProtector("Lms.SmtpPasswordProtector.v1");
            _emailSender = emailSender;
            _templateService = templateService;
        }

        // GET /api/admin/email-templates
        [HttpGet("email-templates")]
        public async Task<IActionResult> GetTemplates()
        {
            var list = await _context.EmailTemplates.OrderBy(t => t.Key).ToListAsync();
            return Ok(list);
        }

        public class EmailTemplateDto { public string Key { get; set; } = string.Empty; public string Subject { get; set; } = string.Empty; public string Body { get; set; } = string.Empty; }

        // POST /api/admin/email-templates
        [HttpPost("email-templates")]
        public async Task<IActionResult> CreateTemplate([FromBody] EmailTemplateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Key)) return BadRequest("Key is required");
            if (await _context.EmailTemplates.AnyAsync(e => e.Key == dto.Key)) return Conflict("Template with key exists");
            var t = new EmailTemplate { Key = dto.Key.Trim(), Subject = dto.Subject, Body = dto.Body, CreatedAt = DateTime.UtcNow };
            _context.EmailTemplates.Add(t);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTemplates), new { id = t.Id }, t);
        }

        // PUT /api/admin/email-templates/{id}
        [HttpPut("email-templates/{id:int}")]
        public async Task<IActionResult> UpdateTemplate(int id, [FromBody] EmailTemplateDto dto)
        {
            var t = await _context.EmailTemplates.FindAsync(id);
            if (t == null) return NotFound();
            t.Subject = dto.Subject;
            t.Body = dto.Body;
            t.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(t);
        }

        // DELETE /api/admin/email-templates/{id}
        [HttpDelete("email-templates/{id:int}")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            var t = await _context.EmailTemplates.FindAsync(id);
            if (t == null) return NotFound();
            _context.EmailTemplates.Remove(t);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/admin/config/smtp
        [HttpGet("config/smtp")]
        public async Task<IActionResult> GetSmtp()
        {
            var cfg = await _context.SmtpConfigs.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync();
            if (cfg == null) return Ok(new { SmtpHost = string.Empty, SmtpPort = 587, EnableSsl = true, User = string.Empty, PasswordPresent = false, From = string.Empty });

            // Do not return plaintext password or presence. Only return the config fields except password.
            return Ok(new { cfg.SmtpHost, cfg.SmtpPort, cfg.EnableSsl, cfg.User, cfg.From });
        }

        // POST /api/admin/config/smtp
        [HttpPost("config/smtp")]
        public async Task<IActionResult> SaveSmtp([FromBody] SmtpConfig payload)
        {
            if (payload == null) return BadRequest("payload required");

            // Find existing latest config to update, otherwise create new
            var existing = await _context.SmtpConfigs.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync();
            if (existing == null)
            {
                existing = new SmtpConfig();
                _context.SmtpConfigs.Add(existing);
            }

            existing.SmtpHost = payload.SmtpHost;
            existing.SmtpPort = payload.SmtpPort;
            existing.EnableSsl = payload.EnableSsl;
            existing.User = payload.User;
            existing.From = payload.From;
            existing.UpdatedAt = DateTime.UtcNow;

            // Only change stored password when a new password is provided
            if (!string.IsNullOrEmpty(payload.Password))
            {
                existing.Password = _protector.Protect(payload.Password);
            }

            await _context.SaveChangesAsync();

            // Remove any other config rows so we have a single row for config
            var others = _context.SmtpConfigs.Where(s => s.Id != existing.Id);
            if (await others.AnyAsync())
            {
                _context.SmtpConfigs.RemoveRange(others);
                await _context.SaveChangesAsync();
            }

            return Ok(new { existing.SmtpHost, existing.SmtpPort, existing.EnableSsl, existing.User, existing.From });
        }

        // ADMIN: test current SMTP settings by attempting a connection/send and returning diagnostics
        [Authorize(Roles = "Admin")]
        [HttpPost("config/smtp/test")]
        public async Task<IActionResult> TestSmtp()

        {
            var cfg = await _context.SmtpConfigs.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync();
            if (cfg == null) return BadRequest(new { error = "No SMTP config found" });
            var protector = HttpContext.RequestServices.GetService(typeof(Microsoft.AspNetCore.DataProtection.IDataProtectionProvider)) as Microsoft.AspNetCore.DataProtection.IDataProtectionProvider;
            string password = string.Empty;
            if (!string.IsNullOrEmpty(cfg.Password) && protector != null)
            {
                try { password = protector.CreateProtector("Lms.SmtpPasswordProtector.v1").Unprotect(cfg.Password); }
                catch { password = "<unprotect_failed>"; }
            }
            // Try to send a test email but do not throw
            var to = cfg.From ?? cfg.User ?? "test@example.com";
            var result = new Dictionary<string, object>();
            result["host"] = cfg.SmtpHost ?? string.Empty;
            result["port"] = cfg.SmtpPort;
            result["ssl"] = cfg.EnableSsl;
            result["user"] = cfg.User ?? string.Empty;
            result["from"] = cfg.From ?? string.Empty;
            result["password_present"] = !string.IsNullOrEmpty(cfg.Password);
            try
            {
                using var client = new System.Net.Mail.SmtpClient(cfg.SmtpHost, cfg.SmtpPort);
                client.EnableSsl = cfg.EnableSsl;
                if (!string.IsNullOrEmpty(cfg.User) && !string.IsNullOrEmpty(password) && password != "<unprotect_failed>") client.Credentials = new System.Net.NetworkCredential(cfg.User, password);
                var msg = new System.Net.Mail.MailMessage(cfg.From ?? cfg.User ?? "no-reply@example.com", to)
                {
                    Subject = "LMS SMTP test",
                    Body = "This is a test email from LMS SMTP test endpoint (no real delivery guaranteed).",
                    IsBodyHtml = false
                };
                try
                {
                    await client.SendMailAsync(msg);
                    result["send"] = "ok";
                }
                catch (System.Net.Mail.SmtpException sex)
                {
                    result["send"] = "smtp_error";
                    result["smtp_status"] = sex.StatusCode.ToString();
                    result["smtp_message"] = sex.Message;
                }
                catch (Exception ex)
                {
                    result["send"] = "error";
                    result["error_message"] = ex.Message;
                }
            }
            catch (Exception ex)
            {
                result["setup_error"] = ex.Message;
            }
            // include any local diagnostic files if present
            try
            {
                var logsDir = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
                if (Directory.Exists(logsDir))
                {
                    var err = System.IO.Path.Combine(logsDir, "email-smtp-error.log");
                    if (System.IO.File.Exists(err)) result["smtp_error_log"] = System.IO.File.ReadAllText(err);
                    var dumps = System.IO.Path.Combine(logsDir, "email-dumps");
                    if (Directory.Exists(dumps)) result["dumps"] = System.IO.Directory.GetFiles(dumps).Select(f => System.IO.Path.GetFileName(f)).ToArray();
                }
            }
            catch { }
            return Ok(result);
        }

        // Exact route to match frontend: POST /api/admin/email-templates/{id}/send-test
        [HttpPost("/api/admin/email-templates/{id}/send-test")]
        public async Task<IActionResult> SendTest(int id, [FromBody] SendTestDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("email required");

            try
            {
                // Build default tokens for test send
                var tokens = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
                {
                    ["link"] = "https://example.com/reset-password",    // realistic sample link
                    ["resetLink"] = "https://example.com/reset-password",
                    ["email"] = dto.Email,
                    ["companyName"] = "Your Company",
                    ["applicationurl"] = "https://example.com",
                    ["ApplicationUrl"] = "https://example.com",
                    ["userName"] = "Test User"
                };

                // Start with provided body. If the id corresponds to a stored template, prefer that body.
                string templateBody = dto.Body ?? string.Empty;
                try
                {
                    var stored = await _templateService.GetByIdAsync(id);
                    if (stored != null && !string.IsNullOrWhiteSpace(stored.Body))
                    {
                        templateBody = stored.Body;
                    }
                }
                catch
                {
                    // ignore if GetByIdAsync not available or fails — fallback to dto.Body
                }

                // Replace tokens in a case-insensitive way, encoding token values
                string rendered = RenderTemplateWithTokens(templateBody, tokens);

                // Send the rendered HTML
                await _emailSender.SendAsync(dto.Email!, dto.Subject ?? "Test email", rendered);

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        private static string RenderTemplateWithTokens(string template, IDictionary<string, string?> tokens)
        {
            if (string.IsNullOrEmpty(template)) return template;

            foreach (var kv in tokens)
            {
                var pattern = @"\{\{\s*" + Regex.Escape(kv.Key) + @"\s*\}\}";
                var safeVal = WebUtility.HtmlEncode(kv.Value ?? string.Empty);
                template = Regex.Replace(template, pattern, safeVal, RegexOptions.IgnoreCase);
            }

            return template;
        }
    }
}
