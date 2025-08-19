using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class SyncModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Title' AND o.name = 'Courses'
)
BEGIN
    CREATE INDEX [IX_Courses_Title] ON [Courses] ([Title]);
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Title' AND o.name = 'Courses'
)
BEGIN
    DROP INDEX [IX_Courses_Title] ON [Courses];
END");
        }
    }
}
