using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace LMS.Models
{
    public class LessonReview
    {
        public int Id { get; set; }
        public int LessonId { get; set; }
        public string? UserId { get; set; }
        public int Rating { get; set; } // 1-5
        public string? Review { get; set; }
        public DateTime Date { get; set; }
    }
    public class User : IdentityUser
    {
        public bool IsAdmin { get; set; }
        // public List<UserProgress>? Progress { get; set; } // UserProgress not defined
    }


    public class Course
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public List<Lesson>? Lessons { get; set; }
        public bool Published { get; set; } = false;
        public string ApprovalStatus { get; set; } = "Pending"; // Pending, Approved, Rejected
    }


    public class Lesson
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; } // Added for lesson content
        public string? VideoUrl { get; set; }
        public int CourseId { get; set; }
        public List<Quiz>? Quizzes { get; set; }
        public bool Published { get; set; } = false;
        public DateTime DatePublished { get; set; }
        public string ApprovalStatus { get; set; } = "Pending"; // Pending, Approved, Rejected
        public int PassMark { get; set; } = 50; // Default pass mark
        public int? Duration { get; set; }
    }

    public class QuizResult
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public int LessonId { get; set; }
        public string? AnswersJson { get; set; }
        public string? ResultsJson { get; set; }
        public int Score { get; set; }
        public string? Grade { get; set; }
        public int PassMark { get; set; }
        public bool Passed { get; set; }
        public DateTime DateTaken { get; set; }
    }
    
    public class UserCourse
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty; // stores username (string) per project choice
        public int CourseId { get; set; }
        public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
    }

}



