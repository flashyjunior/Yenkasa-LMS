-- SQL migration to create Privileges and RolePrivileges tables (example for SQL Server)
CREATE TABLE [dbo].[Privileges] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(1000) NULL
);

CREATE TABLE [dbo].[RolePrivileges] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RoleName] NVARCHAR(200) NOT NULL,
    [PrivilegeName] NVARCHAR(200) NOT NULL
);

-- seed initial privileges
INSERT INTO [dbo].[Privileges] ([Name],[Description]) VALUES
('ViewAdminMenu','See admin menus'),
('ManageCourses','Create and manage courses'),
('ManageQuizzes','Create and manage quizzes'),
('ApproveContent','Approve content');

-- seed role mappings
INSERT INTO [dbo].[RolePrivileges] ([RoleName],[PrivilegeName]) VALUES
('Admin','ViewAdminMenu'),
('Admin','ManageCourses'),
('Admin','ManageQuizzes'),
('Admin','ApproveContent'),
('Instructor','ViewAdminMenu'),
('Instructor','ManageCourses'),
('Instructor','ManageQuizzes');
