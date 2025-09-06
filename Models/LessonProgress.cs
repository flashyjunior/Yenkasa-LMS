using System;

namespace LMS.Models
{
    public class LessonProgress
    {
        public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
        public int LessonId { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}
