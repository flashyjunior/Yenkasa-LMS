using System.ComponentModel.DataAnnotations;

namespace LMS.Models
{
    public class Privilege
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
