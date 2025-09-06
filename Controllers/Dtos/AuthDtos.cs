using System;

namespace LMS.Controllers.Dtos
{
    public class ApprovalRequest
    {
        public string ApprovalStatus { get; set; } = "Approved";
    }

    public class ForgotPasswordRequest { public string Email { get; set; } = string.Empty; }
    public class ResetWithTokenRequest { public string UserId { get; set; } = string.Empty; public string Token { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }

    public class MailSettings
    {
        public string SmtpHost { get; set; } = string.Empty;
        public int SmtpPort { get; set; } = 25;
        public bool EnableSsl { get; set; } = false;
        public string? User { get; set; }
        public string? Password { get; set; }
        public string? From { get; set; }
    }

    public class PublicRegisterRequest
    {
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
    }

    public class CreateUserRequest
    {
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class AdminResetPasswordRequest { public string UserId { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}
