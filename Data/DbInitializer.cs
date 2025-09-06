using LMS.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LMS.Data
{
    public static class DbInitializer
    {
    public static void Seed(LmsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<Microsoft.AspNetCore.Identity.IdentityRole> roleManager)
        {
            context.Database.EnsureCreated();


            // Seed Roles
            string[] roles = new[] { "Admin", "Instructor", "Student" };
            foreach (var role in roles)
            {
                if (!roleManager.RoleExistsAsync(role).Result)
                {
                    roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole(role)).Wait();
                }
            }

            // Seed Users
            if (!context.Users.Any())
            {
                var admin = new ApplicationUser { UserName = "admin", Email = "admin@lms.com" };
                userManager.CreateAsync(admin, "Admin@123").Wait();
                userManager.AddToRoleAsync(admin, "Admin").Wait();
            }

            // Seed Courses
            if (!context.Courses.Any())
            {
                var course = new Course { Title = "Sample Course", Description = "Intro to LMS" };
                context.Courses.Add(course);
                context.SaveChanges();

                // Seed Lessons
                var lesson = new Lesson { Title = "Lesson 1", VideoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", CourseId = course.Id };
                context.Lessons.Add(lesson);
                context.SaveChanges();

                // Seed Quizzes
                var quiz = new Quiz { Question = "What is LMS?", Options = new List<string> { "Learning Management System", "Library Management System", "Logistics Management System" }, CorrectOptionIndex = 0, CourseId = lesson.Id };
                context.Quizzes.Add(quiz);
                context.SaveChanges();
            }

            // Seed Email Templates
            if (!context.EmailTemplates.Any())
            {
                context.EmailTemplates.Add(new LMS.Models.EmailTemplate
                {
                    Key = "ForgotPassword",
                    Subject = "Reset your password",
                    Body = "<p>Hello {{userName}},</p><p>Click <a href=\"{{resetLink}}\">here</a> to reset your password.</p>",
                    CreatedAt = DateTime.UtcNow
                });

                context.EmailTemplates.Add(new LMS.Models.EmailTemplate
                {
                    Key = "WelcomeAfterSignup",
                    Subject = "Welcome to LMS",
                    Body = "<p>Hi {{userName}},</p><p>Welcome to our learning platform. Start by browsing courses.</p>",
                    CreatedAt = DateTime.UtcNow
                });

                context.EmailTemplates.Add(new LMS.Models.EmailTemplate
                {
                    Key = "QuizCompletionCertificate",
                    Subject = "Congratulations - Certificate Available",
                    Body = "<p>Hi {{userName}},</p><p>You completed {{courseName}}. Download your certificate <a href=\"{{certificateLink}}\">here</a>.</p>",
                    CreatedAt = DateTime.UtcNow
                });

                context.SaveChanges();
            }
        }
    }
}
