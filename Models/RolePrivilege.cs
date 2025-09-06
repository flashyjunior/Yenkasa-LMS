using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class RolePrivilege
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string RoleName { get; set; } = string.Empty;

        // Backwards-compatible name copy for human readability; the canonical FK is PrivilegeId
        public string? PrivilegeName { get; set; }

        // Strong relationship to Privilege table
        [ForeignKey(nameof(Privilege))]
        public int PrivilegeId { get; set; }
        public Privilege? Privilege { get; set; }
    }
}
