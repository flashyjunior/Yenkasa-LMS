// Normalized: rewrite to clear hidden/invalid characters
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Drawing;
using LMS.Models;
using LMS.Controllers.Dtos;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net; // Add this for WebUtility
// switched to System.Drawing for server-side image normalization
using LMS.Data;
using System.Runtime.Versioning;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PdfSharpCore.Fonts;
using QRCoder;

// Privilege support: map roles to privilege strings
namespace LMS.Controllers
{
	public static class PrivilegeMapping
	{
		// define privileges as strings
		public const string ViewAdminMenu = "ViewAdminMenu";
		public const string ManageCourses = "ManageCourses";
		public const string ManageQuizzes = "ManageQuizzes";
		public const string ApproveContent = "ApproveContent";
	// Configuration submenu privileges
	public const string ManageCertificateAssets = "ManageCertificateAssets";
	public const string ManageAnnouncements = "ManageAnnouncements";
	public const string ManageBadges = "ManageBadges";
	public const string ManageSmtp = "ManageSmtp";
	public const string ManageEmailTemplates = "ManageEmailTemplates";
	// Security submenu privileges
	public const string ManageUsers = "ManageUsers";
	public const string ManageRolePrivileges = "ManageRolePrivileges";

		public static readonly Dictionary<string, string[]> RoleToPrivileges = new()
		{
			{ "Admin", new[] { ViewAdminMenu, ManageCourses, ManageQuizzes, ApproveContent, ManageCertificateAssets, ManageAnnouncements, ManageBadges, ManageSmtp, ManageEmailTemplates, ManageUsers, ManageRolePrivileges } },
			{ "Instructor", new[] { ViewAdminMenu, ManageCourses, ManageQuizzes } },
			{ "Student", new string[] { } }
		};
	}
}

namespace LMS.Controllers
{
	[ApiController]
	[Route("api/lms")]
	public class LmsController : ControllerBase
	{
		private readonly Microsoft.Extensions.Logging.ILogger<LmsController> _logger;

		public LmsController(Microsoft.Extensions.Logging.ILogger<LmsController> logger)
		{
			_logger = logger;
		}


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
			// Allow login by username or email
			var user = await userManager.FindByNameAsync(req.Username);
			if (user == null)
			{
				user = await userManager.FindByEmailAsync(req.Username);
			}
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
				phone = user.PhoneNumber,
				sex = user.Sex,
				dateOfBirth = user.DateOfBirth,
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



		// COURSE CRUD
		[HttpGet("admin/courses")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminCourses([FromServices] LMS.Data.LmsDbContext context, int page = 1, int pageSize = 10, string? q = null, string? sort = null, string? dir = null, string? createdBy = null)
		{
			if (page < 1) page = 1;
			if (pageSize < 1) pageSize = 10;
			var query = context.Courses.AsQueryable();
			// if createdBy provided, filter by creator
			if (!string.IsNullOrEmpty(createdBy)) query = query.Where(c => c.CreatedBy == createdBy);
			if (!string.IsNullOrEmpty(q))
			{
				var lowered = q.ToLower();
				query = query.Where(c => (c.Title ?? "").ToLower().Contains(lowered) || (c.Description ?? "").ToLower().Contains(lowered));
			}
			var total = query.Count();
			// apply sorting
			sort = (sort ?? string.Empty).ToLower();
			dir = (dir ?? "asc").ToLower();
			bool asc = dir != "desc";
			IQueryable<LMS.Models.Course> ordered = query;
			switch (sort)
			{
				case "title": ordered = asc ? query.OrderBy(c => c.Title) : query.OrderByDescending(c => c.Title); break;
				case "published": ordered = asc ? query.OrderBy(c => c.Published) : query.OrderByDescending(c => c.Published); break;
				default: ordered = asc ? query.OrderBy(c => c.Id) : query.OrderByDescending(c => c.Id); break;
			}
			var items = ordered.Skip((page - 1) * pageSize).Take(pageSize)
				.Select(c => new { c.Id, c.Title, c.Description, c.Published, c.ApprovalStatus, c.ThumbnailUrl, c.CreatedBy })
				.ToList();

			// Resolve CreatedBy -> full name for each course so frontend can display instructor names
			try
			{
				var createdByUsernames = items.Select(i => i.CreatedBy).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
				var users = context.Users.Where(u => createdByUsernames.Contains(u.UserName)).Select(u => new { u.UserName, u.FullName }).ToList();
				var userMap = users.Where(u => !string.IsNullOrEmpty(u.UserName)).ToDictionary(u => u.UserName!, u => string.IsNullOrEmpty(u.FullName) ? (u.UserName ?? string.Empty) : (u.FullName ?? u.UserName ?? string.Empty));
				var enriched = items.Select(i => new
				{
					i.Id,
					i.Title,
					i.Description,
					i.Published,
					i.ApprovalStatus,
					i.ThumbnailUrl,
					i.CreatedBy,
					instructorFullName = (i.CreatedBy != null && userMap.ContainsKey(i.CreatedBy)) ? userMap[i.CreatedBy] : i.CreatedBy
				}).ToList();
				return Ok(new { items = enriched, total, page, pageSize });
			}
			catch
			{
				return Ok(new { items, total, page, pageSize });
			}
		}
		
		[HttpGet("courses")]
		public IActionResult GetCourses(
			[FromServices] LMS.Data.LmsDbContext context,
			int page = 1,
			int pageSize = 10,
			string? q = null,
			string? sort = null,
			string? dir = null,
			string? createdBy = null
			//bool? featured = null // Add this if you have a featured flag
		)
		{
			if (page < 1) page = 1;
			if (pageSize < 1) pageSize = 10;
			var query = context.Courses.AsQueryable();

			// Only show published courses for students (no approval status filter)
			var isStudent = User?.IsInRole("Student") ?? false;
			if (isStudent)
			{
				query = query.Where(c => c.Published == true);

			}

			// Facilitator view
			if (!string.IsNullOrEmpty(createdBy))
				query = query.Where(c => c.CreatedBy == createdBy);

			if (!string.IsNullOrEmpty(q))
			{
				var lowered = q.ToLower();
				query = query.Where(c => (c.Title ?? "").ToLower().Contains(lowered) || (c.Description ?? "").ToLower().Contains(lowered));
			}

			var total = query.Count();
			sort = (sort ?? string.Empty).ToLower();
			dir = (dir ?? "asc").ToLower();
			bool asc2 = dir != "desc";
			IQueryable<LMS.Models.Course> ordered2 = query;
			switch (sort)
			{
				case "title": ordered2 = asc2 ? query.OrderBy(c => c.Title) : query.OrderByDescending(c => c.Title); break;
				case "published": ordered2 = asc2 ? query.OrderBy(c => c.Published) : query.OrderByDescending(c => c.Published); break;
				default: ordered2 = asc2 ? query.OrderBy(c => c.Id) : query.OrderByDescending(c => c.Id); break;
			}

			
			var items = ordered2.Skip((page - 1) * pageSize).Take(pageSize)
				.Select(c => new { c.Id, c.Title, c.Description, c.Published, c.ThumbnailUrl, c.CreatedBy })
				.ToList();
			_logger.LogInformation("Courses returned: {Count}", items.Count);
			// Resolve CreatedBy -> full name for each course so frontend can display instructor names
			try
			{
				var createdByUsernames = items.Select(i => i.CreatedBy).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
				var users = context.Users.Where(u => createdByUsernames.Contains(u.UserName)).Select(u => new { u.UserName, u.FullName }).ToList();
				var userMap = users.Where(u => !string.IsNullOrEmpty(u.UserName)).ToDictionary(u => u.UserName!, u => string.IsNullOrEmpty(u.FullName) ? (u.UserName ?? string.Empty) : (u.FullName ?? u.UserName ?? string.Empty));
				var enriched = items.Select(i => new
				{
					i.Id,
					i.Title,
					i.Description,
					i.Published,
					i.ThumbnailUrl,
					i.CreatedBy,
					instructorFullName = (i.CreatedBy != null && userMap.ContainsKey(i.CreatedBy)) ? userMap[i.CreatedBy] : i.CreatedBy
				}).ToList();
				
				return Ok(new { items = enriched, total, page, pageSize });
			}
			catch
			{
				return Ok(new { items, total, page, pageSize });
			}
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
							c.ThumbnailUrl,
							c.CreatedBy,
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
										l.Published,
										l.DatePublished
									})
									.ToList()
						})
						.FirstOrDefault();

			if (course == null) return NotFound();

			// compute students enrolled and last updated timestamps from related tables
			var studentsCount = context.UserCourses.Count(uc => uc.CourseId == id);
			DateTime? lastLessonDate = context.Lessons.Where(l => l.CourseId == id).Select(l => (DateTime?)l.DatePublished).OrderByDescending(d => d).FirstOrDefault();
			DateTime? lastMaterialDate = context.CourseMaterials.Where(cm => cm.CourseId == id).Select(cm => (DateTime?)cm.UploadedAt).OrderByDescending(d => d).FirstOrDefault();
			DateTime? lastUpdated = lastLessonDate;
			if (lastMaterialDate.HasValue && (!lastUpdated.HasValue || lastMaterialDate > lastUpdated)) lastUpdated = lastMaterialDate;

			// merge additional fields into the response object
			// attempt to resolve the creator's full name for the course detail
			string createdByFullName = course.CreatedBy ?? string.Empty;
			try
			{
				if (!string.IsNullOrEmpty(course.CreatedBy))
				{
					var u = context.Users.FirstOrDefault(us => us.UserName == course.CreatedBy);
					if (u != null) createdByFullName = string.IsNullOrEmpty(u.FullName) ? (u.UserName ?? string.Empty) : (u.FullName ?? u.UserName ?? string.Empty);
				}
			}
			catch { /* ignore */ }

			var resp = new
			{
				course.Id,
				course.Title,
				course.Description,
				course.Published,
				course.ApprovalStatus,
				course.ThumbnailUrl,
				course.CreatedBy,
				CreatedByFullName = createdByFullName,
				course.Lessons,
				studentsEnrolled = studentsCount,
				lastUpdated = lastUpdated
			};

			return Ok(resp);
		}

		[HttpPost("courses")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult CreateCourse([FromBody] Course course, [FromServices] LMS.Data.LmsDbContext context)
		{
			// set CreatedBy from current user identity if available
			var user = User?.Identity?.Name;
			if (!string.IsNullOrEmpty(user)) course.CreatedBy = user;
			context.Courses.Add(course);
			context.SaveChanges();
			return Ok(course);
		}

		// ANNOUNCEMENTS: simple site-wide crawler config stored in DB or file fallback
		public class AnnouncementConfigDto
		{
			public bool Enabled { get; set; } = false;
			public string Text { get; set; } = string.Empty;
			public int Speed { get; set; } = 60; // pixels/sec approximate for frontend
			public string TextColor { get; set; } = "#ffffff";
			public string BackgroundColor { get; set; } = "#111827";
		}

		[HttpGet("admin/announcements")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAnnouncements([FromServices] LMS.Data.LmsDbContext context)
		{
			// Try DB first (simple singleton row not implemented yet). Fallback to file
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			var cfgPath = Path.Combine(uploadsDir, "announcements.json");
			if (System.IO.File.Exists(cfgPath))
			{
				var txt = System.IO.File.ReadAllText(cfgPath);
				try { var dto = System.Text.Json.JsonSerializer.Deserialize<AnnouncementConfigDto>(txt); return Ok(dto ?? new AnnouncementConfigDto()); }
				catch { return Ok(new AnnouncementConfigDto()); }
			}
			return Ok(new AnnouncementConfigDto());
		}

		[HttpPut("admin/announcements")]
		[Authorize(Roles = "Admin")]
		public IActionResult PutAnnouncements([FromBody] AnnouncementConfigDto cfg)
		{
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var cfgPath = Path.Combine(uploadsDir, "announcements.json");
			var json = System.Text.Json.JsonSerializer.Serialize(cfg);
			System.IO.File.WriteAllText(cfgPath, json);
			return Ok(new { saved = true, path = "/uploads/announcements.json" });
		}

		// BADGES: award and list badges
		[HttpGet("admin/badges")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetBadges([FromServices] LMS.Data.LmsDbContext context)
		{
			var badges = context.Badges.OrderBy(b => b.Id).ToList();
			return Ok(badges);
		}

		[HttpPost("admin/badges")]
		[Authorize(Roles = "Admin")]
		public IActionResult CreateBadge([FromBody] Badge badge, [FromServices] LMS.Data.LmsDbContext context)
		{
			context.Badges.Add(badge);
			context.SaveChanges();
			return Ok(badge);
		}

		[HttpPost("admin/badges/award")]
		[Authorize(Roles = "Admin")]
		public IActionResult AwardBadge([FromBody] UserBadge ub, [FromServices] LMS.Data.LmsDbContext context)
		{
			if (string.IsNullOrEmpty(ub.UserId) || ub.BadgeId <= 0) return BadRequest("userId and badgeId required");
			ub.AwardedAt = DateTime.UtcNow;
			context.UserBadges.Add(ub);
			context.SaveChanges();
			return Ok(ub);
		}

		[HttpGet("users/{id}/badges")]
		[Authorize]
		public IActionResult GetUserBadges(string id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var badges = (from ub in context.UserBadges
						  join b in context.Badges on ub.BadgeId equals b.Id
						  where ub.UserId == id
						  select new { b.Id, b.Name, b.Description, b.IconUrl, ub.AwardedAt }).ToList();
			return Ok(badges);
		}

		[HttpPut("courses/{id}")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UpdateCourse(int id, [FromBody] Course updated, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			course.Title = updated.Title;
			course.Description = updated.Description;
			// persist thumbnail URL when provided
			course.ThumbnailUrl = updated.ThumbnailUrl;
			course.Published = updated.Published;
			course.ApprovalStatus = updated.ApprovalStatus;
			context.SaveChanges();
			return Ok(course);
		}

		// Upload supplementary material for a course (Instructor or Admin)
		[HttpPost("courses/{id}/materials")]
		[Authorize(Roles = "Admin,Instructor")]
		public IActionResult UploadCourseMaterial(int id)
		{
			var files = Request.Form.Files;
			if (files == null || files.Count == 0) return BadRequest("No files uploaded");
			var context = HttpContext.RequestServices.GetService(typeof(LMS.Data.LmsDbContext)) as LMS.Data.LmsDbContext;
			if (context == null) return StatusCode(500);
			var courseObj = context.Courses.FirstOrDefault(c => c.Id == id);
			if (courseObj == null) return NotFound();
			// only allow instructor who created it or Admin
			var currentUser = User?.Identity?.Name ?? string.Empty;
			var isAdmin = User?.IsInRole("Admin") ?? false;
			if (!isAdmin && !string.Equals(courseObj.CreatedBy, currentUser, StringComparison.OrdinalIgnoreCase))
			{
				return Forbid();
			}
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "courses", id.ToString());
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var saved = new List<object>();
			foreach (var f in files)
			{
				var fileName = Path.GetFileName(f.FileName);
				var filePath = Path.Combine(uploadsDir, fileName);
				using (var stream = System.IO.File.Create(filePath))
				{
					f.CopyTo(stream);
				}
				var relPath = $"/uploads/courses/{id}/{fileName}";
				var fullUrl = $"{Request.Scheme}://{Request.Host}{relPath}";
				context.CourseMaterials.Add(new CourseMaterial { CourseId = id, FileName = fileName, FilePath = fullUrl, ContentType = f.ContentType, UploadedBy = currentUser });
				saved.Add(new { fileName, path = fullUrl });
			}
			context.SaveChanges();
			return Ok(saved);
		}

		[HttpGet("courses/{id}/materials")]
		[Authorize]
		public IActionResult ListCourseMaterials(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var materials = context.CourseMaterials.Where(cm => cm.CourseId == id).OrderByDescending(cm => cm.UploadedAt)
				.Select(cm => new { cm.Id, cm.FileName, cm.FilePath, cm.ContentType, cm.UploadedAt, cm.UploadedBy }).ToList();
			return Ok(materials);
		}

		// Secure download for course material: checks subscription or admin and streams file
		[HttpGet("courses/{courseId}/materials/{materialId}/download")]
		[Authorize]
		public IActionResult DownloadCourseMaterial(int courseId, int materialId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var material = context.CourseMaterials.FirstOrDefault(cm => cm.Id == materialId && cm.CourseId == courseId);
			if (material == null) return NotFound();

			// allow if admin
			var isAdmin = User?.IsInRole("Admin") ?? false;
			if (!isAdmin)
			{
				// check subscription by username
				var username = User?.Identity?.Name ?? string.Empty;
				var subscribed = context.UserCourses.Any(uc => uc.CourseId == courseId && uc.UserId == username);
				if (!subscribed) return Forbid();
			}

			// material.FilePath stores the full URL; convert to local file path under wwwroot
			var filePath = material.FilePath ?? string.Empty;
			// If the path is a full URL, strip scheme and host
			try
			{
				var uri = new Uri(filePath);
				var local = uri.LocalPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
				var physical = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", local);
				if (!System.IO.File.Exists(physical)) return NotFound();
				var contentType = material.ContentType ?? "application/octet-stream";
				var stream = System.IO.File.OpenRead(physical);
				return File(stream, contentType, material.FileName);
			}
			catch
			{
				// If not a full URL, assume it's a relative path under wwwroot
				var relative = filePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
				var physical = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relative);
				if (!System.IO.File.Exists(physical)) return NotFound();
				var contentType = material.ContentType ?? "application/octet-stream";
				var stream = System.IO.File.OpenRead(physical);
				return File(stream, contentType, material.FileName);
			}
		}

		[HttpGet("admin/courses/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminCourse(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var course = context.Courses.FirstOrDefault(c => c.Id == id);
			if (course == null) return NotFound();
			return Ok(course);
		}

		// Admin-only endpoint: reseed canonical privileges and assign them to Admin role.
		[HttpPost("admin/seed-privileges")]
		[Authorize(Roles = "Admin")]
		public IActionResult ReseedPrivileges([FromServices] LMS.Data.LmsDbContext context)
		{
			try
			{
				var canonical = new[] {
					PrivilegeMapping.ViewAdminMenu,
					PrivilegeMapping.ManageCourses,
					PrivilegeMapping.ManageQuizzes,
					PrivilegeMapping.ApproveContent,
					PrivilegeMapping.ManageCertificateAssets,
					PrivilegeMapping.ManageAnnouncements,
					PrivilegeMapping.ManageBadges,
					PrivilegeMapping.ManageSmtp,
					PrivilegeMapping.ManageEmailTemplates,
					PrivilegeMapping.ManageUsers,
					PrivilegeMapping.ManageRolePrivileges
				};

				// Insert any missing privileges
				foreach (var name in canonical)
				{
					if (string.IsNullOrWhiteSpace(name)) continue;
					if (!context.Privileges.Any(p => p.Name == name))
					{
						context.Privileges.Add(new LMS.Models.Privilege { Name = name, Description = name });
					}
				}
				context.SaveChanges();

				// Ensure Admin role has every privilege
				var privMap = context.Privileges.ToDictionary(p => p.Name ?? string.Empty, p => p.Id);
				foreach (var kv in privMap)
				{
					var pname = kv.Key;
					var pid = kv.Value;
					if (!context.RolePrivileges.Any(rp => rp.RoleName == "Admin" && rp.PrivilegeId == pid))
					{
						context.RolePrivileges.Add(new LMS.Models.RolePrivilege { RoleName = "Admin", PrivilegeId = pid, PrivilegeName = pname });
					}
				}
				context.SaveChanges();
				return Ok(new { success = true, message = "Privileges reseeded and assigned to Admin." });
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to reseed privileges");
				return StatusCode(500, new { success = false, error = ex.Message });
			}
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
		public IActionResult GetLessons([FromServices] LMS.Data.LmsDbContext context, int page = 1, int pageSize = 10, string? q = null, string? sort = null, string? dir = null)
		{
			if (page < 1) page = 1;
			if (pageSize < 1) pageSize = 10;
			var baseQuery = from l in context.Lessons
							join c in context.Courses on l.CourseId equals c.Id into courseGroup
							from cg in courseGroup.DefaultIfEmpty()
							select new
							{
								l.Id,
								l.Title,
								l.Published,
								l.CourseId,
								CourseTitle = cg != null ? cg.Title : null
							};
			// If the caller is authenticated and is not in Admin role, restrict to lessons belonging to courses created by them
			if (User?.Identity != null && User.Identity.IsAuthenticated && !User.IsInRole("Admin"))
			{
				var username = User.FindFirstValue(ClaimTypes.Name);
				if (!string.IsNullOrEmpty(username))
				{
					var courseIds = context.Courses.Where(c => c.CreatedBy == username).Select(c => c.Id).ToList();
					baseQuery = baseQuery.Where(b => courseIds.Contains(b.CourseId));
				}
			}
			if (!string.IsNullOrEmpty(q))
			{
				var lowered = q.ToLower();
				baseQuery = baseQuery.Where(l => (l.Title ?? "").ToLower().Contains(lowered) || (l.CourseTitle ?? "").ToLower().Contains(lowered));
			}
			var total = baseQuery.Count();
			// sorting
			sort = (sort ?? string.Empty).ToLower();
			dir = (dir ?? "asc").ToLower();
			bool asc3 = dir != "desc";
			IQueryable<dynamic> ordered3 = baseQuery;
			switch (sort)
			{
				case "title": ordered3 = asc3 ? baseQuery.OrderBy(l => l.Title) : baseQuery.OrderByDescending(l => l.Title); break;
				case "coursetitle": ordered3 = asc3 ? baseQuery.OrderBy(l => l.CourseTitle) : baseQuery.OrderByDescending(l => l.CourseTitle); break;
				case "published": ordered3 = asc3 ? baseQuery.OrderBy(l => l.Published) : baseQuery.OrderByDescending(l => l.Published); break;
				default: ordered3 = asc3 ? baseQuery.OrderBy(l => l.Id) : baseQuery.OrderByDescending(l => l.Id); break;
			}
			var items = ordered3.Skip((page - 1) * pageSize).Take(pageSize).ToList();
			return Ok(new { items, total, page, pageSize });
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
			// Support both Content and VideoUrl being supplied by clients.
			lesson.Content = updated.Content ?? lesson.Content;
			// Prefer explicit VideoUrl; if absent, accept Content when it looks like a URL
			if (!string.IsNullOrEmpty(updated.VideoUrl)) lesson.VideoUrl = updated.VideoUrl;
			else if (!string.IsNullOrEmpty(updated.Content) && (updated.Content.Contains("youtube.com") || updated.Content.Contains("youtu.be") || updated.Content.StartsWith("http")))
			{
				lesson.VideoUrl = updated.Content;
			}
			lesson.ApprovalStatus = updated.ApprovalStatus;
			lesson.Published = updated.Published;
			lesson.PassMark = updated.PassMark;
			// Persist duration if provided
			if (updated.Duration.HasValue) lesson.Duration = updated.Duration;
			context.SaveChanges();
			return Ok(lesson);
		}

		[HttpGet("lessons/{lessonId}/quiz")]
		public IActionResult GetQuizForLesson(int lessonId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var lesson = context.Lessons.FirstOrDefault(l => l.Id == lessonId);
			if (lesson == null) return NotFound();

			var quizzes = context.Quizzes
				.Where(q => q.CourseId == lessonId)
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

		// Q&A endpoints: list and create questions and replies for a lesson
		[HttpGet("courses/{courseId}/questions")]
		public IActionResult GetQuestionsForCourse(int courseId, [FromServices] LMS.Data.LmsDbContext context)
		{
			// materialize questions and their replies, then map with user info (avoid EF translation issues)
			var questionsList = context.LessonQuestions
				.Where(q => q.CourseId == courseId)
				.OrderByDescending(q => q.CreatedAt)
				.ToList();

			var replyList = context.QuestionReplies
				.Where(r => questionsList.Select(q => q.Id).Contains(r.QuestionId))
				.OrderBy(r => r.CreatedAt)
				.ToList();

			// load involved users
			var userIds = questionsList.Select(q => q.UserId).Concat(replyList.Select(r => r.UserId)).Where(id => id != null).Distinct().ToList();
			var users = context.Users.Where(u => userIds.Contains(u.Id)).ToList().ToDictionary(u => u.Id);
			// load user role memberships for involved users so frontend can show Instructor badges
			var userRolePairs = context.UserRoles.Where(ur => userIds.Contains(ur.UserId)).ToList();
			var roleIds = userRolePairs.Select(ur => ur.RoleId).Distinct().ToList();
			var roles = context.Roles.Where(r => roleIds.Contains(r.Id)).ToList().ToDictionary(r => r.Id);
			var usersIsInstructor = new Dictionary<string, bool>();
			foreach (var ur in userRolePairs)
			{
				if (!usersIsInstructor.ContainsKey(ur.UserId)) usersIsInstructor[ur.UserId] = false;
				if (roles.TryGetValue(ur.RoleId, out var role))
				{
					if (role.Name == "Instructor") usersIsInstructor[ur.UserId] = true;
				}
			}

			var qs = questionsList.Select(q => new
			{
				q.Id,
				q.LessonId,
				q.CourseId,
				title = q.Title,
				body = q.Body,
				userId = q.UserId,
				createdAt = q.CreatedAt,
				authorName = q.UserId != null && users.ContainsKey(q.UserId) ? users[q.UserId].FullName ?? users[q.UserId].UserName : null,
				authorImage = q.UserId != null && users.ContainsKey(q.UserId) ? users[q.UserId].ProfileImageUrl : null,
				isInstructor = q.UserId != null && usersIsInstructor.ContainsKey(q.UserId) && usersIsInstructor[q.UserId],
				replies = replyList.Where(r => r.QuestionId == q.Id).Select(r => new
				{
					r.Id,
					r.QuestionId,
					r.Body,
					r.UserId,
					r.CreatedAt,
					authorName = r.UserId != null && users.ContainsKey(r.UserId) ? users[r.UserId].FullName ?? users[r.UserId].UserName : null,
					authorImage = r.UserId != null && users.ContainsKey(r.UserId) ? users[r.UserId].ProfileImageUrl : null,
					isInstructor = r.UserId != null && usersIsInstructor.ContainsKey(r.UserId) && usersIsInstructor[r.UserId],
					upvotes = context.ReplyVotes.Count(rv => rv.ReplyId == r.Id),
					userVoted = User.Identity != null && User.Identity.IsAuthenticated ? context.ReplyVotes.Any(rv => rv.ReplyId == r.Id && rv.UserId == User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)) : false
				}).ToList()
			}).ToList();
			return Ok(qs);
		}

		[HttpPost("courses/{courseId}/questions")]
		[Authorize]
		public async Task<IActionResult> PostQuestionForCourse(
			int courseId,
			[FromBody] LMS.Models.LessonQuestion req,
			[FromServices] LMS.Data.LmsDbContext context,
			[FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			// Normalize
			req.CourseId = courseId;
			req.UserId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			req.CreatedAt = DateTime.UtcNow;

			// Optionally, set LessonId if provided in the request body
			// req.LessonId = req.LessonId;

			context.LessonQuestions.Add(req);
			await context.SaveChangesAsync();

			// Broadcast to course group
			var user = context.Users.FirstOrDefault(u => u.Id == req.UserId);
			var payload = new
			{
				id = req.Id,
				lessonId = req.LessonId,
				courseId = req.CourseId,
				title = req.Title,
				body = req.Body,
				userId = req.UserId,
				createdAt = req.CreatedAt,
				authorName = user?.FullName ?? user?.UserName,
				authorImage = user?.ProfileImageUrl
			};
			await hub.Clients.Group($"course-{courseId}").SendAsync("questionAdded", payload);

			return Ok(payload);
		}

		[HttpPost("questions/{questionId}/replies")]
		[Authorize]
		public async Task<IActionResult> PostReply(int questionId, [FromBody] LMS.Models.QuestionReply req, [FromServices] LMS.Data.LmsDbContext context, [FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			var q = context.LessonQuestions.FirstOrDefault(x => x.Id == questionId);
			if (q == null) return NotFound("Question not found");
			req.QuestionId = questionId;
			req.UserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			req.CreatedAt = DateTime.UtcNow;
			context.QuestionReplies.Add(req);
			await context.SaveChangesAsync();
			var user = context.Users.FirstOrDefault(u => u.Id == req.UserId);
			var payload = new
			{
				id = req.Id,
				questionId = req.QuestionId,
				body = req.Body,
				userId = req.UserId,
				createdAt = req.CreatedAt,
				authorName = user?.FullName ?? user?.UserName,
				authorImage = user?.ProfileImageUrl
			};
			await hub.Clients.Group($"lesson-{q.LessonId}").SendAsync("replyAdded", payload);
			return Ok(payload);
		}

		// Upvote a reply (one per user). Returns current vote count.
		[HttpPost("replies/{replyId}/upvote")]
		[Authorize]
		public async Task<IActionResult> UpvoteReply(int replyId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var reply = context.QuestionReplies.FirstOrDefault(r => r.Id == replyId);
			if (reply == null) return NotFound("Reply not found");
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			// prevent duplicate votes
			var existing = context.ReplyVotes.FirstOrDefault(v => v.ReplyId == replyId && v.UserId == userId);
			if (existing != null) return BadRequest(new { message = "Already voted" });
			var vote = new LMS.Models.ReplyVote { ReplyId = replyId, UserId = userId };
			context.ReplyVotes.Add(vote);
			await context.SaveChangesAsync();
			var count = context.ReplyVotes.Count(v => v.ReplyId == replyId);
			return Ok(new { replyId, upvotes = count });
		}

		[HttpPost("replies/{replyId}/unvote")]
		[Authorize]
		public async Task<IActionResult> UnvoteReply(int replyId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			var existing = context.ReplyVotes.FirstOrDefault(v => v.ReplyId == replyId && v.UserId == userId);
			if (existing == null) return BadRequest(new { message = "Not previously voted" });
			context.ReplyVotes.Remove(existing);
			await context.SaveChangesAsync();
			var count = context.ReplyVotes.Count(v => v.ReplyId == replyId);
			return Ok(new { replyId, upvotes = count });
		}

		// Admin: list reports
		[HttpGet("admin/reports")]
		[Authorize(Roles = "Admin")]
		public IActionResult ListReports([FromServices] LMS.Data.LmsDbContext context, int page = 1, int pageSize = 20, string? targetType = null, string? resolved = null, string? q = null)
		{
			// fetch raw reports then enrich with lightweight target info so admin UI can link to the item
			var reportsRaw = context.CommentReports.OrderByDescending(r => r.CreatedAt).ToList();
			var enriched = new List<dynamic>();
			foreach (var r in reportsRaw)
			{
				int? lessonId = null;
				int? courseId = null;
				int? questionId = null;
				int? replyId = null;
				string? snippet = null;
				if (r.TargetType == "reply")
				{
					var reply = context.QuestionReplies.FirstOrDefault(qr => qr.Id == r.TargetId);
					if (reply != null)
					{
						replyId = reply.Id;
						questionId = reply.QuestionId;
						snippet = reply.Body?.Length > 200 ? reply.Body.Substring(0, 200) + "..." : reply.Body;
						var question = context.LessonQuestions.FirstOrDefault(q => q.Id == reply.QuestionId);
						if (question != null)
						{
							lessonId = question.LessonId;
							courseId = question.CourseId;
						}
					}
				}
				else if (r.TargetType == "question")
				{
					var question = context.LessonQuestions.FirstOrDefault(q => q.Id == r.TargetId);
					if (question != null)
					{
						questionId = question.Id;
						lessonId = question.LessonId;
						courseId = question.CourseId;
						snippet = question.Body?.Length > 200 ? question.Body.Substring(0, 200) + "..." : question.Body ?? question.Title;
					}
				}

				// compute reporter and target author names via context lookups (safe)
				var reporterName = (r.ReporterUserId != null) ? (context.Users.FirstOrDefault(u => u.Id == r.ReporterUserId)?.FullName ?? context.Users.FirstOrDefault(u => u.Id == r.ReporterUserId)?.UserName) : null;
				string? targetAuthorName = null;
				if (r.TargetType == "reply")
				{
					var rep = context.QuestionReplies.FirstOrDefault(x => x.Id == r.TargetId);
					if (rep != null && rep.UserId != null) targetAuthorName = context.Users.FirstOrDefault(u => u.Id == rep.UserId)?.FullName ?? context.Users.FirstOrDefault(u => u.Id == rep.UserId)?.UserName;
				}
				else if (r.TargetType == "question")
				{
					var qq = context.LessonQuestions.FirstOrDefault(x => x.Id == r.TargetId);
					if (qq != null && qq.UserId != null) targetAuthorName = context.Users.FirstOrDefault(u => u.Id == qq.UserId)?.FullName ?? context.Users.FirstOrDefault(u => u.Id == qq.UserId)?.UserName;
				}

				enriched.Add(new
				{
					r.Id,
					r.TargetType,
					r.TargetId,
					r.ReporterUserId,
					r.Reason,
					r.CreatedAt,
					r.IsResolved,
					r.ResolvedBy,
					r.ResolvedAt,
					reporterName,
					targetAuthorName,
					targetInfo = new { lessonId, courseId, questionId, replyId, snippet }
				});
			}

			// Apply server-side filters (use in-memory LINQ to avoid expression-tree issues with dynamic/null-propagation)
			var filtered = enriched.AsEnumerable();
			if (!string.IsNullOrEmpty(targetType)) filtered = filtered.Where(x => x.TargetType == targetType);
			if (!string.IsNullOrEmpty(resolved))
			{
				if (resolved == "resolved") filtered = filtered.Where(x => x.IsResolved == true);
				else if (resolved == "unresolved") filtered = filtered.Where(x => x.IsResolved == false);
			}
			if (!string.IsNullOrEmpty(q))
			{
				var lower = q.ToLower();
				filtered = filtered.Where(x => ((x.Reason ?? "") + " " + (x.targetInfo?.snippet ?? "")).ToLower().Contains(lower));
			}

			var total = filtered.Count();
			if (page < 1) page = 1;
			if (pageSize < 1) pageSize = 20;
			var items = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
			return Ok(new { items, total, page, pageSize });
		}

		// Admin: resolve a report
		[HttpPost("admin/reports/{id}/resolve")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> ResolveReport(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var rep = context.CommentReports.FirstOrDefault(r => r.Id == id);
			if (rep == null) return NotFound();

			rep.IsResolved = true;
			rep.ResolvedBy = User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name;
			rep.ResolvedAt = DateTime.UtcNow;
			await context.SaveChangesAsync();
			return Ok(rep);
		}

		// Delete a question (owner or admin)
		[HttpDelete("questions/{questionId}")]
		[Authorize]
		public async Task<IActionResult> DeleteQuestion(int questionId, [FromServices] LMS.Data.LmsDbContext context, [FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			var q = context.LessonQuestions.FirstOrDefault(x => x.Id == questionId);
			if (q == null) return NotFound("Question not found");
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			// only admin or owner can delete
			if (!User.IsInRole("Admin") && q.UserId != userId) return Forbid();
			// remove replies and associated votes
			var replies = context.QuestionReplies.Where(r => r.QuestionId == questionId).ToList();
			foreach (var r in replies)
			{
				var votes = context.ReplyVotes.Where(rv => rv.ReplyId == r.Id).ToList();
				if (votes.Any()) context.ReplyVotes.RemoveRange(votes);
			}
			if (replies.Any()) context.QuestionReplies.RemoveRange(replies);
			context.LessonQuestions.Remove(q);
			await context.SaveChangesAsync();
			await hub.Clients.Group($"lesson-{q.LessonId}").SendAsync("questionDeleted", new { questionId = q.Id });
			return Ok(new { deleted = true });
		}

		// Delete a reply (owner or admin)
		[HttpDelete("replies/{replyId}")]
		[Authorize]
		public async Task<IActionResult> DeleteReply(int replyId, [FromServices] LMS.Data.LmsDbContext context, [FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			var reply = context.QuestionReplies.FirstOrDefault(r => r.Id == replyId);
			if (reply == null) return NotFound("Reply not found");
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			if (!User.IsInRole("Admin") && reply.UserId != userId) return Forbid();
			// remove votes
			var votes = context.ReplyVotes.Where(rv => rv.ReplyId == replyId).ToList();
			if (votes.Any()) context.ReplyVotes.RemoveRange(votes);
			context.QuestionReplies.Remove(reply);
			await context.SaveChangesAsync();
			var question = context.LessonQuestions.FirstOrDefault(q => q.Id == reply.QuestionId);
			await hub.Clients.Group($"lesson-{question?.LessonId}").SendAsync("replyDeleted", new { replyId = reply.Id, questionId = reply.QuestionId });
			return Ok(new { deleted = true });
		}

		// Report a question or reply for abuse/moderation
		[HttpPost("reports")]
		[Authorize]
		public async Task<IActionResult> ReportComment([FromBody] LMS.Models.CommentReport req, [FromServices] LMS.Data.LmsDbContext context)
		{
			if (req == null || (req.TargetType != "reply" && req.TargetType != "question")) return BadRequest("Invalid report target");
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			req.ReporterUserId = userId;
			req.CreatedAt = DateTime.UtcNow;
			context.CommentReports.Add(req);
			await context.SaveChangesAsync();
			// Optionally: notify admins via email or push; omitted here.
			return Ok(new { reported = true, id = req.Id });
		}

		// Update a reply (owner or admin)
		[HttpPut("replies/{replyId}")]
		[Authorize]
		public async Task<IActionResult> UpdateReply(int replyId, [FromBody] LMS.Models.QuestionReply req, [FromServices] LMS.Data.LmsDbContext context, [FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			var reply = context.QuestionReplies.FirstOrDefault(r => r.Id == replyId);
			if (reply == null) return NotFound("Reply not found");
			var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			if (!User.IsInRole("Admin") && reply.UserId != userId) return Forbid();
			// update allowed fields
			reply.Body = req.Body;
			try { await context.SaveChangesAsync(); } catch { /* ignore */ }
			var question = context.LessonQuestions.FirstOrDefault(q => q.Id == reply.QuestionId);
			var user = context.Users.FirstOrDefault(u => u.Id == reply.UserId);
			var payload = new
			{
				id = reply.Id,
				questionId = reply.QuestionId,
				body = reply.Body,
				userId = reply.UserId,
				createdAt = reply.CreatedAt,
				authorName = user?.FullName ?? user?.UserName,
				authorImage = user?.ProfileImageUrl
			};
			await hub.Clients.Group($"lesson-{question?.LessonId}").SendAsync("replyUpdated", payload);
			return Ok(payload);
		}

		// Update a question (owner or admin)
		[HttpPut("questions/{questionId}")]
		[Authorize]
		public async Task<IActionResult> UpdateQuestion(int questionId, [FromBody] LMS.Models.LessonQuestion req, [FromServices] LMS.Data.LmsDbContext context, [FromServices] Microsoft.AspNetCore.SignalR.IHubContext<LMS.Hubs.QaHub> hub)
		{
			var q = context.LessonQuestions.FirstOrDefault(x => x.Id == questionId);
			if (q == null) return NotFound("Question not found");
			var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			if (!User.IsInRole("Admin") && q.UserId != userId) return Forbid();
			// update allowed fields
			q.Body = req.Body;
			q.Title = req.Title ?? q.Title;
			try { await context.SaveChangesAsync(); } catch { /* ignore */ }
			var user = context.Users.FirstOrDefault(u => u.Id == q.UserId);
			var payload = new
			{
				id = q.Id,
				lessonId = q.LessonId,
				courseId = q.CourseId,
				title = q.Title,
				body = q.Body,
				userId = q.UserId,
				createdAt = q.CreatedAt,
				authorName = user?.FullName ?? user?.UserName
			};
			await hub.Clients.Group($"lesson-{q.LessonId}").SendAsync("questionUpdated", payload);
			return Ok(payload);
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
				result.Add(new
				{
					id = u.Id,
					userName = u.UserName,
					email = u.Email,
					roles = roles,
					isActive = u.IsActive,
					fullName = u.FullName,
					profileImageUrl = u.ProfileImageUrl,
					phone = u.PhoneNumber,
					sex = u.Sex,
					dateOfBirth = u.DateOfBirth
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
			return Ok(new { user.Id, user.UserName, user.Email, user.FullName, user.ProfileImageUrl, phone = user.PhoneNumber, sex = user.Sex, dateOfBirth = user.DateOfBirth });
		}

		// Public registration endpoint used by SPA (creates a Student account)
		public class PublicRegisterRequest
		{
			public string UserName { get; set; } = string.Empty;
			public string Email { get; set; } = string.Empty;
			public string Password { get; set; } = string.Empty;
			public string? Phone { get; set; }
			public string? Sex { get; set; }
			public DateTime? DateOfBirth { get; set; }
		}

		[HttpPost("account/register")]
		[AllowAnonymous]
		public async Task<IActionResult> PublicRegister([FromBody] PublicRegisterRequest req, [FromServices] UserManager<ApplicationUser> userManager, [FromServices] RoleManager<IdentityRole> roleManager)
		{
			if (string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
				return BadRequest(new { error = "Username and password are required" });
			if (!string.IsNullOrWhiteSpace(req.Phone) && !System.Text.RegularExpressions.Regex.IsMatch(req.Phone, "^\\d{10}$"))
				return BadRequest(new { error = "Phone number must be 10 digits" });

			var user = new ApplicationUser
			{
				UserName = req.UserName,
				Email = req.Email,
				IsActive = true,
				FullName = req.UserName,
				PhoneNumber = req.Phone,
				Sex = req.Sex,
				DateOfBirth = req.DateOfBirth
			};
			var result = await userManager.CreateAsync(user, req.Password);
			if (!result.Succeeded) return BadRequest(new { error = result.Errors.Select(e => e.Description).FirstOrDefault() });

			// Ensure Student role exists
			if (!await roleManager.RoleExistsAsync("Student"))
			{
				await roleManager.CreateAsync(new IdentityRole("Student"));
			}
			await userManager.AddToRoleAsync(user, "Student");
			// Send welcome email if services are available
			try
			{
				var tplService = HttpContext.RequestServices.GetService(typeof(LMS.Services.EmailTemplateService)) as LMS.Services.EmailTemplateService;
				var sender = HttpContext.RequestServices.GetService(typeof(LMS.Services.EmailSender)) as LMS.Services.EmailSender;
				if (tplService != null && sender != null)
				{
					var tmpl = await tplService.GetByKeyAsync("WelcomeAfterSignup");
					if (tmpl != null && !string.IsNullOrEmpty(user.Email))
					{
						var tokens = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
						{
							["userName"] = user.UserName,
							["email"] = user.Email,
							["companyName"] = "Your Company",
							["ApplicationUrl"] = /* resolve your app url here */ "https://example.com"
						};
						var subject = string.IsNullOrEmpty(tmpl.Subject) ? "Welcome" : tplService.Render(tmpl.Subject, tokens);
						var body = tplService.Render(tmpl.Body ?? string.Empty, tokens);
						await sender.SendAsync(user.Email, subject, body);
					}
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to send welcome email");
			}
			return Ok(new { success = true, id = user.Id });
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

		[HttpPost("users/{id}/roles")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> SetUserRoles(string id, [FromBody] List<string> roles, [FromServices] UserManager<ApplicationUser> userManager, [FromServices] RoleManager<IdentityRole> roleManager)
		{
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();

			var currentRoles = await userManager.GetRolesAsync(user);
			var validRoles = new List<string>();
			foreach (var r in roles)
			{
				if (await roleManager.RoleExistsAsync(r))
				{
					validRoles.Add(r);
				}
			}

			// Remove roles not in the new list
			var removeResult = await userManager.RemoveFromRolesAsync(user, currentRoles.Except(validRoles));
			if (!removeResult.Succeeded) return BadRequest(removeResult.Errors);

			// Add new roles
			var addResult = await userManager.AddToRolesAsync(user, validRoles.Except(currentRoles));
			if (!addResult.Succeeded) return BadRequest(addResult.Errors);

			return Ok(new { success = true, roles = validRoles });
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
			public string? Phone { get; set; }
			public string? Sex { get; set; }
			public DateTime? DateOfBirth { get; set; }
		}

		public class AdminResetPasswordRequest
		{
			public string NewPassword { get; set; } = string.Empty;
		}

		[HttpPost("users/create")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> CreateUserWithPassword([FromBody] CreateUserRequest req, [FromServices] UserManager<ApplicationUser> userManager)
		{
			if (string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
				return BadRequest("Username and password are required");
			var user = new ApplicationUser { UserName = req.UserName, Email = req.Email, IsActive = req.IsActive, FullName = req.FullName, PhoneNumber = req.Phone, Sex = req.Sex, DateOfBirth = req.DateOfBirth };
			var result = await userManager.CreateAsync(user, req.Password);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(new { id = user.Id, userName = user.UserName, email = user.Email, phone = user.PhoneNumber, sex = user.Sex, dateOfBirth = user.DateOfBirth });
		}

		// Upload profile image for a user (admin or the user themselves)
		[HttpPost("users/{id}/upload-photo")]
		[Authorize]
		[SupportedOSPlatform("windows")]
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
			using (var sdImg = System.Drawing.Image.FromStream(inStream))
			{
				var thumb = new System.Drawing.Bitmap(256, 256);
				using (var g = System.Drawing.Graphics.FromImage(thumb))
				{
					g.Clear(System.Drawing.Color.White);
					g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
					g.DrawImage(sdImg, 0, 0, 256, 256);
				}
				thumb.Save(filePath, System.Drawing.Imaging.ImageFormat.Jpeg);
				thumb.Dispose();
			}
			// Save URL (assuming app serves wwwroot)
			var url = $"/uploads/{fileName}";
			user.ProfileImageUrl = url;
			await userManager.UpdateAsync(user);
			return Ok(new { url });
		}

		// ADMIN: Get quiz by id
		[HttpGet("admin/quizzes/{id}")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminQuiz(int id, [FromServices] LMS.Data.LmsDbContext context)
		{
			var quiz = (from q in context.Quizzes
						join l in context.Courses on q.CourseId equals l.Id into lessonGroup
						from lg in lessonGroup.DefaultIfEmpty()
						where q.Id == id
						select new
						{
							q.Id,
							q.Question,
							Options = q.Options, // Ensure this property exists and is mapped in your model
							q.CorrectOptionIndex,
							q.CourseId,
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
				quiz.CourseId,
				quiz.LessonTitle
			});
		}

		// Admin: reset a user's password
		[HttpPost("users/{id}/reset-password")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> ResetPassword(string id, [FromBody] AdminResetPasswordRequest req, [FromServices] UserManager<ApplicationUser> userManager)
		{
			if (string.IsNullOrWhiteSpace(req?.NewPassword)) return BadRequest(new { error = "Password is required" });
			var user = await userManager.FindByIdAsync(id);
			if (user == null) return NotFound();
			var token = await userManager.GeneratePasswordResetTokenAsync(user);
			var result = await userManager.ResetPasswordAsync(user, token, req.NewPassword);
			if (!result.Succeeded) return BadRequest(result.Errors);
			return Ok(new { success = true });
		}

		// DEBUG: write a simple test file to wwwroot/logs to verify the app can create files
		[HttpGet("debug/write-file")]
		public IActionResult DebugWriteFile()
		{
			try
			{
				var logsDir = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
				if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
				var path = System.IO.Path.Combine(logsDir, "test-write.log");
				var line = DateTime.UtcNow.ToString("o") + "\tTEST_WRITE\n";
				System.IO.File.AppendAllText(path, line);
				return Ok(new { written = true, path = path });
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "DebugWriteFile failed");
				return StatusCode(500, new { error = ex.Message });
			}
		}

		// Public: request a password reset (sends token via email in real app)
		[HttpPost("auth/forgot-password")]
		[AllowAnonymous]
		public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req, [FromServices] UserManager<ApplicationUser> userManager, [FromServices] LMS.Data.LmsDbContext context)
		{
			if (string.IsNullOrWhiteSpace(req?.Email)) return BadRequest(new { error = "Email is required" });
			var user = await userManager.FindByEmailAsync(req.Email);
			if (user == null) return Ok(new { success = true }); // do not leak existence
			var token = await userManager.GeneratePasswordResetTokenAsync(user);
			// persist token (short-lived) for demo verification
			var resetEntry = new LMS.Models.RefreshToken
			{
				Token = token,
				UserId = user.Id,
				Expires = DateTime.UtcNow.AddHours(1)
			};
			context.RefreshTokens.Add(resetEntry);
			await context.SaveChangesAsync();

			// Build URL-safe token for email link
			var encoded = System.Net.WebUtility.UrlEncode(token);
			// Use configuration or environment to build frontend URL if available (several common keys supported)
			var cfg = HttpContext.RequestServices.GetService(typeof(IConfiguration)) as IConfiguration;
			string? frontendBase = null;
			try
			{
				frontendBase = cfg?.GetValue<string>("Frontend:BaseUrl")
					?? cfg?.GetValue<string>("FrontendBaseUrl")
					?? cfg?.GetValue<string>("FrontendUrl")
					?? cfg?.GetValue<string>("App:FrontendUrl");
			}
			catch { frontendBase = null; }

			var resetUrl = string.Empty;
			if (!string.IsNullOrEmpty(frontendBase))
			{
				// Configured full frontend base URL
				resetUrl = frontendBase.TrimEnd('/') + $"/reset-password?userId={System.Net.WebUtility.UrlEncode(user.Id)}&token={encoded}";
			}
			else
			{
				// If a frontend port is configured, replace the host port (useful during local dev)
				int? frontendPort = null;
				try { frontendPort = cfg?.GetValue<int?>("Frontend:Port") ?? cfg?.GetValue<int?>("FrontendPort"); } catch { frontendPort = null; }
				// Also consider environment variables if config keys are not set
				if (frontendPort == null)
				{
					try
					{
						var ev = Environment.GetEnvironmentVariable("FRONTEND_PORT") ?? Environment.GetEnvironmentVariable("FRONTENDPORT");
						if (!string.IsNullOrEmpty(ev) && int.TryParse(ev, out var evp)) frontendPort = evp;
					}
					catch { }
				}
				// Also allow a fully-qualified frontend URL from environment if present
				if (string.IsNullOrEmpty(frontendBase))
				{
					try
					{
						frontendBase = Environment.GetEnvironmentVariable("FRONTEND_URL")
							?? Environment.GetEnvironmentVariable("FRONTEND_BASEURL")
							?? Environment.GetEnvironmentVariable("FRONTENDBASEURL");
					}
					catch { }
				}
				var scheme = Request.Scheme;
				var host = Request.Host.Host; // without port
				if (!string.IsNullOrEmpty(frontendBase))
				{
					// Use full frontend base URL from config or environment
					resetUrl = frontendBase.TrimEnd('/') + $"/reset-password?userId={System.Net.WebUtility.UrlEncode(user.Id)}&token={encoded}";
				}
				else if (frontendPort != null && frontendPort > 0)
				{
					resetUrl = $"{scheme}://{host}:{frontendPort}/reset-password?userId={System.Net.WebUtility.UrlEncode(user.Id)}&token={encoded}";
				}
				else
				{
					// Fallback to request host (may be API URL) if no frontend config provided; assume frontend on port 3000 in local dev
					var hostWithPort = Request.Host.Value;
					// If request host looks like API default (5124) and no frontend info available, prefer port 3000
					if (Request.Host.Port == 5124)
					{
						resetUrl = $"{scheme}://{host}:3000/reset-password?userId={System.Net.WebUtility.UrlEncode(user.Id)}&token={encoded}";
					}
					else
					{
						resetUrl = $"{scheme}://{hostWithPort}/reset-password?userId={System.Net.WebUtility.UrlEncode(user.Id)}&token={encoded}";
					}
				}
			}

			// Use templated email sending if EmailTemplateService & EmailSender are available
			try
			{
				_logger.LogInformation("[DEBUG-RESET-LINK] {resetUrl}", resetUrl);
				var tplService = HttpContext.RequestServices.GetService(typeof(LMS.Services.EmailTemplateService)) as LMS.Services.EmailTemplateService;
				var sender = HttpContext.RequestServices.GetService(typeof(LMS.Services.EmailSender)) as LMS.Services.EmailSender;
				if (sender == null)
				{
					_logger.LogWarning("[PasswordReset] Email services not registered. Link: {resetUrl}", resetUrl);
				}
				else if (tplService != null)
				{
					var tmpl = await tplService.GetByKeyAsync("ForgotPassword");
					if (tmpl != null)
					{
						var link = $"{frontendBase}/reset-password?token={WebUtility.UrlEncode(token)}&userId={user.Id}";
						var tokens = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
						{
							["link"] = link,
							["resetLink"] = link,
							["email"] = user.Email,
							["companyName"] = "Your Company",
							["ApplicationUrl"] = frontendBase,
							["userName"] = user.FullName ?? user.UserName,
						};

						var subject = string.IsNullOrEmpty(tmpl.Subject) ? "Password reset instructions" : tplService.Render(tmpl.Subject, tokens);
						var body = tplService.Render(tmpl.Body ?? string.Empty, tokens);
						if (!string.IsNullOrEmpty(user.Email))
						{
							_logger.LogInformation("Attempting to send reset email to {email} using template ForgotPassword", user.Email);
							await sender.SendAsync(user.Email, subject, body);
						}
					}
					else
					{
						// Template missing — log and send a simple plaintext fallback email so user receives the link
						_logger.LogWarning("[PasswordReset] Template 'ForgotPassword' not found. Sending plaintext fallback. Link: {resetUrl}", resetUrl);
						if (!string.IsNullOrEmpty(user.Email))
						{
							var plainSubject = "Password reset instructions";
							var plainBody = $"Hi {user.FullName ?? user.UserName},\n\nUse the following link to reset your password:\n{resetUrl}\n\nIf you didn't request this, ignore this email.";
							await sender.SendAsync(user.Email, plainSubject, plainBody);
						}
					}
				}
				else
				{
					// No template service but sender exists — send plain text
					_logger.LogInformation("[PasswordReset] EmailTemplateService not registered; sending plaintext reset link to {email}. Link: {resetUrl}", user.Email, resetUrl);
					if (!string.IsNullOrEmpty(user.Email))
					{
						var plainSubject = "Password reset instructions";
						var plainBody = $"Hi {user.FullName ?? user.UserName},\n\nUse the following link to reset your password:\n{resetUrl}\n\nIf you didn't request this, ignore this email.";
						await sender.SendAsync(user.Email, plainSubject, plainBody);
					}
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to send reset email");
			}

			return Ok(new { success = true, message = "If that email exists, a reset link was sent." });
		}

		// Public: consume reset token to set a new password
		[HttpPost("auth/reset-password")]
		[AllowAnonymous]
		public async Task<IActionResult> ResetPasswordWithToken([FromBody] ResetWithTokenRequest req, [FromServices] UserManager<ApplicationUser> userManager, [FromServices] LMS.Data.LmsDbContext context)
		{
			if (string.IsNullOrWhiteSpace(req?.UserId) || string.IsNullOrWhiteSpace(req?.Token) || string.IsNullOrWhiteSpace(req?.NewPassword))
				return BadRequest(new { error = "userId, token and newPassword are required" });
			var user = await userManager.FindByIdAsync(req.UserId);
			if (user == null) return NotFound();
			// validate token exists and not expired (token stored in RefreshTokens for demo)
			var stored = context.RefreshTokens.FirstOrDefault(rt => rt.UserId == req.UserId && rt.Token == req.Token && rt.Expires > DateTime.UtcNow);
			if (stored == null) return BadRequest(new { error = "Invalid or expired token" });
			var result = await userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);
			if (!result.Succeeded) return BadRequest(result.Errors);
			// remove used token
			context.RefreshTokens.Remove(stored);
			await context.SaveChangesAsync();
			return Ok(new { success = true });
		}

		[HttpGet("admin/quizzes")]
		[Authorize(Roles = "Admin")]
		public IActionResult GetAdminQuizzes([FromServices] LMS.Data.LmsDbContext context)
		{
			var quizzes = (from q in context.Quizzes
						   join l in context.Courses on q.CourseId equals l.Id into lessonGroup
						   from lg in lessonGroup.DefaultIfEmpty()
						   select new
						   {
							   id = q.Id,
							   title = q.Question,
							   lessonTitle = lg != null ? lg.Title : null,
							   published = q.Published
						   }).OrderBy(q => q.id).ToList();

			return Ok(quizzes);
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
			quiz.CourseId = updated.CourseId;
			context.SaveChanges();
			return Ok(quiz);
		}

		// QUIZ CRUD (public)
		[HttpGet("quizzes")]
		public IActionResult GetQuizzes([FromServices] LMS.Data.LmsDbContext context)
		{
			var quizzes = context.Quizzes.AsQueryable();
			if (User?.Identity != null && User.Identity.IsAuthenticated && !User.IsInRole("Admin"))
			{
				var username = User.FindFirstValue(ClaimTypes.Name);
				if (!string.IsNullOrEmpty(username))
				{
					// get lessons for courses created by this user
					var courseIds = context.Courses.Where(c => c.CreatedBy == username).Select(c => c.Id).ToList();
					var lessonIds = context.Lessons.Where(l => courseIds.Contains(l.CourseId)).Select(l => l.Id).ToList();
					quizzes = quizzes.Where(q => lessonIds.Contains(q.CourseId));
				}
			}
			return Ok(quizzes.ToList());
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

		// Add endpoints inside LmsController
		[HttpGet("courses/{courseId}/reviews")]
		public IActionResult GetCourseReviews(int courseId, [FromServices] LMS.Data.LmsDbContext context)
		{
			var reviews = context.CourseReviews
				.Where(r => r.CourseId == courseId)
				.OrderByDescending(r => r.CreatedAt)
				.Join(context.Users, r => r.UserId, u => u.Id, (r, u) => new CourseReviewDto
				{
					Id = r.Id,
					CourseId = r.CourseId,
					UserId = r.UserId,
					Rating = r.Rating,
					Comment = r.Comment,
					CreatedAt = r.CreatedAt,
					UserName = u.UserName,
					FullName = u.FullName
				})
				.ToList();

			return Ok(reviews);
		}

		[HttpPost("courses/{courseId}/reviews")]
		[Authorize]
		public async Task<IActionResult> AddCourseReview(
			int courseId,
			[FromBody] CourseReviewDto dto,
			[FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
			if (string.IsNullOrEmpty(userId)) return Unauthorized();

			// Prevent duplicate review per user per course
			var exists = context.CourseReviews.Any(r => r.CourseId == courseId && r.UserId == userId);
			if (exists) return BadRequest(new { error = "You have already reviewed this course." });

			var review = new LMS.Models.CourseReview
			{
				CourseId = courseId,
				UserId = userId,
				Rating = dto.Rating,
				Comment = dto.Comment,
				CreatedAt = DateTime.UtcNow
			};

			context.CourseReviews.Add(review);
			await context.SaveChangesAsync();

			return Ok(review);
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
		public async Task<IActionResult> SaveQuizResults([FromBody] QuizResultDto dto, [FromServices] LMS.Data.LmsDbContext context, [FromServices] LMS.Services.EmailTemplateService tplService, [FromServices] LMS.Services.EmailSender sender)
		{
			// Repo-visible hit log for debugging: record that the endpoint was entered
			try
			{
				var logsDirStart = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
				if (!Directory.Exists(logsDirStart)) Directory.CreateDirectory(logsDirStart);
				var startLog = System.IO.Path.Combine(logsDirStart, "email-evidence.log");
				System.IO.File.AppendAllText(startLog, $"{DateTime.UtcNow:o}\tQUIZ_RESULTS_HIT\n");
			}
			catch { }
			if (dto == null || string.IsNullOrEmpty(dto.UserId))
				return BadRequest("Invalid data.");

			var quizResult = new QuizResult
			{
				UserId = dto.UserId,
				CourseId = dto.CourseId,
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

			// If passed, attempt to send certificate email
			if (quizResult.Passed)
			{
				try
				{
					if (tplService != null && sender != null)
					{
						var tmpl = await tplService.GetByKeyAsync("QuizCompletionCertificate");
						if (tmpl != null)
						{
							// Prepare tokens: userName and course/lesson names
							var user = context.Users.FirstOrDefault(u => u.Id == quizResult.UserId);
							var lesson = context.Lessons.FirstOrDefault(l => l.Id == quizResult.CourseId);
							var course = lesson != null ? context.Courses.FirstOrDefault(c => c.Id == lesson.CourseId) : null;
							var tokens = new Dictionary<string, string?>
							{
								["userName"] = user?.FullName ?? user?.UserName,
								["lessonTitle"] = lesson?.Title,
								["courseTitle"] = course?.Title
							};
							var subject = string.IsNullOrEmpty(tmpl.Subject) ? "Certificate" : tplService.Render(tmpl.Subject, tokens);
							var body = tplService.Render(tmpl.Body ?? string.Empty, tokens);
							byte[]? pdfBytes = null;
							try
							{
								var certInfo = new CertificateInfo
								{
									Id = quizResult.Id,
									UserId = quizResult.UserId ?? string.Empty,
									UserFullName = tokens["userName"] ?? user?.UserName ?? string.Empty,
									CourseId = course?.Id,
									CourseTitle = tokens["courseTitle"],
									LessonId = lesson?.Id,
									LessonTitle = tokens["lessonTitle"],
									DateIssued = quizResult.DateTaken
								};
								var signingKey = HttpContext.RequestServices.GetService(typeof(IConfiguration)) is IConfiguration _cfg ? _cfg["Certificate:SigningKey"] ?? _cfg["Jwt:Key"] ?? "" : "";
								try
								{
									pdfBytes = GenerateCertificatePdfBytes(certInfo, signingKey);
								}
								catch (Exception exPdf)
								{
									// Log generation error to repo-visible log as well as logger
									_logger.LogWarning(exPdf, "Failed to generate certificate PDF");
									try
									{
										var logsDirEx = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
										if (!Directory.Exists(logsDirEx)) Directory.CreateDirectory(logsDirEx);
										var repoLogEx = System.IO.Path.Combine(logsDirEx, "email-evidence.log");
										var lineEx = $"{DateTime.UtcNow:o}\tPDF_GEN_ERROR\tQuizResultId:{quizResult.Id}\tUser:{quizResult.UserId}\tError:{exPdf.Message}\n";
										System.IO.File.AppendAllText(repoLogEx, lineEx);
									}
									catch { }
								}
							}
							catch (Exception exPdfOuter)
							{
								_logger.LogWarning(exPdfOuter, "Failed to prepare certificate PDF");
								try
								{
									var logsDirEx2 = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
									if (!Directory.Exists(logsDirEx2)) Directory.CreateDirectory(logsDirEx2);
									var repoLogEx2 = System.IO.Path.Combine(logsDirEx2, "email-evidence.log");
									var lineEx2 = $"{DateTime.UtcNow:o}\tPDF_PREP_ERROR\tQuizResultId:{quizResult.Id}\tUser:{quizResult.UserId}\tError:{exPdfOuter.Message}\n";
									System.IO.File.AppendAllText(repoLogEx2, lineEx2);
								}
								catch { }
							}

							if (!string.IsNullOrEmpty(user?.Email))
							{
								try
								{
									// diagnostic: write a small temp file so we can confirm the controller reached the send call
									var diagPath = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "lms-email-controller.log");
									var diagLine = $"{DateTime.UtcNow:o}\tCALL_SEND\tTo:{user.Email}\tHasPdf:{(pdfBytes != null)}\tPdfLen:{(pdfBytes?.Length ?? 0)}\tQuizResultId:{quizResult.Id}\n";
									System.IO.File.AppendAllText(diagPath, diagLine);

									// Also write a persistent, repo-visible log under wwwroot/logs so we can inspect it from the workspace
									try
									{
										var logsDir = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
										if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
										var repoLog = System.IO.Path.Combine(logsDir, "email-evidence.log");
										var repoLine = $"{DateTime.UtcNow:o}\tCALL_SEND\tTo:{user.Email}\tHasPdf:{(pdfBytes != null)}\tPdfLen:{(pdfBytes?.Length ?? 0)}\tQuizResultId:{quizResult.Id}\n";
										System.IO.File.AppendAllText(repoLog, repoLine);
									}
									catch { }
								}
								catch { }

								// Console-safe diagnostic via ILogger so it shows in the running app output
								try
								{
									_logger.LogInformation("[CERT] Sending certificate email to {to}; HasPdf={hasPdf}; PdfLen={len}; QuizResultId={id}", user.Email, (pdfBytes != null), (pdfBytes?.Length ?? 0), quizResult.Id);
								}
								catch { }

								// Guaranteed console write so we can capture it from redirected output
								try
								{
									Console.WriteLine($"[CERT-CONSOLE] To:{user.Email}\tHasPdf:{(pdfBytes != null)}\tPdfLen:{(pdfBytes?.Length ?? 0)}\tQuizResultId:{quizResult.Id}");
								}
								catch { }

								// For verification: if we generated PDF bytes, write them to wwwroot/logs so we can inspect the file in the workspace
								try
								{
									if (pdfBytes != null && pdfBytes.Length > 0)
									{
										var logsDir2 = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
										if (!Directory.Exists(logsDir2)) Directory.CreateDirectory(logsDir2);
										var outPdf = System.IO.Path.Combine(logsDir2, $"certificate_{quizResult.Id}.pdf");
										var saved = false;
										try
										{
											System.IO.File.WriteAllBytes(outPdf, pdfBytes);
											saved = System.IO.File.Exists(outPdf);
										}
										catch (Exception exSave)
										{
											saved = System.IO.File.Exists(outPdf);
											try { var repoLog = System.IO.Path.Combine(logsDir2, "email-evidence.log"); System.IO.File.AppendAllText(repoLog, $"{DateTime.UtcNow:o}\tPDF_SAVE_ERROR\tQuizResultId:{quizResult.Id}\tUser:{quizResult.UserId}\tError:{exSave.Message}\n"); } catch { }
										}
										// Write a repo-visible line for success
										try { var repoLog2 = System.IO.Path.Combine(logsDir2, "email-evidence.log"); System.IO.File.AppendAllText(repoLog2, $"{DateTime.UtcNow:o}\tPDF_SAVED\tQuizResultId:{quizResult.Id}\tUser:{quizResult.UserId}\tPdfLen:{pdfBytes.Length}\tSaved:{saved}\n"); } catch { }
									}
								}
								catch { }

								// Log that we're about to call SendAsync (repo-visible)
								try
								{
									var logsDir3 = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "logs");
									if (!Directory.Exists(logsDir3)) Directory.CreateDirectory(logsDir3);
									var repoLog3 = System.IO.Path.Combine(logsDir3, "email-evidence.log");
									System.IO.File.AppendAllText(repoLog3, $"{DateTime.UtcNow:o}\tCALL_SEND\tQuizResultId:{quizResult.Id}\tUser:{quizResult.UserId}\tHasPdf:{(pdfBytes != null)}\tPdfLen:{(pdfBytes?.Length ?? 0)}\n");
								}
								catch { }

								await sender.SendAsync(user.Email, subject, body, pdfBytes, $"certificate_{quizResult.Id}.pdf");
							}
						}
					}
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, "Failed to send certificate email");
				}
			}

			return Ok(new { success = true });
		}

		// Get quiz results (history) for the current authenticated user
		[HttpGet("quiz-results")]
		[Authorize]
		public IActionResult GetQuizResults([FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			var results = context.QuizResults
				.Where(q => q.UserId == userId)
				.OrderByDescending(q => q.DateTaken)
				.Select(q => new
				{
					q.Id,
					q.CourseId,
					q.Score,
					q.Grade,
					q.PassMark,
					q.Passed,
					q.DateTaken
				})
				.ToList();
			return Ok(results);
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
				Id = p.Id,
				LessonId = p.LessonId,
				Title = lessons.FirstOrDefault(l => l.Id == p.LessonId)?.Title ?? $"Lesson {p.LessonId}",
				CompletedDate = p.CompletedAt?.ToString("yyyy-MM-dd HH:mm")
			}).ToList();
			return Ok(result);
		}

		// Return per-course progress counts for the current user
		[HttpGet("progress/courses")]
		[Authorize]
		public IActionResult GetCourseProgress([FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (userId == null) return Unauthorized();

			// Optimize by grouping on the DB side to avoid N+1 queries
			// total lessons per course
			var lessonsByCourse = context.Lessons
				.GroupBy(l => l.CourseId)
				.Select(g => new { courseId = g.Key, total = g.Count() })
				.ToList();

			// completed lessons for this user, joined to lesson -> course
			var completedByCourse = (from p in context.LessonProgresses
									 where p.UserId == userId && p.CompletedAt != null
									 join l in context.Lessons on p.LessonId equals l.Id
									 group p by l.CourseId into g
									 select new { courseId = g.Key, completed = g.Count() })
				.ToList();

			var courses = context.Courses.ToList();
			var result = (from c in courses
						  join t in lessonsByCourse on c.Id equals t.courseId into lt
						  from t in lt.DefaultIfEmpty()
						  join comp in completedByCourse on c.Id equals comp.courseId into ct
						  from comp in ct.DefaultIfEmpty()
						  select new
						  {
							  courseId = c.Id,
							  title = c.Title,
							  totalLessons = t?.total ?? 0,
							  completedLessons = comp?.completed ?? 0,
							  percent = (t == null || t.total == 0) ? 0 : (int)Math.Round(100.0 * ((comp?.completed ?? 0) / (double)t.total))
						  }).ToList();

			return Ok(result);
		}

		// DOWNLOAD/GENERATE Certificate PDF (scaffold)
		[HttpGet("users/me/certificates/{id}/download")]
		[Authorize]
		[SupportedOSPlatform("windows")]
		public IActionResult DownloadCertificate(int id, [FromServices] LMS.Data.LmsDbContext context, [FromServices] IConfiguration config)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (string.IsNullOrEmpty(userId)) return Unauthorized();

			// Find the quiz result that represents this certificate and ensure it belongs to the user and is passed
			var qr = context.QuizResults.FirstOrDefault(q => q.Id == id && q.UserId == userId && q.Passed == true);
			if (qr == null) return NotFound();

			var lesson = context.Lessons.FirstOrDefault(l => l.Id == qr.CourseId);
			var course = lesson != null ? context.Courses.FirstOrDefault(c => c.Id == lesson.CourseId) : null;

			// Build a typed certificate info object including user's full name
			var userFullName = context.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstOrDefault() ?? string.Empty;
			var certInfo = new CertificateInfo
			{
				Id = qr.Id,
				UserId = qr.UserId ?? string.Empty,
				UserFullName = userFullName,
				CourseId = course?.Id,
				CourseTitle = course?.Title,
				LessonId = lesson?.Id,
				LessonTitle = lesson?.Title,
				DateIssued = qr.DateTaken
			};

			// If caller requested a preview JSON, return metadata
			if (Request.Query.ContainsKey("preview") && Request.Query["preview"] == "true")
			{
				return Ok(certInfo);
			}

			// Placeholder PDF generation - implement GenerateCertificatePdfBytes to produce a real PDF
			byte[] pdfBytes;
			try
			{
				var signingKey = config["Certificate:SigningKey"] ?? config["Jwt:Key"] ?? "";
				pdfBytes = GenerateCertificatePdfBytes(certInfo, signingKey);
			}
			catch (Exception ex)
			{
				return StatusCode(StatusCodes.Status500InternalServerError, new { message = "PDF generation failed.", details = ex.Message });
			}

			return File(pdfBytes, "application/pdf", $"certificate_{qr.Id}.pdf");
		}

		// TODO: implement real PDF generation here (using QuestPDF, PdfSharpCore, etc.)
		// Strongly-typed certificate info used for PDF generation
		private class CertificateInfo
		{
			public int Id { get; set; }
			public string UserId { get; set; } = string.Empty;
			public string UserFullName { get; set; } = string.Empty;
			public int? CourseId { get; set; }
			public string? CourseTitle { get; set; }
			public int? LessonId { get; set; }
			public string? LessonTitle { get; set; }
			public DateTime DateIssued { get; set; }
		}

		// Generate a one-page PDF certificate using PdfSharpCore with deterministic serial and signed QR payload
		[SupportedOSPlatform("windows")]
		private byte[] GenerateCertificatePdfBytes(CertificateInfo certInfo, string signingKey)
		{
			// Create document and page (A4 landscape)
			using var document = new PdfDocument();
			var page = document.AddPage();
			page.Size = PdfSharpCore.PageSize.A4;
			page.Orientation = PdfSharpCore.PageOrientation.Landscape;
			using var gfx = XGraphics.FromPdfPage(page);

			// Try to register an uploaded 'certfont' (if present) so recipient name can use it
			try
			{
				var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "fonts");
				if (Directory.Exists(uploadsDir))
				{
					var fontPath = Directory.GetFiles(uploadsDir)
						.FirstOrDefault(f => (Path.GetFileName(f) ?? string.Empty).ToLower().StartsWith("certfont"));
					if (!string.IsNullOrEmpty(fontPath) && System.IO.File.Exists(fontPath))
					{
						// Set resolver so PdfSharpCore can embed the uploaded font
						GlobalFontSettings.FontResolver = new LocalFontResolver(fontPath);
					}
				}
			}
			catch { }

			// Colors and fonts (precise values for pixel-accurate look)
			var navy = XColor.FromArgb(255, 0, 48, 87); // deep navy for the title
			var brandRed = XColor.FromArgb(255, 183, 28, 28); // warm red for borders and subtitle
			var subtleOffWhite = XColor.FromArgb(255, 250, 250, 250);
			var accentBrush = new XSolidBrush(navy);
			var subtitleBrush = new XSolidBrush(brandRed);

			// Choose font family: if a custom cert font is registered, use it (name 'CertFont'), otherwise fallback
			var fontName = GlobalFontSettings.FontResolver != null ? "CertFont" : "Arial";
			var titleFont = new XFont(fontName, 64, XFontStyle.Bold);
			var subtitleFont = new XFont(fontName, 28, XFontStyle.BoldItalic);
			// For the recipient name prefer the uploaded font (reduced size per request)
			var nameFont = new XFont(fontName, 29, XFontStyle.Regular);
			var headingFont = new XFont("Arial", 14, XFontStyle.Bold);
			var textFont = new XFont("Arial", 12, XFontStyle.Regular);

			// Background - subtle off-white
			gfx.DrawRectangle(new XSolidBrush(subtleOffWhite), 0, 0, page.Width, page.Height);

			// Double red border: thick outer and thin inner
			var outerPen = new XPen(new XSolidBrush(brandRed), 10);
			var innerPen = new XPen(new XSolidBrush(brandRed), 2);
			var outerMargin = 18.0;
			gfx.DrawRectangle(outerPen, outerMargin, outerMargin, page.Width - outerMargin * 2, page.Height - outerMargin * 2);
			var innerInset = outerMargin + 18.0;
			gfx.DrawRectangle(innerPen, innerInset, innerInset, page.Width - innerInset * 2, page.Height - innerInset * 2);

			// Top-left: try drawing logo if present
			try
			{
				var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
				if (Directory.Exists(uploadsDir))
				{
					string[] logoCandidates = new[] { "logo.bmp", "logo.png", "logo.jpg" };
					string? logoPathNullable = logoCandidates.Select(n => Path.Combine(uploadsDir, n)).FirstOrDefault(p => System.IO.File.Exists(p))
						?? Directory.GetFiles(uploadsDir).FirstOrDefault(f => (Path.GetFileName(f) ?? string.Empty).ToLower().Contains("logo"));
					string logoPath = logoPathNullable ?? string.Empty;
					if (System.IO.File.Exists(logoPath))
					{
						var ximg = CreateXImageWithFallback(logoPath, out var _logoAttempts);
						if (ximg != null)
						{
							using (ximg)
							{
								var maxLogoHeight = 100.0;
								var logoWidth = ximg.PixelWidth * (maxLogoHeight / ximg.PixelHeight);
								// push logo down slightly to avoid overlapping the inner border
								gfx.DrawImage(ximg, 40, 52, logoWidth, maxLogoHeight);
							}
						}
					}
				}
			}
			catch { }
			try
			{
				var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
				if (Directory.Exists(uploadsDir))
				{
					string[] logoCandidates = new[] { "logo.bmp", "logo.png", "logo.jpg" };
					string? logoPathNullable = logoCandidates.Select(n => Path.Combine(uploadsDir, n)).FirstOrDefault(p => System.IO.File.Exists(p))
						?? Directory.GetFiles(uploadsDir).FirstOrDefault(f => Path.GetFileName(f).ToLower().Contains("logo"));
					string logoPath = logoPathNullable ?? string.Empty;
					if (System.IO.File.Exists(logoPath))
					{
						// Try a resilient create that attempts several re-encodings if PdfSharp rejects the original bytes
						var ximg = CreateXImageWithFallback(logoPath, out var _logoAttempts);
						if (ximg != null)
						{
							using (ximg)
							{
								var maxLogoHeight = 90.0;
								var logoWidth = ximg.PixelWidth * (maxLogoHeight / ximg.PixelHeight);
								// push logo down slightly to avoid overlapping the inner border
								gfx.DrawImage(ximg, 40, 48, logoWidth, maxLogoHeight);
							}
						}
					}
				}
			}
			catch { }

			// Centered title and subtitle
			gfx.DrawString("CERTIFICATE", titleFont, new XSolidBrush(navy), new XRect(0, 40, page.Width, 72), XStringFormats.TopCenter);
			gfx.DrawString("Of Completion", subtitleFont, subtitleBrush, new XRect(0, 108, page.Width, 36), XStringFormats.TopCenter);

			// Small helper line
			gfx.DrawLine(new XPen(XColors.LightGray, 1), 120, 150, page.Width - 120, 150);

			// "This is to certify that"
			gfx.DrawString("This is to certify that", textFont, XBrushes.Gray, new XRect(0, 165, page.Width, 20), XStringFormats.TopCenter);

			// Recipient name
			var nameY = 190;
			gfx.DrawString(certInfo.UserFullName, nameFont, XBrushes.Black, new XRect(0, nameY, page.Width, 40), XStringFormats.TopCenter);

			// Underline under name (thin, elegant)
			var nameWidth = gfx.MeasureString(certInfo.UserFullName, nameFont).Width;
			gfx.DrawLine(new XPen(XColors.Black, 1.25), (page.Width - nameWidth) / 2, nameY + 48, (page.Width + nameWidth) / 2, nameY + 48);

			// Body paragraph (course/lesson details)
			var bodyY = nameY + 70;
			string courseLine = string.Empty;
			if (!string.IsNullOrEmpty(certInfo.LessonTitle))
				courseLine = $"has completed the lesson: {certInfo.LessonTitle}";
			else if (!string.IsNullOrEmpty(certInfo.CourseTitle))
				courseLine = $"has completed the course: {certInfo.CourseTitle}";
			else
				courseLine = "has successfully completed the course.";

			gfx.DrawString(courseLine, textFont, XBrushes.Black, new XRect(80, bodyY, page.Width - 160, 20), XStringFormats.TopCenter);
			gfx.DrawString($"Issued On: {certInfo.DateIssued: dd MMMM yyyy}", textFont, XBrushes.Black, new XRect(80, bodyY + 22, page.Width - 160, 20), XStringFormats.TopCenter);

			// Partner/logo block removed from certificate per design update

			// Top-right ribbon/banner
			try
			{
				var ribbonWidth = 220.0;
				var ribbonHeight = 48.0;
				var rx = page.Width - ribbonWidth - 36;
				var ry = 36.0;
				// Draw a rounded rectangular ribbon with small triangular tails
				var ribbonRect = new XRect(rx, ry, ribbonWidth, ribbonHeight);
				gfx.DrawRoundedRectangle(new XSolidBrush(brandRed), rx, ry, ribbonWidth, ribbonHeight, 6, 6);
				// small left tail
				var tailPts = new XPoint[] {
					new XPoint(rx - 18, ry + ribbonHeight / 2 - 6),
					new XPoint(rx, ry + 6),
					new XPoint(rx, ry + ribbonHeight - 6)
				};
				gfx.DrawPolygon(new XSolidBrush(brandRed), tailPts, XFillMode.Alternate);
				// ribbon text
				var ribbonFont = new XFont("Arial", 12, XFontStyle.Bold);
				gfx.DrawString("CERTIFIED", ribbonFont, XBrushes.White, ribbonRect, XStringFormats.Center);
			}
			catch { }

			// QR code and signature block
			string ComputeSerial()
			{
				using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(signingKey ?? ""));
				var input = $"{certInfo.CourseTitle}|{certInfo.UserFullName}|{certInfo.DateIssued:yyyy-MM-dd}|{certInfo.Id}";
				var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(input));
				return BitConverter.ToString(hash).Replace("-", "").Substring(0, 12);
			}
			string serial = ComputeSerial();
			try
			{
				gfx.DrawString($"Certificate ID: {certInfo.Id}", textFont, XBrushes.Gray, new XRect(60, page.Height - 80, 240, 16), XStringFormats.TopLeft);
				gfx.DrawString($"S/N: {serial}", textFont, XBrushes.Gray, new XRect(60, page.Height - 62, 240, 16), XStringFormats.TopLeft);
			}
			catch { }

			// Generate QR payload and render QR image
			try
			{
				var year = certInfo.DateIssued.Year;
				var qrObj = new
				{
					course = certInfo.CourseTitle ?? string.Empty,
					year = year,
					name = certInfo.UserFullName ?? string.Empty,
					serial = serial,
					certificateId = certInfo.Id
				};
				var qrJson = System.Text.Json.JsonSerializer.Serialize(qrObj);
				string signature = string.Empty;
				try
				{
					using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(signingKey ?? ""));
					var sigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(qrJson));
					signature = Convert.ToBase64String(sigBytes);
				}
				catch { }
				var payloadObj = new { data = qrObj, signature = signature };
				var payload = System.Text.Json.JsonSerializer.Serialize(payloadObj);
				using (var qrGenerator = new QRCoder.QRCodeGenerator())
				{
					var qrData = qrGenerator.CreateQrCode(payload, QRCoder.QRCodeGenerator.ECCLevel.Q);
					using var qrCode = new QRCoder.PngByteQRCode(qrData);
					var png = qrCode.GetGraphic(20);
					using var ms = new System.IO.MemoryStream(png);
					using var qImg = XImage.FromStream(() => ms);
					var qSize = 110.0;
					gfx.DrawImage(qImg, 60 + 260, page.Height - qSize - 80, qSize, qSize);
				}
			}
			catch { }

			// Signature block (right)
			try
			{
				var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
				var sigPathNullable = new[] { "signature.bmp", "signature.png", "signature.jpg" }
					.Select(n => Path.Combine(uploadsDir, n))
					.FirstOrDefault(p => System.IO.File.Exists(p))
					?? Directory.GetFiles(uploadsDir).FirstOrDefault(f => (Path.GetFileName(f) ?? string.Empty).ToLower().Contains("signature") || (Path.GetFileName(f) ?? string.Empty).ToLower().Contains("sign"));
				var sigPath = sigPathNullable ?? string.Empty;
				if (System.IO.File.Exists(sigPath))
				{
					var sImg = CreateXImageWithFallback(sigPath, out var _sigAttempts);
					if (sImg != null)
					{
						using (sImg)
						{
							var sigHeight = 70.0;
							var sigWidth = sImg.PixelWidth * (sigHeight / sImg.PixelHeight);
							var sigX = page.Width - sigWidth - 80;
							var sigY = page.Height - sigHeight - 110;
							gfx.DrawImage(sImg, sigX, sigY, sigWidth, sigHeight);
							gfx.DrawString("Hardeep Singh Puri", headingFont, XBrushes.Black, new XRect(sigX - 20, sigY + sigHeight + 6, sigWidth + 40, 18), XStringFormats.TopCenter);
							gfx.DrawString("Director, Learntoupgrade", textFont, XBrushes.Gray, new XRect(sigX - 20, sigY + sigHeight + 24, sigWidth + 40, 16), XStringFormats.TopCenter);
						}
					}
				}
				else
				{
					var sigX = page.Width - 260;
					var sigY = page.Height - 160;
					gfx.DrawLine(new XPen(XColors.Black, 1.2), sigX, sigY + 40, sigX + 200, sigY + 40);
					gfx.DrawString("Hardeep Singh Puri", headingFont, XBrushes.Black, new XRect(sigX, sigY + 44, 200, 18), XStringFormats.TopCenter);
					gfx.DrawString("Director, Learntoupgrade", textFont, XBrushes.Gray, new XRect(sigX, sigY + 62, 200, 16), XStringFormats.TopCenter);
				}
			}
			catch { }

			using var stream = new System.IO.MemoryStream();
			document.Save(stream, false);
			return stream.ToArray();
		}

		// Helper: try multiple re-encodings to make an XImage compatible with PdfSharpCore
		[SupportedOSPlatform("windows")]
		private XImage? CreateXImageWithFallback(string path, out List<string> attemptLog)
		{
			attemptLog = new List<string>();
			if (!System.IO.File.Exists(path))
			{
				attemptLog.Add("missing");
				return null;
			}
			try
			{
				// First try raw bytes
				var raw = System.IO.File.ReadAllBytes(path);
				try
				{
					using var xi = XImage.FromStream(() => new System.IO.MemoryStream(raw));
					attemptLog.Add("raw: OK");
					// reopen as a new XImage to return
					return XImage.FromStream(() => new System.IO.MemoryStream(raw));
				}
				catch (Exception exRaw)
				{
					attemptLog.Add($"raw: FAIL - {exRaw.Message}");
				}
				// Try System.Drawing re-encodes (PNG, BMP, JPEG) - safer on Windows when ImageSharp runtime mismatches occur
				var encodings = new[] { "png", "bmp", "jpeg" };
				foreach (var enc in encodings)
				{
					try
					{
						using var sdImg = System.Drawing.Image.FromFile(path);
						using var ms = new System.IO.MemoryStream();
						switch (enc)
						{
							case "png": sdImg.Save(ms, System.Drawing.Imaging.ImageFormat.Png); break;
							case "bmp": sdImg.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp); break;
							case "jpeg": sdImg.Save(ms, System.Drawing.Imaging.ImageFormat.Jpeg); break;
						}
						var b = ms.ToArray();
						try
						{
							using var xi2 = XImage.FromStream(() => new System.IO.MemoryStream(b));
							attemptLog.Add($"{enc}: OK");
							return XImage.FromStream(() => new System.IO.MemoryStream(b));
						}
						catch (Exception exEnc)
						{
							attemptLog.Add($"{enc}: FAIL - {exEnc.Message}");
						}
					}
					catch (Exception exSd)
					{
						attemptLog.Add($"{enc}: SD_LOAD_SAVE_FAIL - {exSd.Message}");
					}
				}
			}
			catch (Exception ex)
			{
				attemptLog.Add($"overall-fail: {ex.Message}");
			}
			return null;
		}

		// DEV helper: write diagnostics about uploaded assets to a file for offline inspection
		[HttpGet("admin/debug-uploads")]
		[Authorize(Roles = "Admin")]
		[SupportedOSPlatform("windows")]
		public IActionResult DebugUploads()
		{
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var diagPath = Path.Combine(uploadsDir, "diagnostic.txt");
			using (var sw = System.IO.File.CreateText(diagPath))
			{
				sw.WriteLine($"Timestamp: {DateTime.UtcNow:O}");
				sw.WriteLine($"Marker: pid={System.Diagnostics.Process.GetCurrentProcess().Id} uid={Guid.NewGuid()}");
				var files = Directory.GetFiles(uploadsDir);
				foreach (var f in files)
				{
					sw.WriteLine($"Found: {Path.GetFileName(f)} - {new FileInfo(f).Length} bytes");
					try
					{
						using var sdImg = System.Drawing.Image.FromFile(f);
						sw.WriteLine($" System.Drawing: success ({sdImg.Width}x{sdImg.Height})");
						// try multiple encodings using the new helper to get detailed attempt logs
						var xi = CreateXImageWithFallback(f, out var attempts);
						foreach (var a in attempts) sw.WriteLine($"  Attempt: {a}");
						if (xi != null)
						{
							using (xi) { sw.WriteLine($"  Final: XImage created (pix {xi.PixelWidth}x{xi.PixelHeight})"); }
						}
						else
						{
							sw.WriteLine($"  Final: XImage creation failed for all encodings");
						}
					}
					catch (Exception ex)
					{
						sw.WriteLine($" System.Drawing: FAIL - {ex.Message}");
					}
				}
			}
			return Ok(new { diagnostic = "/uploads/diagnostic.txt" });
		}

		// DEV helper (public, dev-only): write diagnostics about uploaded assets to a file for offline inspection
		[HttpGet("test-debug-uploads-public")]
		[AllowAnonymous]
		[SupportedOSPlatform("windows")]
		public IActionResult DebugUploadsPublic([FromServices] Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
		{
			// Only allow in Development environment to avoid exposing info in production
			if (!env.IsDevelopment()) return Forbid();
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var diagPath = Path.Combine(uploadsDir, "diagnostic.txt");
			using (var sw = System.IO.File.CreateText(diagPath))
			{
				sw.WriteLine($"Timestamp: {DateTime.UtcNow:O}");
				sw.WriteLine($"Marker: pid={System.Diagnostics.Process.GetCurrentProcess().Id} uid={Guid.NewGuid()}");
				var files = Directory.GetFiles(uploadsDir);
				if (!files.Any()) sw.WriteLine("No files found in uploads directory.");
				foreach (var f in files)
				{
					sw.WriteLine($"Found: {Path.GetFileName(f)} - {new FileInfo(f).Length} bytes");
					try
					{
						using var sdImg = System.Drawing.Image.FromFile(f);
						sw.WriteLine($" System.Drawing: success ({sdImg.Width}x{sdImg.Height})");
						var xi = CreateXImageWithFallback(f, out var attempts);
						foreach (var a in attempts) sw.WriteLine($"  Attempt: {a}");
						if (xi != null)
						{
							using (xi) { sw.WriteLine($"  Final: XImage created (pix {xi.PixelWidth}x{xi.PixelHeight})"); }
						}
						else
						{
							sw.WriteLine($"  Final: XImage creation failed for all encodings");
						}
					}
					catch (Exception ex)
					{
						sw.WriteLine($" System.Drawing: FAIL - {ex.Message}");
					}
				}
			}
			return Ok(new { diagnostic = "/uploads/diagnostic.txt" });
		}

		// Return derived certificates for the current user (based on passed quiz results)
		[HttpGet("users/me/certificates")]
		[Authorize]
		public IActionResult GetCertificates([FromServices] LMS.Data.LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (string.IsNullOrEmpty(userId)) return Unauthorized();

			var certs = (from qr in context.QuizResults
						 join l in context.Lessons on qr.CourseId equals l.Id into lg
						 from lesson in lg.DefaultIfEmpty()
						 join c in context.Courses on lesson.CourseId equals c.Id into cg
						 from course in cg.DefaultIfEmpty()
						 where qr.UserId == userId && qr.Passed == true
						 select new
						 {
							 id = qr.Id,
							 courseId = course != null ? course.Id : (int?)null,
							 courseTitle = course != null ? course.Title : (lesson != null ? lesson.Title : null),
							 lessonId = lesson != null ? lesson.Id : (int?)null,
							 dateIssued = qr.DateTaken
						 }).OrderByDescending(x => x.dateIssued).ToList();

			return Ok(certs);
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
			public int CourseId { get; set; }
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
			public string? Phone { get; set; }
			public string? Sex { get; set; }
			public DateTime? DateOfBirth { get; set; }
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

			if (req.Phone != null) user.PhoneNumber = req.Phone;
			if (req.Sex != null) user.Sex = req.Sex;
			if (req.DateOfBirth.HasValue) user.DateOfBirth = req.DateOfBirth.Value;

			var updateResult = await userManager.UpdateAsync(user);
			if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

			return Ok(new { user.Id, user.UserName, user.Email, user.FullName, user.ProfileImageUrl, phone = user.PhoneNumber, sex = user.Sex, dateOfBirth = user.DateOfBirth });
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

		// Return privileges for the current authenticated user
		[Authorize]
		[HttpGet("users/me/privileges")]
		public async Task<IActionResult> GetMyPrivileges([FromServices] UserManager<ApplicationUser> userManager, [FromServices] LmsDbContext context)
		{
			var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			if (string.IsNullOrEmpty(userId)) return Unauthorized();
			var user = await userManager.FindByIdAsync(userId);
			if (user == null) return NotFound();
			var roles = await userManager.GetRolesAsync(user);

			// Read privilege mappings from DB RolePrivileges table
			var roleList = roles.ToList();
			var privilegeNames = context.RolePrivileges
				.Where(rp => roleList.Contains(rp.RoleName))
				.Select(rp => rp.PrivilegeName)
				.ToList();

			// If Privileges table exists, prefer canonical names from there
			// Filter out any null names from the DB and treat known as non-nullable list
			var known = context.Privileges.Select(p => p.Name)
				.Where(n => !string.IsNullOrEmpty(n))
				.Select(n => n!).ToList();
			List<string> result = privilegeNames
				.Where(pn => !string.IsNullOrEmpty(pn) && known.Contains(pn))
				.Select(pn => pn!)
				.Distinct()
				.ToList();

			// Fallback: if DB mapping empty, fall back to in-memory mapping for compatibility
			if (!result.Any())
			{
				var privileges = new List<string>();
				foreach (var r in roles)
				{
					if (PrivilegeMapping.RoleToPrivileges.TryGetValue(r, out var p))
					{
						privileges.AddRange(p);
					}
				}
				result = privileges.Distinct().ToList();
			}

			return Ok(result);
		}

		// ADMIN: Upload branding assets (logo / signature) to fixed filenames in wwwroot/uploads
		[HttpPost("admin/uploads/logo")]
		[Authorize(Roles = "Admin")]
		[SupportedOSPlatform("windows")]
		public IActionResult UploadLogo([FromForm] IFormFile file)
		{
			if (file == null || file.Length == 0) return BadRequest("No file uploaded");
			var allowed = new[] { "image/jpeg", "image/png" };
			if (!allowed.Contains(file.ContentType?.ToLower())) return BadRequest("Unsupported file type");
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var destJpg = Path.Combine(uploadsDir, "logo.jpg");
			var destPng = Path.Combine(uploadsDir, "logo.png");
			// Normalize image: load with System.Drawing, resize keeping aspect and save as JPEG/PNG/BMP
			using (var inStream = file.OpenReadStream())
			using (var sdImg = System.Drawing.Image.FromStream(inStream))
			{
				var maxW = 800;
				var maxH = 300;
				var ratio = Math.Min((double)maxW / sdImg.Width, (double)maxH / sdImg.Height);
				var newW = (int)Math.Round(sdImg.Width * ratio);
				var newH = (int)Math.Round(sdImg.Height * ratio);
				using var bmp = new System.Drawing.Bitmap(newW, newH);
				using (var g = System.Drawing.Graphics.FromImage(bmp))
				{
					g.Clear(System.Drawing.Color.Transparent);
					g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
					g.DrawImage(sdImg, 0, 0, newW, newH);
				}
				bmp.Save(destJpg, System.Drawing.Imaging.ImageFormat.Jpeg);
				bmp.Save(destPng, System.Drawing.Imaging.ImageFormat.Png);
				var destBmp = Path.Combine(uploadsDir, "logo.bmp");
				bmp.Save(destBmp, System.Drawing.Imaging.ImageFormat.Bmp);
			}
			return Ok(new { url = "/uploads/logo.jpg" });
		}

		[HttpPost("admin/uploads/signature")]
		[Authorize(Roles = "Admin")]
		[SupportedOSPlatform("windows")]
		public IActionResult UploadSignature([FromForm] IFormFile file)
		{
			if (file == null || file.Length == 0) return BadRequest("No file uploaded");
			var allowed = new[] { "image/jpeg", "image/png" };
			if (!allowed.Contains(file.ContentType?.ToLower())) return BadRequest("Unsupported file type");
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var destJpg = Path.Combine(uploadsDir, "signature.jpg");
			var destPng = Path.Combine(uploadsDir, "signature.png");
			// Normalize signature: load with System.Drawing, resize keeping aspect and save as JPEG/PNG/BMP
			using (var inStream = file.OpenReadStream())
			using (var sdImg = System.Drawing.Image.FromStream(inStream))
			{
				var maxW = 1600;
				var maxH = 400;
				var ratio = Math.Min((double)maxW / sdImg.Width, (double)maxH / sdImg.Height);
				var newW = (int)Math.Round(sdImg.Width * ratio);
				var newH = (int)Math.Round(sdImg.Height * ratio);
				using var bmp = new System.Drawing.Bitmap(newW, newH);
				using (var g = System.Drawing.Graphics.FromImage(bmp))
				{
					g.Clear(System.Drawing.Color.Transparent);
					g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
					g.DrawImage(sdImg, 0, 0, newW, newH);
				}
				bmp.Save(destJpg, System.Drawing.Imaging.ImageFormat.Jpeg);
				bmp.Save(destPng, System.Drawing.Imaging.ImageFormat.Png);
				var destBmp = Path.Combine(uploadsDir, "signature.bmp");
				bmp.Save(destBmp, System.Drawing.Imaging.ImageFormat.Bmp);
			}
			return Ok(new { url = "/uploads/signature.jpg" });
		}

		[HttpPost("admin/uploads/font")]
		[Authorize(Roles = "Admin")]
		public async Task<IActionResult> UploadFont([FromForm] IFormFile file)
		{
			if (file == null || file.Length == 0) return BadRequest("No file uploaded");
			var allowed = new[] { "font/ttf", "font/otf", "application/octet-stream", "application/x-font-ttf", "application/font-sfnt" };
			// accept by extension too
			var ext = Path.GetExtension(file.FileName).ToLower();
			if (!(ext == ".ttf" || ext == ".otf")) return BadRequest("Unsupported font type; use .ttf or .otf");
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
			var destDir = Path.Combine(uploadsDir, "fonts");
			if (!Directory.Exists(destDir)) Directory.CreateDirectory(destDir);
			var dest = Path.Combine(destDir, "certfont" + ext);
			using (var stream = System.IO.File.Create(dest))
			{
				await file.CopyToAsync(stream);
			}
			return Ok(new { url = $"/uploads/fonts/{Path.GetFileName(dest)}" });
		}

		// ADMIN: list uploads
		[HttpGet("admin/uploads")]
		[Authorize(Roles = "Admin")]
		public IActionResult ListUploads()
		{
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			if (!Directory.Exists(uploadsDir)) return Ok(new string[0]);
			var files = Directory.GetFiles(uploadsDir).Select(f => "/uploads/" + Path.GetFileName(f)).ToList();
			return Ok(files);
		}

		// ADMIN: validate uploads (dimensions + PdfSharp compatibility)
		[HttpGet("admin/uploads/validate")]
		[Authorize(Roles = "Admin")]
		public IActionResult ValidateUploads()
		{
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			var result = new Dictionary<string, object>();
			if (!Directory.Exists(uploadsDir)) return Ok(result);

			string[] checkFiles = new[] { "logo.bmp", "logo.png", "logo.jpg", "signature.bmp", "signature.png", "signature.jpg" };
			foreach (var fname in checkFiles)
			{
				var path = Path.Combine(uploadsDir, fname);
				if (!System.IO.File.Exists(path))
				{
					// try to find a fallback by name
					var fallback = Directory.GetFiles(uploadsDir).FirstOrDefault(f => (Path.GetFileName(f) ?? string.Empty).ToLower().Contains(Path.GetFileNameWithoutExtension(fname)));
					if (!string.IsNullOrEmpty(fallback)) path = fallback;
				}
				if (!System.IO.File.Exists(path))
				{
					result[fname] = new { exists = false };
					continue;
				}
				try
				{
					using var sdImg = System.Drawing.Image.FromFile(path);
					var w = sdImg.Width;
					var h = sdImg.Height;
					// normalize to BMP in-memory and test PdfSharp XImage creation (BMP preferred for PdfSharp compatibility)
					using var ms = new System.IO.MemoryStream();
					sdImg.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
					ms.Position = 0;
					bool pdfSharpCompatible = true;
					try
					{
						using var xi = XImage.FromStream(() => new System.IO.MemoryStream(ms.ToArray()));
					}
					catch { pdfSharpCompatible = false; }
					result[fname] = new { exists = true, width = w, height = h, pdfSharpCompatible };
				}
				catch (Exception ex)
				{
					result[fname] = new { exists = true, error = ex.Message };
				}
			}
			return Ok(result);
		}

		// Public dev helper: validate uploads without authentication (development only)
		[HttpGet("test-uploads-public")]
		[AllowAnonymous]
		public IActionResult TestUploadsPublic()
		{
			// reuse ValidateUploads logic but without requiring Admin role
			var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
			var result = new Dictionary<string, object>();
			if (!Directory.Exists(uploadsDir)) return Ok(result);

			string[] checkFiles = new[] { "logo.bmp", "logo.png", "logo.jpg", "signature.bmp", "signature.png", "signature.jpg" };
			foreach (var fname in checkFiles)
			{
				var path = Path.Combine(uploadsDir, fname);
				if (!System.IO.File.Exists(path))
				{
					var fallback = Directory.GetFiles(uploadsDir).FirstOrDefault(f => (Path.GetFileName(f) ?? string.Empty).ToLower().Contains(Path.GetFileNameWithoutExtension(fname)));
					if (!string.IsNullOrEmpty(fallback)) path = fallback;
				}
				if (!System.IO.File.Exists(path))
				{
					result[fname] = new { exists = false };
					continue;
				}
				try
				{
					using var sdImg = System.Drawing.Image.FromFile(path);
					var w = sdImg.Width;
					var h = sdImg.Height;
					using var ms = new System.IO.MemoryStream();
					sdImg.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
					ms.Position = 0;
					bool pdfSharpCompatible = true;
					try
					{
						using var xi = XImage.FromStream(() => new System.IO.MemoryStream(ms.ToArray()));
					}
					catch { pdfSharpCompatible = false; }
					result[fname] = new { exists = true, width = w, height = h, pdfSharpCompatible };
				}
				catch (Exception ex)
				{
					result[fname] = new { exists = true, error = ex.Message };
				}
			}
			return Ok(result);
		}

		// ADMIN: quick test certificate to preview font/layout
		[HttpGet("admin/test-certificate")]
		[Authorize(Roles = "Admin")]
		[SupportedOSPlatform("windows")]
		public IActionResult TestCertificate([FromServices] IConfiguration config)
		{
			var certInfo = new CertificateInfo
			{
				Id = 0,
				UserId = "admin-test",
				UserFullName = "Jane Doe",
				CourseId = 1,
				CourseTitle = "Sample Course",
				LessonId = null,
				LessonTitle = null,
				DateIssued = DateTime.UtcNow
			};
			var signingKey = config["Certificate:SigningKey"] ?? config["Jwt:Key"] ?? "";
			var pdf = GenerateCertificatePdfBytes(certInfo, signingKey);
			return File(pdf, "application/pdf", "test-certificate.pdf");
		}

		// Public test endpoint (no auth) - development helper to fetch a sample certificate quickly
		[HttpGet("test-certificate-public")]
		[AllowAnonymous]
		[SupportedOSPlatform("windows")]
		public IActionResult TestCertificatePublic([FromServices] IConfiguration config)
		{
			var certInfo = new CertificateInfo
			{
				Id = 0,
				UserId = "public-test",
				UserFullName = "Public Test",
				CourseId = 1,
				CourseTitle = "Sample Course",
				LessonId = null,
				LessonTitle = null,
				DateIssued = DateTime.UtcNow
			};
			var signingKey = config["Certificate:SigningKey"] ?? config["Jwt:Key"] ?? "";
			var pdf = GenerateCertificatePdfBytes(certInfo, signingKey);
			return File(pdf, "application/pdf", "test-certificate-public.pdf");
		}

		// Helper to render templates with tokens (case-insensitive) and HTML-encode injected values
		private static string RenderTemplateWithTokens(string template, IDictionary<string, string?> tokens)
		{
			if (string.IsNullOrEmpty(template)) return template;

			foreach (var kv in tokens)
			{
				var pattern = @"\{\{\s*" + Regex.Escape(kv.Key) + @"\s*\}\}";
				var safeVal = WebUtility.HtmlEncode(kv.Value ?? string.Empty);
				template = Regex.Replace(template, pattern, safeVal, RegexOptions.IgnoreCase);
			}

			return template;
		}
		// DEBUG: create a test log file under wwwroot/logs to verify the app can write into the project
		[HttpPost("debug/create-log-test")]
		[AllowAnonymous]
		public IActionResult CreateLogTest()
		{
			try
			{
				var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logs");
				if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
				var testPath = Path.Combine(logsDir, "test-write.log");
				var line = DateTime.UtcNow.ToString("o") + "\tTEST_WRITE\n";
				System.IO.File.AppendAllText(testPath, line);
				return Ok(new { written = true, path = "/logs/test-write.log" });
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to write test log");
				return StatusCode(500, new { error = "failed" });
			}
		}
			
	}
}
