using Microsoft.AspNetCore.Identity;

namespace LMS.Models
{
    public class ApplicationUser : IdentityUser
    {
    // Whether the user is active. When false the user should not be able to login.
    public bool IsActive { get; set; } = true;

    // Optional full name to display in UI
    public string? FullName { get; set; }

    // URL to profile image
    public string? ProfileImageUrl { get; set; }
    }
}
