using System;
using System.Linq;
using System.Text.Json;
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
            // if (!context.Roles.Any())
            // {
            //     context.Roles.AddRange(
            //         new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Admin", NormalizedName = "ADMIN" },
            //         new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Instructor", NormalizedName = "INSTRUCTOR" },
            //         new Microsoft.AspNetCore.Identity.IdentityRole { Name = "Student", NormalizedName = "STUDENT" }
            //     );
            //     context.SaveChanges();
            // }

            // // Seed Privileges and mappings
            // if (!context.Privileges.Any())
            // {
            //     context.Privileges.AddRange(
            //         new Models.Privilege { Name = "ViewAdminMenu", Description = "See admin menus" },
            //         new LMS.Models.Privilege { Name = "ManageCourses", Description = "Create and manage courses" },
            //         new LMS.Models.Privilege { Name = "ManageQuizzes", Description = "Create and manage quizzes" },
            //         new LMS.Models.Privilege { Name = "ApproveContent", Description = "Approve content" }
            //     );
            //     // Configuration submenu
            //     context.Privileges.AddRange(
            //         new LMS.Models.Privilege { Name = "ManageCertificateAssets", Description = "Manage certificate images and assets" },
            //         new LMS.Models.Privilege { Name = "ManageAnnouncements", Description = "Manage site announcements" },
            //         new LMS.Models.Privilege { Name = "ManageBadges", Description = "Create and manage badges" },
            //         new LMS.Models.Privilege { Name = "ManageSmtp", Description = "Edit SMTP and email sending settings" },
            //         new LMS.Models.Privilege { Name = "ManageEmailTemplates", Description = "Edit system email templates" }
            //     );
            //     // Security submenu
            //     context.Privileges.AddRange(
            //         new LMS.Models.Privilege { Name = "ManageUsers", Description = "Create and manage users" },
            //         new LMS.Models.Privilege { Name = "ManageRolePrivileges", Description = "Manage role privilege assignments" }
            //     );
            //     context.SaveChanges();
            // }

            // if (!context.RolePrivileges.Any())
            // {
            //     // Build a map of privilege name -> id
            //     var privMap = context.Privileges.ToDictionary(p => p.Name ?? string.Empty, p => p.Id);

            //     void AddRolePriv(string role, string privilegeName)
            //     {
            //         if (string.IsNullOrWhiteSpace(privilegeName)) return;
            //         if (!privMap.ContainsKey(privilegeName)) return;
            //         var pid = privMap[privilegeName];
            //         if (!context.RolePrivileges.Any(rp => rp.RoleName == role && rp.PrivilegeId == pid))
            //         {
            //             context.RolePrivileges.Add(new LMS.Models.RolePrivilege { RoleName = role, PrivilegeId = pid, PrivilegeName = privilegeName });
            //         }
            //     }

            //     // Admin gets everything: assign every privilege in the Privileges table to Admin by default
            //     foreach (var pname in privMap.Keys)
            //     {
            //         AddRolePriv("Admin", pname);
            //     }
            //     // Instructor gets most
            //     AddRolePriv("Instructor", "ViewAdminMenu");
            //     AddRolePriv("Instructor", "ManageCourses");
            //     AddRolePriv("Instructor", "ManageQuizzes");
            //     // By default do not give instructors security/config management privileges
            //     // Student gets none by default
            //     context.SaveChanges();
            // }

            // // Seed Courses (Sexual and Reproductive Health focused)
            // try
            // {
            //     var desiredCourses = new[] {
            //         new { Title = "Introduction to Sexual and Reproductive Health", Description = "Essential knowledge on sexual and reproductive health, rights and responsibilities." },
            //         new { Title = "Adolescent Sexual Health", Description = "Guidance on adolescent sexual health, consent, relationships and safe behaviours." },
            //         new { Title = "Family Planning and Contraception", Description = "Methods of contraception, counselling, and family planning choices." },
            //         new { Title = "STI Prevention and Treatment", Description = "Information on common STIs, prevention strategies and treatment options." },
            //         new { Title = "Maternal Health & Pregnancy", Description = "Care during pregnancy, antenatal services and safe delivery practices." },
            //         new { Title = "Gender, Sexuality & Identity", Description = "Understanding gender, sexuality, identity and respectful inclusivity." },
            //         new { Title = "Mental Health & Sexual Wellbeing", Description = "Mental health topics related to relationships, self-care and sexual wellbeing." }
            //     };

            //     foreach (var cinfo in desiredCourses)
            //     {
            //         var exists = context.Courses.Any(c => c.Title == cinfo.Title);
            //         if (!exists)
            //         {
            //             Console.WriteLine($"Seeding course: {cinfo.Title}");
            //             context.Courses.Add(new Course { Title = cinfo.Title, Description = cinfo.Description, Published = true, ApprovalStatus = "Approved" });
            //         }
            //     }
            //     context.SaveChanges();

            //     // Ensure lessons exist for the seeded courses
            //     var intro = context.Courses.FirstOrDefault(c => c.Title == "Introduction to Sexual and Reproductive Health");
            //     var adolescent = context.Courses.FirstOrDefault(c => c.Title == "Adolescent Sexual Health");
            //     var family = context.Courses.FirstOrDefault(c => c.Title == "Family Planning and Contraception");

            //     // New courses added
            //     var sti = context.Courses.FirstOrDefault(c => c.Title == "STI Prevention and Treatment");
            //     var maternal = context.Courses.FirstOrDefault(c => c.Title == "Maternal Health & Pregnancy");
            //     var gender = context.Courses.FirstOrDefault(c => c.Title == "Gender, Sexuality & Identity");
            //     var mental = context.Courses.FirstOrDefault(c => c.Title == "Mental Health & Sexual Wellbeing");

            //     if (intro != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "SRH Basics" && l.CourseId == intro.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: SRH Basics");
            //             context.Lessons.Add(new Lesson { Title = "SRH Basics", Content = "What SRH means; anatomy; common terms.", CourseId = intro.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Rights and Consent" && l.CourseId == intro.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Rights and Consent");
            //             context.Lessons.Add(new Lesson { Title = "Rights and Consent", Content = "Understanding consent, rights and respectful relationships.", CourseId = intro.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     if (adolescent != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Puberty & Changes" && l.CourseId == adolescent.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Puberty & Changes");
            //             context.Lessons.Add(new Lesson { Title = "Puberty & Changes", Content = "Physical and emotional changes during puberty.", CourseId = adolescent.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Healthy Relationships" && l.CourseId == adolescent.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Healthy Relationships");
            //             context.Lessons.Add(new Lesson { Title = "Healthy Relationships", Content = "Communication and boundaries.", CourseId = adolescent.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     if (family != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Contraceptive Options" && l.CourseId == family.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Contraceptive Options");
            //             context.Lessons.Add(new Lesson { Title = "Contraceptive Options", Content = "Overview of condoms, pills, implants, IUDs and sterilization.", CourseId = family.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Counselling and Access" && l.CourseId == family.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Counselling and Access");
            //             context.Lessons.Add(new Lesson { Title = "Counselling and Access", Content = "How to access family planning services and counselling.", CourseId = family.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     // Seed lessons for the newer courses
            //     if (sti != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Common STIs" && l.CourseId == sti.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Common STIs");
            //             context.Lessons.Add(new Lesson { Title = "Common STIs", Content = "Overview of common sexually transmitted infections, symptoms and prevention.", CourseId = sti.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Testing & Treatment" && l.CourseId == sti.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Testing & Treatment");
            //             context.Lessons.Add(new Lesson { Title = "Testing & Treatment", Content = "Where and how to get tested, treatment options and follow-up.", CourseId = sti.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     if (maternal != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Antenatal Care" && l.CourseId == maternal.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Antenatal Care");
            //             context.Lessons.Add(new Lesson { Title = "Antenatal Care", Content = "Importance of antenatal visits, nutrition and screening.", CourseId = maternal.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Safe Delivery" && l.CourseId == maternal.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Safe Delivery");
            //             context.Lessons.Add(new Lesson { Title = "Safe Delivery", Content = "Delivery options, birth preparedness and postpartum care.", CourseId = maternal.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     if (gender != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Understanding Gender" && l.CourseId == gender.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Understanding Gender");
            //             context.Lessons.Add(new Lesson { Title = "Understanding Gender", Content = "Basics of gender identity and sexual orientation.", CourseId = gender.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Inclusive Practice" && l.CourseId == gender.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Inclusive Practice");
            //             context.Lessons.Add(new Lesson { Title = "Inclusive Practice", Content = "How to create inclusive and respectful environments.", CourseId = gender.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     if (mental != null)
            //     {
            //         if (!context.Lessons.Any(l => l.Title == "Relationships & Mental Health" && l.CourseId == mental.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Relationships & Mental Health");
            //             context.Lessons.Add(new Lesson { Title = "Relationships & Mental Health", Content = "How relationships affect mental wellbeing and coping strategies.", CourseId = mental.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //         if (!context.Lessons.Any(l => l.Title == "Self-care & Boundaries" && l.CourseId == mental.Id))
            //         {
            //             Console.WriteLine("Seeding lesson: Self-care & Boundaries");
            //             context.Lessons.Add(new Lesson { Title = "Self-care & Boundaries", Content = "Practical self-care and setting healthy boundaries.", CourseId = mental.Id, Published = true, ApprovalStatus = "Approved", DatePublished = DateTime.UtcNow });
            //         }
            //     }
            //     context.SaveChanges();

            //     // Seed Quizzes for some lessons if missing
            //     var srhBasicsLesson = context.Lessons.FirstOrDefault(l => l.Title == "SRH Basics");
            //     var contraceptionLesson = context.Lessons.FirstOrDefault(l => l.Title == "Contraceptive Options");
            //     var commonStisLesson = context.Lessons.FirstOrDefault(l => l.Title == "Common STIs");
            //     var antenatalLesson = context.Lessons.FirstOrDefault(l => l.Title == "Antenatal Care");
            //     if (srhBasicsLesson != null && !context.Quizzes.Any(q => q.LessonId == srhBasicsLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for SRH Basics");
            //         context.Quizzes.Add(new Quiz { LessonId = srhBasicsLesson.Id, Options = new List<string> { "Sexual Reproductive Health", "Sports Medicine", "Computer Science", "Nutrition" }, CorrectOptionIndex = 0 });
            //     }
            //     if (contraceptionLesson != null && !context.Quizzes.Any(q => q.LessonId == contraceptionLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Contraceptive Options");
            //         context.Quizzes.Add(new Quiz { LessonId = contraceptionLesson.Id, Options = new List<string> { "Condoms", "Pills", "Implants", "IUD" }, CorrectOptionIndex = 0 });
            //     }
            //     if (commonStisLesson != null && !context.Quizzes.Any(q => q.LessonId == commonStisLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Common STIs");
            //         context.Quizzes.Add(new Quiz { LessonId = commonStisLesson.Id, Options = new List<string> { "Chlamydia", "Hypertension", "Migraine", "Asthma" }, CorrectOptionIndex = 0 });
            //     }
            //     if (antenatalLesson != null && !context.Quizzes.Any(q => q.LessonId == antenatalLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Antenatal Care");
            //         context.Quizzes.Add(new Quiz { LessonId = antenatalLesson.Id, Options = new List<string> { "Regular checkups", "Avoid rest", "Skip supplements", "Ignore symptoms" }, CorrectOptionIndex = 0 });
            //     }
            //     // additional quizzes for other lessons
            //     var rightsLesson = context.Lessons.FirstOrDefault(l => l.Title == "Rights and Consent");
            //     if (rightsLesson != null && !context.Quizzes.Any(q => q.LessonId == rightsLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Rights and Consent");
            //         context.Quizzes.Add(new Quiz { LessonId = rightsLesson.Id, Options = new List<string> { "Consent must be enthusiastic", "Consent is implied", "Consent once covers everything", "Consent by silence" }, CorrectOptionIndex = 0 });
            //     }
            //     var healthyRel = context.Lessons.FirstOrDefault(l => l.Title == "Healthy Relationships");
            //     if (healthyRel != null && !context.Quizzes.Any(q => q.LessonId == healthyRel.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Healthy Relationships");
            //         context.Quizzes.Add(new Quiz { LessonId = healthyRel.Id, Options = new List<string> { "Communication", "Isolation", "Avoiding responsibility", "Ignoring boundaries" }, CorrectOptionIndex = 0 });
            //     }
            //     var testingLesson = context.Lessons.FirstOrDefault(l => l.Title == "Testing & Treatment");
            //     if (testingLesson != null && !context.Quizzes.Any(q => q.LessonId == testingLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Testing & Treatment");
            //         context.Quizzes.Add(new Quiz { LessonId = testingLesson.Id, Options = new List<string> { "Visit a clinic for testing", "Self-diagnose only", "Never inform partners", "Ignore symptoms" }, CorrectOptionIndex = 0 });
            //     }
            //     var safeDeliveryLesson = context.Lessons.FirstOrDefault(l => l.Title == "Safe Delivery");
            //     if (safeDeliveryLesson != null && !context.Quizzes.Any(q => q.LessonId == safeDeliveryLesson.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Safe Delivery");
            //         context.Quizzes.Add(new Quiz { LessonId = safeDeliveryLesson.Id, Options = new List<string> { "Birth preparedness", "No antenatal care", "Avoid hospital births always", "Ignore danger signs" }, CorrectOptionIndex = 0 });
            //     }
            //     var genderUnderstanding = context.Lessons.FirstOrDefault(l => l.Title == "Understanding Gender");
            //     if (genderUnderstanding != null && !context.Quizzes.Any(q => q.LessonId == genderUnderstanding.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Understanding Gender");
            //         context.Quizzes.Add(new Quiz { LessonId = genderUnderstanding.Id, Options = new List<string> { "Gender identity and expression", "Only one valid gender", "Gender equals anatomy only", "Gender never changes" }, CorrectOptionIndex = 0 });
            //     }
            //     var relMental = context.Lessons.FirstOrDefault(l => l.Title == "Relationships & Mental Health");
            //     if (relMental != null && !context.Quizzes.Any(q => q.LessonId == relMental.Id))
            //     {
            //         Console.WriteLine("Seeding quiz for Relationships & Mental Health");
            //         context.Quizzes.Add(new Quiz { LessonId = relMental.Id, Options = new List<string> { "Ask for help and communicate", "Keep everything secret", "Use substances to cope", "Avoid self-care" }, CorrectOptionIndex = 0 });
            //     }
            //     context.SaveChanges();
            // }
            // catch (Exception ex)
            // {
            //     Console.WriteLine($"DatabaseSeeder error: {ex.Message}");
            //     // swallow to avoid crashing startup but log the error
            // }

            // // Seed Lessons
            // if (!context.Lessons.Any())
            // {
            //     var course = context.Courses.First();
            //     context.Lessons.Add(new Lesson
            //     {
            //         Title = "Sample Lesson",
            //         Content = "Lesson content goes here.",
            //         CourseId = course.Id,
            //         Published = true,
            //         ApprovalStatus = "Approved",
            //         DatePublished = DateTime.UtcNow,
            //         VideoUrl = "https://sample.com/video.mp4"
            //     });
            //     context.SaveChanges();
            // }

            // // Seed Quizzes
            // if (!context.Quizzes.Any())
            // {
            //     var lesson = context.Lessons.First();
            //     context.Quizzes.Add(new Quiz
            //     {
            //         LessonId = lesson.Id,
            //         Options = new List<string> { "A", "B", "C", "D" },
            //         CorrectOptionIndex = 1
            //     });
            //     context.SaveChanges();
            // }

            // // Seed Questions (idempotent - add multiple useful demo questions)
            // var questionsToAdd = new[] {
            //     new Question { Text = "What is 2+2?", Options = new List<string>{ "2","3","4","5" }, CorrectOption = 2 },
            //     new Question { Text = "Which is a common STI?", Options = new List<string>{ "Chlamydia","Hypertension","Migraine","Allergy" }, CorrectOption = 0 },
            //     new Question { Text = "What is the best practice for consent?", Options = new List<string>{ "Enthusiastic yes","Assume it","One-time consent covers all","Consent by silence" }, CorrectOption = 0 },
            //     new Question { Text = "Antenatal care includes:", Options = new List<string>{ "Regular checkups","Skipping tests","Ignoring nutrition","Avoiding supplements" }, CorrectOption = 0 },
            //     new Question { Text = "A healthy relationship relies on:", Options = new List<string>{ "Communication","Isolation","Coercion","Avoidance" }, CorrectOption = 0 }
            // };

            // foreach (var q in questionsToAdd)
            // {
            //     if (!context.Questions.Any(x => x.Text == q.Text))
            //     {
            //         Console.WriteLine($"Seeding question: {q.Text}");
            //         context.Questions.Add(q);
            //     }
            // }
            // context.SaveChanges();

            // // Seed a QuizResult for testing (link to a student user if present)
            // if (!context.QuizResults.Any())
            // {
            //     // prefer user with username 'student' if seeded by identity; otherwise pick first user
            //     var user = context.Users.FirstOrDefault(u => u.UserName == "student") ?? context.Users.FirstOrDefault();
            //     var lesson = context.Lessons.FirstOrDefault();
            //     if (user != null && lesson != null)
            //     {
            //         var answers = new Dictionary<int, int?> { { 1, 1 } };
            //         var results = new Dictionary<int, bool> { { 1, true } };
            //         context.QuizResults.Add(new QuizResult
            //         {
            //             UserId = user.Id,
            //             LessonId = lesson.Id,
            //             AnswersJson = JsonSerializer.Serialize(answers),
            //             ResultsJson = JsonSerializer.Serialize(results),
            //             Score = 100,
            //             Grade = "A",
            //             PassMark = 50,
            //             Passed = true,
            //             DateTaken = DateTime.UtcNow.AddDays(-1)
            //         });
            //         context.SaveChanges();
            //     }
            // }

            // // Seed sample UserCourse enrollments and instructor associations (idempotent)
            // try
            // {
            //     // find user ids by username
            //     var studentUser = context.Users.FirstOrDefault(u => u.UserName == "student");
            //     var instructorUser = context.Users.FirstOrDefault(u => u.UserName == "instructor");

            //     // pick a few courses to enroll the student in
            //     var c1 = context.Courses.FirstOrDefault(c => c.Title == "Introduction to Sexual and Reproductive Health");
            //     var c2 = context.Courses.FirstOrDefault(c => c.Title == "Family Planning and Contraception");
            //     var c3 = context.Courses.FirstOrDefault(c => c.Title == "STI Prevention and Treatment");

            //     if (studentUser != null)
            //     {
            //         var stuUserName = studentUser.UserName!; // already checked not null above by existence
            //         void EnsureEnrollment(string userId, int courseId)
            //         {
            //             // UserCourse.UserId stores username in this project; check unique index
            //             if (!context.UserCourses.Any(uc => uc.UserId == userId && uc.CourseId == courseId))
            //             {
            //                 Console.WriteLine($"Seeding UserCourse for {userId} -> {courseId}");
            //                 context.UserCourses.Add(new UserCourse { UserId = userId, CourseId = courseId, SubscribedAt = DateTime.UtcNow });
            //             }
            //         }

            //         if (c1 != null) EnsureEnrollment(stuUserName, c1.Id);
            //         if (c2 != null) EnsureEnrollment(stuUserName, c2.Id);
            //         if (c3 != null) EnsureEnrollment(stuUserName, c3.Id);
            //     }

            //     // Instructor association: we don't have a native Instructor->Course FK; we will insert a UserCourse row where UserId is instructor username to denote assignment
            //     if (instructorUser != null)
            //     {
            //         var instrUserName = instructorUser.UserName!;
            //         if (c1 != null && !context.UserCourses.Any(uc => uc.UserId == instrUserName && uc.CourseId == c1.Id))
            //         {
            //             Console.WriteLine($"Assigning instructor {instrUserName} to course {c1.Title}");
            //             context.UserCourses.Add(new UserCourse { UserId = instrUserName, CourseId = c1.Id, SubscribedAt = DateTime.UtcNow });
            //         }
            //         if (c2 != null && !context.UserCourses.Any(uc => uc.UserId == instrUserName && uc.CourseId == c2.Id))
            //         {
            //             Console.WriteLine($"Assigning instructor {instrUserName} to course {c2.Title}");
            //             context.UserCourses.Add(new UserCourse { UserId = instrUserName, CourseId = c2.Id, SubscribedAt = DateTime.UtcNow });
            //         }
            //     }

            //     context.SaveChanges();
            // }
            // catch (Exception ex)
            // {
            //     Console.WriteLine($"UserCourse seeding error: {ex.Message}");
            // }
        }
    }
}
