import React, { useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import DashboardRoute from './components/DashboardRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import UserProfile from './pages/UserProfile';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CompletedLessons from './pages/CompletedLessons';
import QuizHistory from './pages/QuizHistory';
import NotFound from './pages/NotFound';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import InstructorProfile from './pages/InstructorProfile';
import Lessons from './pages/Lesson';
import Lesson from './pages/Lesson';
import TakeQuiz from './pages/TakeQuiz';
import './App.css';

// Add these imports for quizzes and lesson/quiz editors (create if missing)
import Quizzes from './pages/AdminQuizzes';
import QuizDetail from './pages/EditQuiz';
import QuizResults from './pages/TakeQuiz';
import CreateLesson from './pages/CreateLesson';
import EditLesson from './pages/EditLesson';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';

// Admin pages (restore if previously deleted)
import AdminDashboard from './pages/AdminDashboard';
import AdminCourses from './pages/AdminCourses';
import AdminReports from './pages/AdminReports';
import AdminCoursesCreate from './pages/CreateCourse';
import AdminCourseEditor from './pages/EditCourse';
import AdminLessons from './pages/AdminLessons';
import AdminUsers from './pages/UserManagement';
import AdminQuizzes from './pages/AdminQuizzes';
import AdminQuizEditor from './pages/EditQuiz';
import AdminRolePrivileges from './pages/AdminRolePrivileges';
import Certificates from './pages/Certificates';
import AdminAssets from './pages/AdminAssets';
import BadgesPage from './pages/Badges';
import AdminAnnouncementsBadges from './pages/AdminAnnouncementsBadges';
import SMTPSettings from './pages/SMTPSettings';
import EmailTemplates from './pages/EmailTemplates';

function AppRoutes() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {isAuthenticated && <Sidebar />}
      <div style={{ flex: 1, padding: '1.5rem' }}>
        {isAuthenticated && <Navbar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<DashboardRoute><Home /></DashboardRoute>} />
          <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          
          <Route path="/completed-lessons" element={<PrivateRoute><CompletedLessons /></PrivateRoute>} />
          <Route path="/quiz-history" element={<PrivateRoute><QuizHistory /></PrivateRoute>} />

          {/* Learner routes */}
          <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
          <Route path="/courses/:courseId" element={<PrivateRoute><CourseDetail /></PrivateRoute>} />
          <Route path="/users/:username" element={<PrivateRoute><InstructorProfile /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons" element={<PrivateRoute><Lessons /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/:id" element={<PrivateRoute><Lesson /></PrivateRoute>} />

          {/* Create / Edit lessons */}
          <Route path="/courses/:courseId/lessons/new" element={<PrivateRoute><CreateLesson /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/:lessonId/edit" element={<PrivateRoute><EditLesson /></PrivateRoute>} />

          {/* Quizzes (list, detail, results) */}
          <Route path="/quizzes" element={<PrivateRoute><Quizzes /></PrivateRoute>} />
          <Route path="/quizzes/:id" element={<PrivateRoute><QuizDetail /></PrivateRoute>} />
          <Route path="/quizzes/:id/results" element={<PrivateRoute><QuizResults /></PrivateRoute>} />

          {/* Create / Edit quizzes tied to lesson */}
          <Route path="/courses/:courseId/lessons/:lessonId/quizzes/new" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/:lessonId/quizzes/:quizId/edit" element={<PrivateRoute><EditQuiz /></PrivateRoute>} />

          <Route path="/take-quiz/:id" element={<PrivateRoute><TakeQuiz /></PrivateRoute>} />
          <Route path="/certificates" element={<PrivateRoute><Certificates /></PrivateRoute>} />
          <Route path="/completed-lessons" element={<PrivateRoute><CompletedLessons /></PrivateRoute>} />

          {/* Admin routes (require ViewAdminMenu privilege) */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin-courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
          <Route path="/admin-reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/courses/create" element={<AdminRoute><AdminCoursesCreate /></AdminRoute>} />
          <Route path="/edit-course/:id" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
          <Route path="/admin-lessons" element={<AdminRoute><AdminLessons /></AdminRoute>} />
          <Route path="/create-lesson" element={<AdminRoute><CreateLesson /></AdminRoute>} />
          <Route path="/edit-lesson/:id" element={<AdminRoute><EditLesson /></AdminRoute>} />
          <Route path="/user-management" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin-quizzes" element={<AdminRoute><AdminQuizzes /></AdminRoute>} />
          <Route path="/admin-role-privileges" element={<AdminRoute><AdminRolePrivileges /></AdminRoute>} />
          <Route path="/admin-assets" element={<AdminRoute><AdminAssets /></AdminRoute>} />
          <Route path="/badges" element={<AdminRoute><BadgesPage /></AdminRoute>} />
          <Route path="/admin-announcements" element={<AdminRoute><AdminAnnouncementsBadges /></AdminRoute>} />
          <Route path="/admin-configuration/smtp" element={<AdminRoute><SMTPSettings /></AdminRoute>} />
          <Route path="/admin-configuration/email-templates" element={<AdminRoute><EmailTemplates /></AdminRoute>} />
          <Route path="/create-quiz" element={<AdminRoute><CreateQuiz /></AdminRoute>} />
          <Route path="/edit-quiz/:id" element={<AdminRoute><AdminQuizEditor /></AdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

const App: React.FC = () => (
  <AuthProvider>
    <UIProvider>
      <AppRoutes />
    </UIProvider>
  </AuthProvider>
);

export default App;
