using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using LMS.Models;

namespace LMS.Data
{
    public class LmsDbContext : IdentityDbContext<ApplicationUser>
    {
        public LmsDbContext(DbContextOptions<LmsDbContext> options) : base(options) { }

        public DbSet<Course> Courses { get; set; }
        public DbSet<Lesson> Lessons { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<LessonProgress> LessonProgresses { get; set; }
        public DbSet<LessonReview> LessonReviews { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<QuizResult> QuizResults { get; set; }

        // Users and Roles are provided by IdentityDbContext<ApplicationUser> (inherited).
        // Do not redeclare Users or Roles here to avoid hiding inherited members.

        public DbSet<UserCourse> UserCourses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<UserCourse>()
                .HasIndex(uc => new { uc.UserId, uc.CourseId })
                .IsUnique();
        }
    }
}
