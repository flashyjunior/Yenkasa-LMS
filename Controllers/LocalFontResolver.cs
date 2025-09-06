using System;
using System.IO;
using PdfSharpCore.Fonts;

namespace LMS.Controllers
{
    // Minimal font resolver that returns a single uploaded font when requested as "CertFont"
    // and otherwise leaves resolution to PdfSharpCore's built-in handling.
    public class LocalFontResolver : IFontResolver
    {
        private readonly string _fontPath;

        public LocalFontResolver(string fontPath)
        {
            _fontPath = fontPath;
        }

        // Called by PdfSharpCore to map a family/style to a face name we can return bytes for
    public FontResolverInfo ResolveTypeface(string familyName, bool isBold, bool isItalic)
        {
            // The code in the controllers expects to use the family name "CertFont" when a
            // custom font is registered. Map that to a face key we recognize.
            if (!string.IsNullOrEmpty(familyName) && familyName.Equals("CertFont", StringComparison.OrdinalIgnoreCase))
            {
                return new FontResolverInfo("CertFont#Regular");
            }

            // Not our custom font - return a default resolver info to let PdfSharpCore fallback
            // The DefaultFontName property below will guide fallback; returning null is not allowed.
            return new FontResolverInfo(DefaultFontName);
        }

        // Return the raw font bytes for a face name previously returned from ResolveTypeface
        public byte[] GetFont(string faceName)
        {
            if (string.IsNullOrEmpty(faceName)) return Array.Empty<byte>();

            if (faceName.Equals("CertFont#Regular", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(_fontPath) && File.Exists(_fontPath))
            {
                try
                {
                    return File.ReadAllBytes(_fontPath);
                }
                catch
                {
                    return Array.Empty<byte>();
                }
            }

            // Not handled here - return empty bytes so PdfSharpCore can fallback
            return Array.Empty<byte>();
        }

        // The font family name that PdfSharpCore should use as a default when our resolver doesn't provide one
        public string DefaultFontName => "Arial";
    }
}
