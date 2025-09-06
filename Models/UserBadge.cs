using System;

namespace LMS.Models
{
    public class UserBadge
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int BadgeId { get; set; }
        public DateTime AwardedAt { get; set; } = DateTime.UtcNow;
    }
}
