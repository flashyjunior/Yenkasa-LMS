using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
    [MaxLength(200)]
    public string? Title { get; set; }
    [MaxLength(2000)]
    public string? Description { get; set; }
        public List<Lesson>? Lessons { get; set; }
        public bool Published { get; set; } = false;
        public string ApprovalStatus { get; set; } = "Pending"; // Pending, Approved, Rejected
    // optional thumbnail image URL
    public string? ThumbnailUrl { get; set; }
    // username of the facilitator who created the course
    public string? CreatedBy { get; set; }
    }


    public class Lesson
    {
        public int Id { get; set; }
    [MaxLength(200)]
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
        public int CourseId { get; set; }
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

    public class CourseMaterial
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public string? FileName { get; set; }
        public string? FilePath { get; set; }
        public string? ContentType { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public string? UploadedBy { get; set; }
    }

    // Q&A models for lesson questions and replies
    public class LessonQuestion
    {
        public int Id { get; set; }
        public int LessonId { get; set; }
        public int CourseId { get; set; }
        public string? Title { get; set; }
        public string? Body { get; set; }
        public string? UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class QuestionReply
    {
        public int Id { get; set; }
        public int QuestionId { get; set; }
        public string? Body { get; set; }
        public string? UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // Tracks per-user upvotes on replies so we can prevent duplicate votes
    public class ReplyVote
    {
        public int Id { get; set; }
        public int ReplyId { get; set; }
        public string? UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // Abuse reports for either questions or replies. TargetType = "question" or "reply"
    public class CommentReport
    {
        public int Id { get; set; }
        public string TargetType { get; set; } = "reply"; // "question" or "reply"
        public int TargetId { get; set; }
        public string? ReporterUserId { get; set; }
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Moderation fields
    public bool IsResolved { get; set; } = false;
    public string? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    }

    // Email template storage for admin-editable templates
    public class EmailTemplate
    {
        public int Id { get; set; }
        // internal key used to reference template in code (e.g. "ForgotPassword")
        public string? Key { get; set; }
        public string? Subject { get; set; }
        public string? Body { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    // Persisted SMTP config (optional) for runtime editing
    public class SmtpConfig
    {
        public int Id { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(200)]
    public string? SmtpHost { get; set; }
        public int SmtpPort { get; set; } = 587;
        public bool EnableSsl { get; set; } = true;
        public string? User { get; set; }
        public string? Password { get; set; }
        public string? From { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

}



