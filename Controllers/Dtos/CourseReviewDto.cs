using System;

namespace LMS.Controllers.Dtos
{
    public class CourseReviewDto
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? UserName { get; set; }
        public string? FullName { get; set; }
    }
}