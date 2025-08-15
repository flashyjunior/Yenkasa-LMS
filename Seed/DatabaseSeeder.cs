using System;
using System.Linq;
using LMS.Data;
using LMS.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Seed
{
    public static class DatabaseSeeder
    {
        public static void Seed(LmsDbContext context)
        {
            // Seed Roles
            if (!context.Roles.Any())
            {
                context.Roles.AddRange(
                    new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Admin", NormalizedName = "ADMIN" },
                    new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Instructor", NormalizedName = "INSTRUCTOR" },
                    new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Student", NormalizedName = "STUDENT" }
                );
                context.SaveChanges();
            }

            // Seed Courses
            if (!context.Courses.Any())
            {
                context.Courses.Add(new Course
                {
                    Title = "Sample Course",
                    Description = "This is a sample course.",
                    Published = true,
                    ApprovalStatus = "Approved"
                });
                context.SaveChanges();
            }

            // Seed Lessons
            if (!context.Lessons.Any())
            {
                var course = context.Courses.First();
                context.Lessons.Add(new Lesson
                {
                    Title = "Sample Lesson",
                    Content = "Lesson content goes here.",
                    CourseId = course.Id,
                    Published = true,
                    ApprovalStatus = "Approved",
                    DatePublished = DateTime.UtcNow,
                    VideoUrl = "https://sample.com/video.mp4"
                });
                context.SaveChanges();
            }

            // Seed Quizzes
            if (!context.Quizzes.Any())
            {
                var lesson = context.Lessons.First();
                context.Quizzes.Add(new Quiz
                {
                    LessonId = lesson.Id,
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectOptionIndex = 1
                });
                context.SaveChanges();
            }

            // Seed Questions
            if (!context.Questions.Any())
            {
                context.Questions.Add(new Question
                {
                    Text = "What is 2+2?",
                    Options = new List<string> { "2", "3", "4", "5" },
                    CorrectOption = 2
                });
                context.SaveChanges();
            }
        }
    }
}
