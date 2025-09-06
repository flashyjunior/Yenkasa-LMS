using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using LMS.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using LMS.Models;
using LMS.Seed;





var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Data Protection: persist keys to a local folder so encrypted values can be unprotected across restarts
var dpKeyPath = builder.Configuration.GetValue<string>("DataProtection:KeyPath");
if (string.IsNullOrEmpty(dpKeyPath))
{
    dpKeyPath = System.IO.Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys");
}
// ensure directory exists
System.IO.Directory.CreateDirectory(dpKeyPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new System.IO.DirectoryInfo(dpKeyPath));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<LmsDbContext>(options =>
    options.UseSqlServer(connectionString));
builder.Services.AddDefaultIdentity<LMS.Models.ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = false)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<LmsDbContext>();

// SignalR
builder.Services.AddSignalR();

// JWT Authentication configuration
var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
    builder =>
    {
        builder
          .WithOrigins("http://localhost:3000")//.WithOrigins("http://localhost:3000") // or Use AllowAnyOrigin during dev
          .AllowAnyMethod()
          .AllowAnyHeader()// ensure "Authorization" allowed
          .AllowCredentials();
          // Note: AllowCredentials is not compatible with AllowAnyOrigin in ASP.NET Core; if you need credentials, replace AllowAnyOrigin with specific origins
    });
});
// Register email services
builder.Services.AddScoped<LMS.Services.EmailTemplateService>();
builder.Services.AddScoped<LMS.Services.EmailSender>();
var app = builder.Build();
app.UseCors("AllowFrontend"); // ensure cors middleware is enabled

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// Map default MVC route
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Map attribute-routed API controllers
app.MapControllers();

// Map SignalR hubs
app.MapHub<LMS.Hubs.QaHub>("/hubs/qa");

// Seed database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    await LMS.Data.SeedData.Initialize(services);
}

app.Run();

// Expose Program class for integration tests (WebApplicationFactory<T>)
public partial class Program { }
