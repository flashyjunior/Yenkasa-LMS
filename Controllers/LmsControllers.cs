using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LMS.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using LMS.Data;

namespace LMS.Controllers
{
	[ApiController]
	[Route("api/lms")]
	public class LmsController : ControllerBase
	{
		// AUTHENTICATION ENDPOINT
		[HttpPost("login")]
		[AllowAnonymous]
		public async Task<IActionResult> Login(
			[FromBody] LMS.Models.LoginRequest req,
			[FromServices] UserManager<ApplicationUser> userManager,
			[FromServices] SignInManager<ApplicationUser> signInManager,
			[FromServices] IConfiguration config,
			[FromServices] LMS.Data.LmsDbContext context)
		{
			if (string.IsNullOrEmpty(req.Username) || string.IsNullOrEmpty(req.Password))
				return BadRequest("Username and password are required");
			var user = await userManager.FindByNameAsync(req.Username);
			if (user == null)
				return NotFound("User not found or credentials are incorrect");
			// block inactive users
			if (!user.IsActive) return Unauthorized("User is inactive");
			var result = await signInManager.CheckPasswordSignInAsync(user, req.Password, false);
			if (!result.Succeeded)
				return NotFound("User not found or credentials are incorrect");
			// Create JWT with role claims
			var roles = await userManager.GetRolesAsync(user);
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
				new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty)
			};
			foreach (var role in roles)
			{
				claims.Add(new Claim(ClaimTypes.Role, role));
			}
			var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? string.Empty));
			var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
			var token = new JwtSecurityToken(
				issuer: config["Jwt:Issuer"],
				audience: config["Jwt:Audience"],
				claims: claims,
				expires: DateTime.Now.AddHours(2),
				signingCredentials: creds
			);
			var jwt = new JwtSecurityTokenHandler().WriteToken(token);
			// Issue refresh token
			var refreshToken = new LMS.Models.RefreshToken
			{
				Token = Guid.NewGuid().ToString(),
				UserId = user.Id,
				Expires = DateTime.UtcNow.AddDays(7)
			};
			context.RefreshTokens.Add(refreshToken);
			await context.SaveChangesAsync();
			return Ok(new { token = jwt, refreshToken = refreshToken.Token, userName = user.UserName, fullName = user.FullName, profileImageUrl = user.ProfileImageUrl });
		}

		// Return current authenticated user's profile
		[HttpGet("users/me")]
		[Authorize]
		public async Task<IActionResult> GetCurrentUser([FromServices] UserManager<ApplicationUser> userManager)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			var user = await userManager.FindByIdAsync(userId);
			if (user == null) return NotFound();
			var roles = await userManager.GetRolesAsync(user);
			return Ok(new
			{
				id = user.Id,
				userName = user.UserName,
				email = user.Email,
				fullName = user.FullName,
				profileImageUrl = user.ProfileImageUrl,
				roles = roles,
				isActive = user.IsActive
			});
		}

		// ADMIN: Approve or reject a course
		[HttpPost("admin/courses/{id}/approve")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> ApproveCourse(int id, [FromBody] ApprovalRequest req, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			course.ApprovalStatus = req.ApprovalStatus;
			await context.SaveChangesAsync();
			return Ok(course);
		}

		// ADMIN: Approve or reject a lesson
		[HttpPost("admin/lessons/{id}/approve")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> ApproveLesson(int id, [FromBody] ApprovalRequest req, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			lesson.ApprovalStatus = req.ApprovalStatus;
			await context.SaveChangesAsync();
			return Ok(lesson);
		}

		public class ApprovalRequest
		{
			public string ApprovalStatus { get; set; } = "Approved"; // or "Rejected"
		}

		// COURSE CRUD
		[HttpGet("admin/courses")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminCourses([FromServices] LMS.Data.LmsDbContext context)
		{
			return Ok(context.Courses.ToList());
		}
		[HttpGet("courses")]
		public IActionResult GetCourses([FromServices] LMS.Data.LmsDbContext context)
		{
			return Ok(context.Courses.ToList());
		}

		[HttpGet("courses/{id}")]
		public IActionResult GetCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses
				.Where(c => c.Id == id)
				.Select(c => new
				{
					c.Id,
					c.Title,
					c.Description,
					c.Published,
					c.ApprovalStatus,
					// project lessons explicitly so JSON contains an array (empty if none)
					Lessons = context.Lessons
						.Where(l => l.CourseId == c.Id)
						.OrderBy(l => l.Id) // optional
						.Select(l => new
						{
							l.Id,
							l.Title,
							l.Content,
							l.Duration,
							l.Published
						})
						.ToList()
				})
				.FirstOrDefault();

			if (course == null) return NotFound();
			return Ok(course);
		}

		[HttpPost("courses")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult CreateCourse([FromBody] Course course, [FromServices] LMS.Data.LmsDbContext context)
		{
			context.Courses.Add(course);
			context.SaveChanges();
			return Ok(course);
		}

		[HttpPut("courses/{id}")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UpdateCourse(int id, [FromBody] Course updated, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			course.Title = updated.Title;
			course.Description = updated.Description;
			course.Published = updated.Published;
			course.ApprovalStatus = updated.ApprovalStatus;
			context.SaveChanges();
			return Ok(course);
		}

		[HttpGet("admin/courses/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			return Ok(course);
		}

		[HttpDelete("courses/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult DeleteCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			context.Courses.Remove(course);
			context.SaveChanges();
			return Ok();
		}

		// LESSON CRUD
		[HttpGet("lessons")]
		public IActionResult GetLessons([FromServices] LMS.Data.LmsDbContext context)
		{
			var lessons = (from l in context.Lessons
						   join c in context.Courses on l.CourseId equals c.Id into courseGroup
						   from cg in courseGroup.DefaultIfEmpty()
						   select new
						   {
							   l.Id,
							   l.Title,
							   l.Published,
							   l.CourseId,
							   CourseTitle = cg != null ? cg.Title : null
						   }).ToList();
			return Ok(lessons);
		}

		[HttpGet("lessons/{id}")]
		public IActionResult GetLesson(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			return Ok(lesson);
		}

		[HttpPost("lessons")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult CreateLesson([FromBody] Lesson lesson, [FromServices] LMS.Data.LmsDbContext context)
		{
			context.Lessons.Add(lesson);
			context.SaveChanges();
			return Ok(lesson);
		}

		[HttpPut("lessons/{id}")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UpdateLesson(int id, [FromBody] Lesson updated, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			lesson.Title = updated.Title;
			lesson.Content = updated.Content;
			lesson.VideoUrl = updated.VideoUrl;
			lesson.ApprovalStatus = updated.ApprovalStatus;
			lesson.Published = updated.Published;
			lesson.PassMark = updated.PassMark;
			context.SaveChanges();
			return Ok(lesson);
		}

		[HttpGet("lessons/{lessonId}/quiz")]
		public IActionResult GetQuizForLesson(int lessonId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == lessonId);
			if (lesson == null) return NotFound();

			var quizzes = context.Quizzes
				.Where(q => q.LessonId == lessonId)
				.Select(q => new
				{
					q.Id,
					q.Question,
					Options = q.Options,
					q.CorrectOptionIndex
				})
				.ToList();

			return Ok(new
			{
				passMark = lesson.PassMark, // Ensure this property exists in your Lesson model
				quizzes
			});
		}


		[HttpDelete("lessons/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult DeleteLesson(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			context.Lessons.Remove(lesson);
			context.SaveChanges();
			return Ok();
		}

		[HttpPost("lessons/{id}/publish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult PublishLesson(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			lesson.Published = true;
			context.SaveChanges();
			return Ok(lesson);
		}

		[HttpPost("lessons/{id}/unpublish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UnpublishLesson(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == id);
			if (lesson == null) return NotFound();
			lesson.Published = false;
			context.SaveChanges();
			return Ok(lesson);
		}

		// PUBLISH/UNPUBLISH COURSE
		[HttpPost("courses/{id}/publish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult PublishCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			course.Published = true;
			context.SaveChanges();
			return Ok(course);
		}

		[HttpPost("courses/{id}/unpublish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UnpublishCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			course.Published = false;
			context.SaveChanges();
			return Ok(course);
		}

		// USER MANAGEMENT
		[HttpGet("users")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> GetUsers([FromServices] UserManager<ApplicationUser> userManager)
		{
			// Return users with their roles to make frontend rendering straightforward
			var users = userManager.Users.ToList();
			var result = new List<object>();
			foreach (var u in users)
			{
				var roles = await userManager.GetRolesAsync(u);
				result.Add(new {
					id = u.Id,
					userName = u.UserName,
					email = u.Email,
					roles = roles,
					isActive = u.IsActive,
					fullName = u.FullName,
					profileImageUrl = u.ProfileImageUrl
				});
			}
			return Ok(result);
		}

		[HttpGet("users/{id}")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> GetUser(string id, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			// Only allow the user themselves or admins to upload
			var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			var isAdmin = User.IsInRole("Admin");
			if (!isAdmin && callerId != user.Id) return Forbid();
			return Ok(user);
		}

		[HttpPost("users")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> CreateUser([FromBody] ApplicationUser user, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var result = await userManager.CreateAsync(user);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(user);
		}

		[HttpDelete("users/{id}")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> DeleteUser(string id, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			var result = await userManager.DeleteAsync(user);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok();
		}

		// ROLE MANAGEMENT
		[HttpGet("roles")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetRoles([FromServices] RoleManager<IdentityRole> roleManager)
		{
			return Ok(roleManager.Roles.ToList());
		}

		[HttpPost("roles")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> CreateRole([FromBody] IdentityRole role, [FromServices] RoleManager<IdentityRole> roleManager)
		{
			var result = await roleManager.CreateAsync(role);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(role);
		}

		// ADMIN: Create user with password
		public class CreateUserRequest
		{
			public string UserName { get; set; } = string.Empty;
			public string Email { get; set; } = string.Empty;
			public string Password { get; set; } = string.Empty;
			public bool IsActive { get; set; } = true;
			public string? FullName { get; set; }
		}

		[HttpPost("users/create")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> CreateUserWithPassword([FromBody] CreateUserRequest req, [FromServices] UserManager<ApplicationUser> userManager)
		{
			if (string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
				return BadRequest("Username and password are required");
			var user = new ApplicationUser { UserName = req.UserName, Email = req.Email, IsActive = req.IsActive, FullName = req.FullName };
			var result = await userManager.CreateAsync(user, req.Password);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(new { id = user.Id, userName = user.UserName, email = user.Email });
		}

		// Upload profile image for a user (admin or the user themselves)
		[HttpPost("users/{id}/upload-photo")]
		[Authorize]
		public async Task<IActionResult> UploadProfilePhoto(string id, [FromForm] IFormFile file, [FromServices] UserManager<ApplicationUser> userManager)
		{
			if (file == null || file.Length == 0) return BadRequest("No file");
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			// Only allow the user themselves or admins to upload
			var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			var isAdmin = User.IsInRole("Admin");
			if (!isAdmin && callerId != user.Id) return Forbid();

			// Validate content type
			var permitted = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
			if (!permitted.Contains(file.ContentType?.ToLower())) return BadRequest("Unsupported image type");
			if (file.Length > 2 * 1024 * 1024) return BadRequest("File too large (max 2MB)");

			// Save file to wwwroot/uploads (resize to 256x256)
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			// delete old avatar file if present and stored in /uploads
			if (!string.IsNullOrEmpty(user.ProfileImageUrl) && user.ProfileImageUrl.StartsWith("/uploads/"))
			{
				var old = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.ProfileImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
				if (System.IO.File.Exists(old))
				{
					try { System.IO.File.Delete(old); } catch { /* ignore */ }
				}
			}
			var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
			var filePath = Path.Combine(uploadsDir, fileName);
			using (var inStream = file.OpenReadStream())
			using (var image = Image.Load(inStream))
			{
				image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(256, 256), Mode = ResizeMode.Crop }));
				await image.SaveAsync(filePath);
			}
			// Save URL (assuming app serves wwwroot)
			var url = $"/uploads/{fileName}";
			user.ProfileImageUrl = url;
			await userManager.UpdateAsync(user);
			return Ok(new { url });
		}

		// ADMIN: Update user basic info (username, email)
		public class UpdateUserRequest
		{
			public string UserName { get; set; } = string.Empty;
			public string Email { get; set; } = string.Empty;
			public bool IsActive { get; set; } = true;
			public string? FullName { get; set; }
		}

		[HttpPut("users/{id}")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest updated, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			user.UserName = updated.UserName;
			user.Email = updated.Email;
			// update IsActive and FullName if provided
			user.IsActive = updated.IsActive;
			user.FullName = updated.FullName;
			var result = await userManager.UpdateAsync(user);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(new { id = user.Id, userName = user.UserName, email = user.Email, fullName = user.FullName });
		}

		public class ResetPasswordRequest
		{
			public string NewPassword { get; set; } = string.Empty;
		}

		[HttpPost("users/{id}/reset-password")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest req, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			if (string.IsNullOrWhiteSpace(req.NewPassword)) return BadRequest("Password is required");
			var token = await userManager.GeneratePasswordResetTokenAsync(user);
			var result = await userManager.ResetPasswordAsync(user, token, req.NewPassword);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok();
		}

		// ASSIGN ROLE TO USER
		public class RoleRequest
		{
			public string Role { get; set; } = string.Empty;
		}

		[HttpPost("users/{id}/roles")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> AssignRole(string id, [FromBody] JsonElement body, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			// Parse role from body (accept either raw string or { role: string })
			string role = string.Empty;
			try
			{
				if (body.ValueKind == JsonValueKind.String)
				{
					role = body.GetString() ?? string.Empty;
				}
				else if (body.ValueKind == JsonValueKind.Object)
				{
					if (body.TryGetProperty("role", out var p) || body.TryGetProperty("Role", out p))
					{
						if (p.ValueKind == JsonValueKind.String) role = p.GetString() ?? string.Empty;
					}
					else
					{
						// fallback: try deserialize to RoleRequest
						try { var rr = JsonSerializer.Deserialize<RoleRequest>(body.GetRawText()); role = rr?.Role ?? string.Empty; } catch { }
					}
				}
			}
			catch { role = string.Empty; }
			if (string.IsNullOrWhiteSpace(role)) return BadRequest("Role is required");
			var result = await userManager.AddToRoleAsync(user, role);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok();
		}

		// REMOVE ROLE FROM USER
		[HttpPost("users/{id}/roles/remove")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> RemoveRole(string id, [FromBody] JsonElement body, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			string role = string.Empty;
			try
			{
				if (body.ValueKind == JsonValueKind.String)
				{
					role = body.GetString() ?? string.Empty;
				}
				else if (body.ValueKind == JsonValueKind.Object)
				{
					if (body.TryGetProperty("role", out var p) || body.TryGetProperty("Role", out p))
					{
						if (p.ValueKind == JsonValueKind.String) role = p.GetString() ?? string.Empty;
					}
					else
					{
						try { var rr = JsonSerializer.Deserialize<RoleRequest>(body.GetRawText()); role = rr?.Role ?? string.Empty; } catch { }
					}
				}
			}
			catch { role = string.Empty; }
			if (string.IsNullOrWhiteSpace(role)) return BadRequest("Role is required");
			var result = await userManager.RemoveFromRoleAsync(user, role);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok();
		}

		// REFRESH TOKEN ENDPOINT
		[HttpPost("refresh-token")]
		[AllowAnonymous]
		public async Task<IActionResult> RefreshToken([FromBody] string refreshToken, [FromServices] LMS.Data.LmsDbContext context, [FromServices] UserManager<ApplicationUser> userManager, [FromServices] IConfiguration config)
		{
			var token = context.RefreshTokens.FirstOrDefault(t => t.Token == refreshToken && t.Expires > DateTime.UtcNow);
			if (token == null) return Unauthorized();
			if (string.IsNullOrEmpty(token.UserId)) return Unauthorized();
			var user = await userManager.FindByIdAsync(token.UserId);
			if (user == null) return Unauthorized();
			// Create new JWT with role claims
			var roles = await userManager.GetRolesAsync(user);
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
				new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty)
			};
			foreach (var role in roles)
			{
				claims.Add(new Claim(ClaimTypes.Role, role));
			}
			var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? string.Empty));
			var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
			var jwt = new JwtSecurityToken(
				issuer: config["Jwt:Issuer"],
				audience: config["Jwt:Audience"],
				claims: claims,
				expires: DateTime.Now.AddHours(2),
				signingCredentials: creds
			);
			var newToken = new JwtSecurityTokenHandler().WriteToken(jwt);
			return Ok(new { token = newToken });
		}

		// PROGRESS TRACKING (example: mark lesson complete)
		[HttpPost("lessons/{id}/complete")]
		[Authorize]
		public async Task<IActionResult> CompleteLesson(int id, [FromServices] LMS.Data.LmsDbContext context, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (userId == null) return Unauthorized();
			var progress = new LMS.Models.LessonProgress { UserId = userId, LessonId = id, CompletedAt = DateTime.UtcNow };
			context.LessonProgresses.Add(progress);
			await context.SaveChangesAsync();
			return Ok();
		}


		// ADMIN: Get all quizzes
		[HttpGet("admin/quizzes")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminQuizzes([FromServices] LMS.Data.LmsDbContext context)
		{
			var quizzes = (from q in context.Quizzes
						   join l in context.Lessons on q.LessonId equals l.Id into lessonGroup
						   from lg in lessonGroup.DefaultIfEmpty()
						   select new
						   {
							   q.Id,
							   Question = q.Question,
							   q.LessonId,
							   LessonTitle = lg != null ? lg.Title : null
						   }).ToList();
			return Ok(quizzes);
		}

		// ADMIN: Get quiz by id
		[HttpGet("admin/quizzes/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = (from q in context.Quizzes
						join l in context.Lessons on q.LessonId equals l.Id into lessonGroup
						from lg in lessonGroup.DefaultIfEmpty()
						where q.Id == id
						select new
						{
							q.Id,
							q.Question,
							Options = q.Options, // Ensure this property exists and is mapped in your model
							q.CorrectOptionIndex,
							q.LessonId,
							LessonTitle = lg != null ? lg.Title : null
						}).FirstOrDefault();
			if (quiz == null) return NotFound();

			// Ensure at least two options for editing
			var options = quiz.Options ?? new List<string>();
			while (options.Count < 2)
				options.Add("");

			return Ok(new
			{
				quiz.Id,
				quiz.Question,
				Options = options,
				quiz.CorrectOptionIndex,
				quiz.LessonId,
				quiz.LessonTitle
			});
		}

		[HttpPut("admin/quizzes/{id}")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UpdateQuiz(int id, [FromBody] Quiz updated, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
			if (quiz == null) return NotFound();
			quiz.Question = updated.Question;
			quiz.Options = updated.Options;
			quiz.CorrectOptionIndex = updated.CorrectOptionIndex;
			quiz.LessonId = updated.LessonId;
			context.SaveChanges();
			return Ok(quiz);
		}

		// QUIZ CRUD (public)
		[HttpGet("quizzes")]
		public IActionResult GetQuizzes([FromServices] LMS.Data.LmsDbContext context)
		{
			return Ok(context.Quizzes.ToList());
		}

		[HttpGet("quizzes/{id}")]
		public IActionResult GetQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
			if (quiz == null) return NotFound();
			return Ok(quiz);
		}

		[HttpPost("quizzes/{id}/publish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult PublishQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
			if (quiz == null) return NotFound();
			quiz.Published = true;
			context.SaveChanges();
			return Ok(quiz);
		}

		[HttpPost("quizzes/{id}/unpublish")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UnpublishQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
			if (quiz == null) return NotFound();
			quiz.Published = false;
			context.SaveChanges();
			return Ok(quiz);
		}

		[HttpPost("quizzes")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult CreateQuiz([FromBody] Quiz quiz, [FromServices] LMS.Data.LmsDbContext context)
		{
			context.Quizzes.Add(quiz);
			context.SaveChanges();
			return Ok(quiz);
		}

		// [HttpPut("quizzes/{id}")]
		// [Authorize(Roles = "Admin,Instructor")]
		// public IActionResult UpdateQuiz(int id, [FromBody] Quiz updated, [FromServices] LMS.Data.LmsDbContext context)
		// {
		// 	var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
		// 	if (quiz == null) return NotFound();
		// 	quiz.Question = updated.Question;
		// 	quiz.Options = updated.Options;
		// 	quiz.CorrectOptionIndex = updated.CorrectOptionIndex;
		// 	quiz.LessonId = updated.LessonId;
		// 	context.SaveChanges();
		// 	return Ok(quiz);
		// }

		[HttpDelete("quizzes/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult DeleteQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = context.Quizzes.FirstOrDefault(q => q.Id == id);
			if (quiz == null) return NotFound();
			context.Quizzes.Remove(quiz);
			context.SaveChanges();
			return Ok();
		}

		[HttpPost("quiz-results")]
		public IActionResult SaveQuizResults([FromBody] QuizResultDto dto, [FromServices] LMS.Data.LmsDbContext context)
		{
			if (dto == null || string.IsNullOrEmpty(dto.UserId))
				return BadRequest("Invalid data.");

			var quizResult = new QuizResult
			{
				UserId = dto.UserId,
				LessonId = dto.LessonId,
				AnswersJson = System.Text.Json.JsonSerializer.Serialize(dto.Answers),
				ResultsJson = System.Text.Json.JsonSerializer.Serialize(dto.Results),
				Score = dto.Score,
				Grade = dto.Grade,
				PassMark = dto.PassMark,
				Passed = dto.Passed,
				DateTaken = DateTime.UtcNow
			};

			context.QuizResults.Add(quizResult);
			context.SaveChanges();

			return Ok(new { success = true });
		}

		// PROGRESS ENDPOINTS
		[HttpGet("progress")]
		[Authorize]
		public IActionResult GetProgress([FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (userId == null) return Unauthorized();
			var progress = context.LessonProgresses.Where(p => p.UserId == userId && p.CompletedAt != null).ToList();
			var lessonIds = progress.Select(p => p.LessonId).ToList();
			var lessons = context.Lessons.Where(l => lessonIds.Contains(l.Id)).ToList();
			var result = progress.Select(p => new
			{
				Title = lessons.FirstOrDefault(l => l.Id == p.LessonId)?.Title ?? $"Lesson {p.LessonId}",
				CompletedDate = p.CompletedAt?.ToString("yyyy-MM-dd HH:mm")
			}).ToList();
			return Ok(result);
		}

		[HttpPut("progress/{lessonId}")]
		[Authorize]
		public async Task<IActionResult> UpdateProgress(int lessonId, [FromBody] bool completed, [FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (userId == null) return Unauthorized();
			var progress = context.LessonProgresses.FirstOrDefault(p => p.UserId == userId && p.LessonId == lessonId);
			if (progress == null)
			{
				progress = new LMS.Models.LessonProgress { UserId = userId, LessonId = lessonId, CompletedAt = completed ? DateTime.UtcNow : (DateTime?)null };
				context.LessonProgresses.Add(progress);
			}
			else
			{
				progress.CompletedAt = completed ? DateTime.UtcNow : (DateTime?)null;
			}
			await context.SaveChangesAsync();
			return Ok(progress);
		}

		public class QuizResultDto
		{
			public string UserId { get; set; } = string.Empty;
			public int LessonId { get; set; }
			public Dictionary<int, int?> Answers { get; set; } = new Dictionary<int, int?>(); // quizId -> selectedOption
			public Dictionary<int, bool> Results { get; set; } = new Dictionary<int, bool>(); // quizId -> correct/incorrect
			public int Score { get; set; }
			public string Grade { get; set; } = string.Empty;
			public int PassMark { get; set; }
			public bool Passed { get; set; }
		}

		public class UpdateUserProfileRequest
		{
			public string? UserName { get; set; }
			public string? FullName { get; set; }
			public string? Email { get; set; }
			public bool? IsActive { get; set; }
		}

		[HttpPut("users/{id}/profile")]
		[Authorize(Roles = "Admin,User")]
		public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserProfileRequest req, [FromServices] UserManager<ApplicationUser> userManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();

			// update username only if provided and different
			if (!string.IsNullOrWhiteSpace(req.UserName) && req.UserName != user.UserName)
			{
				var setNameResult = await userManager.SetUserNameAsync(user, req.UserName);
				if (!setNameResult.Succeeded) return BadRequest(setNameResult.Errors);
			}

			if (req.FullName != null) user.FullName = req.FullName;

			if (req.Email != null && req.Email != user.Email)
			{
				var setEmailResult = await userManager.SetEmailAsync(user, req.Email);
				if (!setEmailResult.Succeeded) return BadRequest(setEmailResult.Errors);
			}

			if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;

			var updateResult = await userManager.UpdateAsync(user);
			if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

			return Ok(new { user.Id, user.UserName, user.Email, user.FullName, user.ProfileImageUrl });
		}

		// small DTO for subscribe/unsubscribe
		public class SubscribeDto
		{
			public string UserId { get; set; } = string.Empty;
		}

		[Authorize]
        [HttpPost("courses/{courseId}/subscribe")]
        public IActionResult SubscribeToCourse(int courseId, [FromServices] LmsDbContext context)
        {
            var userId = User?.Identity?.Name ?? User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
                return BadRequest("Invalid data.");

            var exists = context.UserCourses.Any(uc => uc.CourseId == courseId && uc.UserId == userId);
            if (!exists)
            {
                var uc = new Models.UserCourse
                {
                    CourseId = courseId,
                    UserId = userId,
                    SubscribedAt = DateTime.UtcNow
                };
                context.UserCourses.Add(uc);
                context.SaveChanges();
            }

            return Ok(new { success = true });
        }

		[Authorize]
        [HttpDelete("courses/{courseId}/subscribe")]
        public IActionResult UnsubscribeFromCourse(int courseId, [FromServices] LmsDbContext context)
        {
            var userId = User?.Identity?.Name ?? User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
                return BadRequest("Invalid data.");

            var uc = context.UserCourses.FirstOrDefault(x => x.CourseId == courseId && x.UserId == userId);
            if (uc != null)
            {
                context.UserCourses.Remove(uc);
                context.SaveChanges();
            }

            return Ok(new { success = true });
        }

		[Authorize]
        [HttpGet("my-courses")]
        public IActionResult GetMyCourses([FromServices] LmsDbContext context)
        {
            var userId = User?.Identity?.Name ?? User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
                return BadRequest("Missing userId.");

            var courses = context.Courses
                .Where(c => context.UserCourses.Any(uc => uc.CourseId == c.Id && uc.UserId == userId))
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Description,
                    c.Published
                })
                .ToList();

            return Ok(courses);
        }
	}
}
