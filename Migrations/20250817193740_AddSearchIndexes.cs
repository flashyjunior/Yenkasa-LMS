using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add indexes to speed up text searches and join queries
            // Ensure columns are a bounded length so SQL Server can index them
            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Courses",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Courses",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            // Create Courses.Title and Courses.Description indexes only if they do not already exist
            migrationBuilder.Sql(@"IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Title' AND o.name = 'Courses'
)
BEGIN
    CREATE INDEX [IX_Courses_Title] ON [Courses] ([Title]);
END");

            migrationBuilder.Sql(@"IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Description' AND o.name = 'Courses'
)
BEGIN
    CREATE INDEX [IX_Courses_Description] ON [Courses] ([Description]);
END");

            // Ensure Lessons.Title is bounded length before creating index
            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Lessons",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_Title",
                table: "Lessons",
                column: "Title");

            // Create Lessons.CourseId index only if it does not already exist
            migrationBuilder.Sql(@"IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Lessons_CourseId' AND o.name = 'Lessons'
)
BEGIN
    CREATE INDEX [IX_Lessons_CourseId] ON [Lessons] ([CourseId]);
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop Courses indexes only if they exist
            migrationBuilder.Sql(@"IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Title' AND o.name = 'Courses'
)
BEGIN
    DROP INDEX [IX_Courses_Title] ON [Courses];
END");

            migrationBuilder.Sql(@"IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Courses_Description' AND o.name = 'Courses'
)
BEGIN
    DROP INDEX [IX_Courses_Description] ON [Courses];
END");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_Title",
                table: "Lessons");

            // Drop the index only if it exists
            migrationBuilder.Sql(@"IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON o.object_id = i.object_id
    WHERE i.name = 'IX_Lessons_CourseId' AND o.name = 'Lessons'
)
BEGIN
    DROP INDEX [IX_Lessons_CourseId] ON [Lessons];
END");

            // Revert the column changes
            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Lessons",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);
        }
    }
}
