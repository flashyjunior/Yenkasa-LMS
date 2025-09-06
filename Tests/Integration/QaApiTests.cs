using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using LMS;
using LMS.Data;
using LMS.Models;
using Microsoft.AspNetCore.Identity;
using System;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

public class QaApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public QaApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder => { /* use default */ });
    }

    private string CreateJwt(string userId)
    {
        var cfg = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddJsonFile("appsettings.json")
            .Build();
        var key = cfg["Jwt:Key"];
        var issuer = cfg["Jwt:Issuer"];
        var audience = cfg["Jwt:Audience"];
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = creds,
            Subject = new System.Security.Claims.ClaimsIdentity(new[] { new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId) })
        });
        return handler.WriteToken(token);
    }

    [Fact]
    public async Task PostQuestion_Then_GetQuestions_ReturnsCreated()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<LmsDbContext>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Ensure DB is migrated
        db.Database.EnsureCreated();

        // Create a lesson to attach questions to
        var lesson = new Lesson { Title = "Integration Test Lesson", Content = "Test", CourseId = 1, DatePublished = DateTime.UtcNow };
        db.Lessons.Add(lesson);
        db.SaveChanges();

        // Create a test user
        var testUser = new ApplicationUser { UserName = "testuser", Email = "test@example.com", FullName = "Test User", IsActive = true };
        var res = await userManager.CreateAsync(testUser, "Password123!");
        res.Succeeded.Should().BeTrue();

        // generate token
        var token = CreateJwt(testUser.Id);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var newQuestion = new { title = "Test question", body = "How does this work?" };
        var postResp = await client.PostAsJsonAsync($"/api/lms/lessons/{lesson.Id}/questions", newQuestion);
        postResp.EnsureSuccessStatusCode();
        var created = await postResp.Content.ReadFromJsonAsync<dynamic>();
        ((int)created.id).Should().BeGreaterThan(0);

        var getResp = await client.GetAsync($"/api/lms/lessons/{lesson.Id}/questions");
        getResp.EnsureSuccessStatusCode();
        var list = await getResp.Content.ReadFromJsonAsync<dynamic[]>();
        list.Should().NotBeNull();
        ((int)list.Length).Should().BeGreaterOrEqualTo(1);
    }
}
