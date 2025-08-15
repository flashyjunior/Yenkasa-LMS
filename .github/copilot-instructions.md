
# Copilot Instructions for AI Coding Agents

Welcome, AI coding agents! This guide will help you understand, extend, and maintain this Learning Management System (LMS) project efficiently.

## Project Architecture

- **Backend:** ASP.NET Core MVC (C#), Entity Framework Core, SQL Server, ASP.NET Identity
	- Located in the root directory (controllers, models, data, migrations)
- **Frontend:** React (TypeScript), Axios, React Router, styled-components
	- Located in `lms-client/`

## Key Folders & Files

- `Controllers/`: API endpoints (LmsControllers.cs, Auth, Admin, etc.)
- `Models/`: Data models (Course, Lesson, Quiz, QuizResult, ApplicationUser, etc.)
- `Data/`: `LmsDbContext.cs`, migrations, seed data
- `lms-client/src/pages/`: Main React pages (AdminCourses, AdminLessons, TakeQuiz, etc.)
- `lms-client/src/components/`: Reusable UI components (Modal, Sidebar, etc.)

## Coding Conventions

- **Backend:**
	- Use RESTful API patterns for controllers
	- Use async/await for DB operations
	- Use DTOs for API input/output
	- Follow C# naming conventions
- **Frontend:**
	- Use functional React components and hooks
	- Use TypeScript for type safety
	- Use Axios for API calls (see `src/api.ts` for JWT handling)
	- Use styled-components for styling

## Workflows

### Backend
- Add/extend models in `Models/`, update `LmsDbContext.cs`, and create migrations
- Add/extend endpoints in `Controllers/`
- Run migrations: `dotnet ef migrations add <Name>` and `dotnet ef database update`
- Seed users/roles in `Data/SeedData.cs` if needed

### Frontend
- Add/extend pages in `src/pages/`
- Add/extend components in `src/components/`
- Use `api.ts` for all API calls
- Use React Router for navigation

## API & Model Highlights

- **Authentication:** JWT-based, login returns userId
- **Courses/Lessons/Quizzes:** CRUD, publish/unpublish, pass mark for lessons, quiz options and correct answer
- **Quiz Results:** POST to `/api/lms/quiz-results` with userId, quizId, score, etc.
- **Role-based Access:** Admin and Learner roles, endpoints protected accordingly

## Testing & Validation

- Backend: Use `dotnet build`, `dotnet run`, and Postman for API testing
- Frontend: Use `npm start` in `lms-client/`, test UI and API integration
- Check migrations and DB updates after model changes

## Extending the Project

- To add a new feature:
	1. Update/create models in `Models/`
	2. Update `LmsDbContext.cs` and run migrations
	3. Add endpoints in `Controllers/`
	4. Update frontend pages/components and API calls
	5. Test end-to-end (backend, frontend, DB)

## AI Agent Guidance

- Always check for existing models, endpoints, and components before adding new ones
- Use RESTful conventions for new APIs
- Keep backend and frontend in sync (API routes, DTOs, etc.)
- Update documentation (`README.md`, this file) when adding major features
- For UI/UX, follow modern, accessible design patterns
- For migrations, ensure DB is up to date and seed data is valid

## Useful Commands

- Backend: `dotnet build`, `dotnet run`, `dotnet ef migrations add <Name>`, `dotnet ef database update`
- Frontend: `npm install`, `npm start`, `npm run build`

---
Keep instructions concise, actionable, and project-specific. If you are an AI agent, follow these guidelines to maximize productivity and maintain code quality.
