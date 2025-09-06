using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

public partial class UpdateQuizToCourseId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Quizzes: Remove LessonId, Add CourseId
        migrationBuilder.DropColumn(
            name: "LessonId",
            table: "Quizzes");

        migrationBuilder.AddColumn<int>(
            name: "CourseId",
            table: "Quizzes",
            nullable: false,
            defaultValue: 0);

        // QuizResults: Remove LessonId, Add CourseId
        migrationBuilder.DropColumn(
            name: "LessonId",
            table: "QuizResults");

        migrationBuilder.AddColumn<int>(
            name: "CourseId",
            table: "QuizResults",
            nullable: false,
            defaultValue: 0);

        // If you want to migrate existing data, you would need to write SQL here to copy LessonId to CourseId before dropping the column.
        // This is omitted for simplicity.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Quizzes: Remove CourseId, Add LessonId
        migrationBuilder.DropColumn(
            name: "CourseId",
            table: "Quizzes");

        migrationBuilder.AddColumn<int>(
            name: "LessonId",
            table: "Quizzes",
            nullable: false,
            defaultValue: 0);

        // QuizResults: Remove CourseId, Add LessonId
        migrationBuilder.DropColumn(
            name: "CourseId",
            table: "QuizResults");

        migrationBuilder.AddColumn<int>(
            name: "LessonId",
            table: "QuizResults",
            nullable: false,
            defaultValue: 0);
    }
}