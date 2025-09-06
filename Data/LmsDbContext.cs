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
    public DbSet<LMS.Models.EmailTemplate> EmailTemplates { get; set; }
    public DbSet<LMS.Models.SmtpConfig> SmtpConfigs { get; set; }
    // Q&A
    public DbSet<LMS.Models.LessonQuestion> LessonQuestions { get; set; }
    public DbSet<LMS.Models.QuestionReply> QuestionReplies { get; set; }
    public DbSet<LMS.Models.ReplyVote> ReplyVotes { get; set; }
    public DbSet<LMS.Models.CommentReport> CommentReports { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<LessonProgress> LessonProgresses { get; set; }
        public DbSet<LessonReview> LessonReviews { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<QuizResult> QuizResults { get; set; }
    public DbSet<LMS.Models.CourseMaterial> CourseMaterials { get; set; }

    // Badges
    public DbSet<LMS.Models.Badge> Badges { get; set; }
    public DbSet<LMS.Models.UserBadge> UserBadges { get; set; }

    // Privilege tables
    public DbSet<LMS.Models.Privilege> Privileges { get; set; }
    public DbSet<LMS.Models.RolePrivilege> RolePrivileges { get; set; }

        // Users and Roles are provided by IdentityDbContext<ApplicationUser> (inherited).
        // Do not redeclare Users or Roles here to avoid hiding inherited members.

        public DbSet<UserCourse> UserCourses { get; set; }
        public DbSet<CourseReview> CourseReviews { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<UserCourse>()
                .HasIndex(uc => new { uc.UserId, uc.CourseId })
                .IsUnique();

            modelBuilder.Entity<LMS.Models.CourseMaterial>()
                .HasIndex(cm => cm.CourseId)
                .HasDatabaseName("IX_CourseMaterials_CourseId");

            // Configure Course string lengths so SQL Server doesn't map to nvarchar(max)
            modelBuilder.Entity<Course>(eb =>
            {
                eb.Property(c => c.Title).HasMaxLength(200);
                eb.Property(c => c.Description).HasMaxLength(2000);
                eb.HasIndex(c => c.Title).HasDatabaseName("IX_Courses_Title");
            });

            // Configure RolePrivilege -> Privilege FK relationship
            modelBuilder.Entity<RolePrivilege>()
                .HasOne(rp => rp.Privilege)
                .WithMany()
                .HasForeignKey(rp => rp.PrivilegeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RolePrivilege>()
                .HasIndex(rp => new { rp.RoleName, rp.PrivilegeId })
                .IsUnique();

            modelBuilder.Entity<LMS.Models.EmailTemplate>()
                .HasIndex(et => et.Key)
                .IsUnique();

            modelBuilder.Entity<LMS.Models.SmtpConfig>()
                .HasIndex(sc => sc.SmtpHost);
        }
    }
}
