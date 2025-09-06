using Microsoft.AspNetCore.Identity;
using LMS.Models;
using LMS.Seed;

namespace LMS.Data
{
    public static class SeedData
    {
        public static async Task Initialize(IServiceProvider serviceProvider)
        {
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // Create roles if they don't exist
            string[] roleNames = { "Admin", "Instructor", "Student" };
            foreach (var roleName in roleNames)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }

            // Create default admin user
            var adminEmail = "admin@lms.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = "admin",
                    Email = adminEmail,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(adminUser, "Admin123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                }
            }

            // Create default instructor user
            var instructorEmail = "instructor@lms.com";
            var instructorUser = await userManager.FindByEmailAsync(instructorEmail);
            
            if (instructorUser == null)
            {
                instructorUser = new ApplicationUser
                {
                    UserName = "instructor",
                    Email = instructorEmail,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(instructorUser, "Instructor123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(instructorUser, "Instructor");
                }
            }

            // Create default student user
            var studentEmail = "student@lms.com";
            var studentUser = await userManager.FindByEmailAsync(studentEmail);
            
            if (studentUser == null)
            {
                studentUser = new ApplicationUser
                {
                    UserName = "student",
                    Email = studentEmail,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(studentUser, "Student123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(studentUser, "Student");
                }
            }

            // Run the older DbInitializer.Seed to populate courses, lessons, quizzes and our new email templates
            try
            {
                var context = serviceProvider.GetRequiredService<LmsDbContext>();
                var userManagerSvc = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                var roleManagerSvc = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
                // Call new initializer that seeds courses and email templates
                LMS.Data.DbInitializer.Seed(context, userManagerSvc, roleManagerSvc);
            }
            catch
            {
                // ignore seeding errors here; environment may not have DB available at this point
            }
        }
    }
}
