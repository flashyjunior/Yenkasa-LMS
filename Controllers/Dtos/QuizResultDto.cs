namespace LMS.Controllers.Dtos
{
    public class QuizResultDto
    {
        public string? UserId { get; set; }
        public int CourseId { get; set; }
        public List<string>? Answers { get; set; }
        public object? Results { get; set; }
        public int Score { get; set; }
        public string? Grade { get; set; }
        public int PassMark { get; set; }
        public bool Passed { get; set; }
    }
}