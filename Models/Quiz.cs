using System.Collections.Generic;

namespace LMS.Models
{
    public class Quiz
    {
    public int Id { get; set; }
    public int CourseId { get; set; } // Changed from LessonId to CourseId
    public string? Question { get; set; }
    public List<string>? Options { get; set; }
    public int CorrectOptionIndex { get; set; }
    public bool Published { get; set; }

    }

    public class Question
    {
        public int Id { get; set; }
    public string? Text { get; set; }
        public List<string> Options { get; set; } = new List<string>();
        public int CorrectOption { get; set; }
    }
}
