using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LMS.Data;
using LMS.Models;
using System.Collections.Generic;
using System;

namespace LMS.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly LmsDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public AdminController(LmsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // Privileges
        [HttpGet("privileges")]
        public async Task<IActionResult> GetPrivileges()
        {
            var list = await _context.Privileges.OrderBy(p => p.Name).ToListAsync();
            return Ok(list);
        }

        public class PrivilegeDto { public string Name { get; set; } = string.Empty; public string? Description { get; set; } }

        [HttpPost("privileges")]
        public async Task<IActionResult> CreatePrivilege([FromBody] PrivilegeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Name)) return BadRequest("Name is required");
            if (await _context.Privileges.AnyAsync(p => p.Name == dto.Name)) return Conflict("Privilege already exists");
            var p = new Privilege { Name = dto.Name.Trim(), Description = dto.Description };
            _context.Privileges.Add(p);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPrivileges), new { id = p.Id }, p);
        }

        [HttpDelete("privileges/{id:int}")]
        public async Task<IActionResult> DeletePrivilege(int id)
        {
            var p = await _context.Privileges.FindAsync(id);
            if (p == null) return NotFound();
            // remove role mappings first
            var rps = _context.RolePrivileges.Where(r => r.PrivilegeId == id);
            _context.RolePrivileges.RemoveRange(rps);
            _context.Privileges.Remove(p);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Role -> Privilege mappings
        [HttpGet("role-privileges")]
        public async Task<IActionResult> GetRolePrivileges()
        {
            var list = await _context.RolePrivileges.Include(rp => rp.Privilege).OrderBy(rp => rp.RoleName).ThenBy(rp => rp.PrivilegeName).ToListAsync();
            return Ok(list.Select(rp => new { rp.Id, rp.RoleName, rp.PrivilegeId, rp.PrivilegeName }));
        }

        public class RolePrivilegeDto { public string RoleName { get; set; } = string.Empty; public int PrivilegeId { get; set; } }

        [HttpPost("role-privileges")]
        public async Task<IActionResult> AddRolePrivilege([FromBody] RolePrivilegeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.RoleName)) return BadRequest("RoleName is required");
            var role = dto.RoleName.Trim();
            if (!await _roleManager.RoleExistsAsync(role)) return BadRequest("Role does not exist");
            var priv = await _context.Privileges.FindAsync(dto.PrivilegeId);
            if (priv == null) return BadRequest("Privilege not found");
            if (await _context.RolePrivileges.AnyAsync(rp => rp.RoleName == role && rp.PrivilegeId == dto.PrivilegeId)) return Conflict("Mapping exists");
            var rp = new RolePrivilege { RoleName = role, PrivilegeId = dto.PrivilegeId, PrivilegeName = priv.Name };
            _context.RolePrivileges.Add(rp);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetRolePrivileges), new { id = rp.Id }, rp);
        }

        [HttpDelete("role-privileges/{id:int}")]
        public async Task<IActionResult> DeleteRolePrivilege(int id)
        {
            var rp = await _context.RolePrivileges.FindAsync(id);
            if (rp == null) return NotFound();
            _context.RolePrivileges.Remove(rp);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Assign role to user
        public class AssignRoleDto { public string RoleName { get; set; } = string.Empty; }

        [HttpPost("users/{userId}/roles")]
        public async Task<IActionResult> AssignRoleToUser(string userId, [FromBody] AssignRoleDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound("User not found");
            if (string.IsNullOrWhiteSpace(dto?.RoleName)) return BadRequest("RoleName is required");
            var role = dto.RoleName.Trim();
            if (!await _roleManager.RoleExistsAsync(role)) return BadRequest("Role does not exist");
            var res = await _userManager.AddToRoleAsync(user, role);
            if (!res.Succeeded) return BadRequest(string.Join("; ", res.Errors.Select(e => e.Description)));
            return Ok();
        }

        // Remove role from user
        [HttpDelete("users/{userId}/roles")]
        public async Task<IActionResult> RemoveRoleFromUser(string userId, [FromQuery] string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return BadRequest("roleName query parameter is required");
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound("User not found");
            if (!await _roleManager.RoleExistsAsync(roleName)) return BadRequest("Role does not exist");
            var res = await _userManager.RemoveFromRoleAsync(user, roleName);
            if (!res.Succeeded) return BadRequest(string.Join("; ", res.Errors.Select(e => e.Description)));
            return Ok();
        }

        // List available roles
        [HttpGet("roles")]
        public IActionResult GetRoles()
        {
            var roles = _roleManager.Roles.Select(r => r.Name).Where(n => n != null).Select(n => n!).ToList();
            return Ok(roles);
        }

        public class RoleDto { public string RoleName { get; set; } = string.Empty; }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] RoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.RoleName)) return BadRequest("RoleName is required");
            var name = dto.RoleName.Trim();
            if (await _roleManager.RoleExistsAsync(name)) return Conflict("Role already exists");
            var role = new IdentityRole(name);
            var res = await _roleManager.CreateAsync(role);
            if (!res.Succeeded) return BadRequest(string.Join("; ", res.Errors.Select(e => e.Description)));
            return CreatedAtAction(nameof(GetRoles), new { name = role.Name }, role.Name);
        }

        // Get detailed roles (name + description + order)
        [HttpGet("roles/details")]
        public async Task<IActionResult> GetRolesDetails()
        {
            var list = _roleManager.Roles.Select(r => r.Name).Where(n => n != null).Select(n => n!).ToList();
            var result = new List<object>();
            foreach (var rn in list)
            {
                var role = await _roleManager.FindByNameAsync(rn);
                if (role == null) continue;
                var claims = await _roleManager.GetClaimsAsync(role);
                var desc = claims.FirstOrDefault(c => c.Type == "description")?.Value;
                var orderClaim = claims.FirstOrDefault(c => c.Type == "order")?.Value;
                int order = 0;
                if (int.TryParse(orderClaim, out var o)) order = o;
                result.Add(new { name = rn, description = desc, order });
            }
            // sort by order then name (safe extraction)
            var ordered = result.OrderBy(r => {
                var prop = r.GetType().GetProperty("order")?.GetValue(r);
                if (prop == null) return 0;
                if (int.TryParse(prop.ToString(), out var v)) return v;
                return 0;
            }).ThenBy(r => {
                var prop = r.GetType().GetProperty("name")?.GetValue(r)?.ToString();
                return prop ?? string.Empty;
            }).ToList();
            return Ok(ordered);
        }

        [HttpPut("roles/{roleName}/description")]
        public async Task<IActionResult> UpdateRoleDescription(string roleName, [FromBody] RoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return BadRequest("roleName is required");
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role == null) return NotFound("Role not found");
            var claims = await _roleManager.GetClaimsAsync(role);
            var existing = claims.FirstOrDefault(c => c.Type == "description");
            if (existing != null) await _roleManager.RemoveClaimAsync(role, existing);
            if (!string.IsNullOrWhiteSpace(dto?.RoleName))
            {
                var descClaim = new System.Security.Claims.Claim("description", dto.RoleName);
                await _roleManager.AddClaimAsync(role, descClaim);
            }
            return Ok();
        }

        [HttpPut("roles/{roleName}/order")]
        public async Task<IActionResult> UpdateRoleOrder(string roleName, [FromBody] int order)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return BadRequest("roleName is required");
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role == null) return NotFound("Role not found");
            var claims = await _roleManager.GetClaimsAsync(role);
            var existing = claims.FirstOrDefault(c => c.Type == "order");
            if (existing != null) await _roleManager.RemoveClaimAsync(role, existing);
            var claim = new System.Security.Claims.Claim("order", order.ToString());
            await _roleManager.AddClaimAsync(role, claim);
            return Ok();
        }

        public class RoleOrderPayload { public List<string> Roles { get; set; } = new List<string>(); }

        [HttpPut("roles/order")]
        public async Task<IActionResult> UpdateRolesOrder([FromBody] RoleOrderPayload payload)
        {
            if (payload == null || payload.Roles == null) return BadRequest("roles payload required");
            // update orders in batch
            for (int i = 0; i < payload.Roles.Count; i++)
            {
                var rn = payload.Roles[i];
                if (string.IsNullOrWhiteSpace(rn)) continue;
                var role = await _roleManager.FindByNameAsync(rn);
                if (role == null) continue;
                var claims = await _roleManager.GetClaimsAsync(role);
                var existing = claims.FirstOrDefault(c => c.Type == "order");
                if (existing != null) await _roleManager.RemoveClaimAsync(role, existing);
                await _roleManager.AddClaimAsync(role, new System.Security.Claims.Claim("order", i.ToString()));
            }
            return Ok();
        }

        [HttpDelete("roles/{roleName}")]
        public async Task<IActionResult> DeleteRoleByName(string roleName, [FromQuery] bool confirm = false)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return BadRequest("roleName is required");
            if (!confirm) return BadRequest("To delete a role call this endpoint with ?confirm=true to acknowledge deletion.");
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role == null) return NotFound("Role not found");
            // prevent deleting last Admin role if necessary (left as a policy decision)
            var res = await _roleManager.DeleteAsync(role);
            if (!res.Succeeded) return BadRequest(string.Join("; ", res.Errors.Select(e => e.Description)));
            // remove any role-privilege mappings for this role
            var rps = _context.RolePrivileges.Where(rp => rp.RoleName == roleName);
            _context.RolePrivileges.RemoveRange(rps);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Export roles + privileges as JSON
        [HttpGet("roles/export")]
        public async Task<IActionResult> ExportRoles()
        {
            var roles = _roleManager.Roles.Select(r => r.Name).Where(n => n != null).Select(n => n!).ToList();
            var outList = new List<object>();
            foreach (var rn in roles)
            {
                var role = await _roleManager.FindByNameAsync(rn);
                var claims = await _roleManager.GetClaimsAsync(role);
                var desc = claims.FirstOrDefault(c => c.Type == "description")?.Value;
                var orderClaim = claims.FirstOrDefault(c => c.Type == "order")?.Value;
                int order = 0; int.TryParse(orderClaim, out order);
                var rp = _context.RolePrivileges.Where(x => x.RoleName == rn).Select(x => new { x.PrivilegeId, x.PrivilegeName }).ToList();
                outList.Add(new { name = rn, description = desc, order, privileges = rp });
            }
            return Ok(outList);
        }

        // Import roles + privileges JSON
        [HttpPost("roles/import")]
        public async Task<IActionResult> ImportRoles([FromBody] List<object> payload, [FromQuery] bool dryRun = false)
        {
            // Importer that accepts objects with { name, description, order, privileges: [{ privilegeId or privilegeName }] }
            if (payload == null) return BadRequest("payload required");

            // Build a preview of actions without applying if dryRun
            var preview = new List<object>();

            foreach (var item in payload)
            {
                var json = System.Text.Json.JsonSerializer.Serialize(item);
                var doc = System.Text.Json.JsonDocument.Parse(json).RootElement;
                var name = doc.TryGetProperty("name", out var nval) && nval.ValueKind == System.Text.Json.JsonValueKind.String ? nval.GetString() : null;
                var desc = doc.TryGetProperty("description", out var d) && d.ValueKind == System.Text.Json.JsonValueKind.String ? d.GetString() : null;
                var order = doc.TryGetProperty("order", out var o) && o.ValueKind == System.Text.Json.JsonValueKind.Number ? o.GetInt32() : 0;
                if (string.IsNullOrWhiteSpace(name)) continue;

                var roleExists = await _roleManager.RoleExistsAsync(name);
                var actions = new List<string>();
                if (!roleExists) actions.Add("createRole");
                if (!string.IsNullOrWhiteSpace(desc)) actions.Add("setDescription");
                if (order != 0) actions.Add("setOrder");

                var privActions = new List<object>();
                if (doc.TryGetProperty("privileges", out var privs) && privs.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var pv in privs.EnumerateArray())
                    {
                        int privId = 0;
                        string? privName = null;
                        if (pv.TryGetProperty("privilegeId", out var pid) && pid.ValueKind == System.Text.Json.JsonValueKind.Number) privId = pid.GetInt32();
                        if (pv.TryGetProperty("privilegeName", out var pn) && pn.ValueKind == System.Text.Json.JsonValueKind.String) privName = pn.GetString();

                        Privilege? priv = null;
                        if (privId != 0) priv = await _context.Privileges.FindAsync(privId);
                        if (priv == null && !string.IsNullOrWhiteSpace(privName)) priv = _context.Privileges.FirstOrDefault(x => x.Name == privName);

                        if (priv == null) privActions.Add(new { action = "createPrivilege", privilegeName = privName ?? $"id:{privId}" });
                        else
                        {
                            var mappingExists = await _context.RolePrivileges.AnyAsync(rp => rp.RoleName == name && rp.PrivilegeId == priv.Id);
                            if (!mappingExists) privActions.Add(new { action = "addMapping", privilegeId = priv.Id, privilegeName = priv.Name });
                        }
                    }
                }

                preview.Add(new { name, roleExists, actions, privilegeChanges = privActions });
            }

            if (dryRun) return Ok(new { dryRun = true, preview });

            // perform the import transactionally
            using (var tx = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    foreach (var item in payload)
                    {
                        var json = System.Text.Json.JsonSerializer.Serialize(item);
                        var doc = System.Text.Json.JsonDocument.Parse(json).RootElement;
                        var name = doc.TryGetProperty("name", out var nval) && nval.ValueKind == System.Text.Json.JsonValueKind.String ? nval.GetString() : null;
                        var desc = doc.TryGetProperty("description", out var d) && d.ValueKind == System.Text.Json.JsonValueKind.String ? d.GetString() : null;
                        var order = doc.TryGetProperty("order", out var o) && o.ValueKind == System.Text.Json.JsonValueKind.Number ? o.GetInt32() : 0;
                        if (string.IsNullOrWhiteSpace(name)) continue;

                        if (!await _roleManager.RoleExistsAsync(name))
                        {
                            var role = new IdentityRole(name);
                            var rres = await _roleManager.CreateAsync(role);
                            if (!rres.Succeeded) throw new Exception("Failed to create role " + name + ": " + string.Join(";", rres.Errors.Select(e => e.Description)));
                        }
                        var roleObj = await _roleManager.FindByNameAsync(name);
                        if (roleObj == null) continue;

                        // set description claim
                        var claims = await _roleManager.GetClaimsAsync(roleObj);
                        var existingDesc = claims.FirstOrDefault(c => c.Type == "description");
                        if (existingDesc != null) await _roleManager.RemoveClaimAsync(roleObj, existingDesc);
                        if (!string.IsNullOrWhiteSpace(desc)) await _roleManager.AddClaimAsync(roleObj, new System.Security.Claims.Claim("description", desc));

                        // set order
                        var existingOrder = claims.FirstOrDefault(c => c.Type == "order");
                        if (existingOrder != null) await _roleManager.RemoveClaimAsync(roleObj, existingOrder);
                        await _roleManager.AddClaimAsync(roleObj, new System.Security.Claims.Claim("order", order.ToString()));

                        // privileges
                        if (doc.TryGetProperty("privileges", out var privs) && privs.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            foreach (var pv in privs.EnumerateArray())
                            {
                                int privId = 0;
                                string? privName = null;
                                if (pv.TryGetProperty("privilegeId", out var pid) && pid.ValueKind == System.Text.Json.JsonValueKind.Number) privId = pid.GetInt32();
                                if (pv.TryGetProperty("privilegeName", out var pn) && pn.ValueKind == System.Text.Json.JsonValueKind.String) privName = pn.GetString();

                                Privilege? priv = null;
                                if (privId != 0) priv = await _context.Privileges.FindAsync(privId);
                                if (priv == null && !string.IsNullOrWhiteSpace(privName)) priv = _context.Privileges.FirstOrDefault(x => x.Name == privName) ?? new Privilege { Name = privName };
                                if (priv != null && priv.Id == 0)
                                {
                                    _context.Privileges.Add(priv);
                                    await _context.SaveChangesAsync();
                                }
                                if (priv != null)
                                {
                                    if (!await _context.RolePrivileges.AnyAsync(rp => rp.RoleName == name && rp.PrivilegeId == priv.Id))
                                    {
                                        var rp = new RolePrivilege { RoleName = name, PrivilegeId = priv.Id, PrivilegeName = priv.Name };
                                        _context.RolePrivileges.Add(rp);
                                    }
                                }
                            }
                            await _context.SaveChangesAsync();
                        }
                    }

                    await tx.CommitAsync();
                    return Ok(new { success = true, applied = preview });
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { error = ex.Message });
                }
            }
        }

        // List users (searchable)
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? q = null)
        {
            var query = _userManager.Users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var qq = q.Trim();
                query = query.Where(u => u.UserName.Contains(qq) || (u.Email != null && u.Email.Contains(qq)));
            }
            var list = await query.Take(100).ToListAsync();
            var result = new List<object>();
            foreach (var u in list)
            {
                var r = await _userManager.GetRolesAsync(u);
                result.Add(new { u.Id, u.UserName, u.Email, Roles = r });
            }
            return Ok(result);
        }
    }
}
