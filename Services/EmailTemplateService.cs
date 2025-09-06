using System.Collections.Generic;
using System.Threading.Tasks;
using LMS.Data;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace LMS.Services
{
    public class EmailTemplateService
    {
        private readonly LmsDbContext _context;

        public EmailTemplateService(LmsDbContext context)
        {
            _context = context;
        }

        public async Task<Models.EmailTemplate?> GetByKeyAsync(string key)
        {
            return await _context.EmailTemplates.SingleOrDefaultAsync(t => t.Key == key);
        }

        public string Render(string templateHtml, IDictionary<string, string?> tokens)
        {
            if (string.IsNullOrEmpty(templateHtml)) return string.Empty;
            var output = templateHtml;
            foreach (var kv in tokens)
            {
                var placeholder = "{{" + kv.Key + "}}";
                var safe = WebUtility.HtmlEncode(kv.Value ?? string.Empty);
                output = output.Replace(placeholder, safe);
            }
            return output;
        }
        public async Task<Models.EmailTemplate?> GetByIdAsync(int id)
        {
            return await _context.EmailTemplates.FirstOrDefaultAsync(e => e.Id == id);
        }
    }
}
