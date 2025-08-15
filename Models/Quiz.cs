using System.Collections.Generic;

namespace LMS.Models
{
    public class Quiz
    {
        public int Id { get; set; }
        public string? Question { get; set; }
        public List<string> Options { get; set; } = new List<string>();
        public int CorrectOptionIndex { get; set; }
        public int LessonId { get; set; }
        public bool Published { get; set; } = false;

    }

    public class Question
    {
        public int Id { get; set; }
    public string? Text { get; set; }
        public List<string> Options { get; set; } = new List<string>();
        public int CorrectOption { get; set; }
    }
}
