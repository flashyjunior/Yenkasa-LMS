import React, { useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import UserProfile from './pages/UserProfile';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CompletedLessons from './pages/CompletedLessons';
import QuizHistory from './pages/QuizHistory';
import NotFound from './pages/NotFound';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
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
import AdminCourseEditor from './pages/EditCourse';
import AdminLessons from './pages/AdminLessons';
import AdminUsers from './pages/UserManagement';
import AdminQuizzes from './pages/AdminQuizzes';
import AdminQuizEditor from './pages/EditQuiz';

function AppRoutes() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {isAuthenticated && <Sidebar />}
      <div style={{ flex: 1, padding: '1.5rem' }}>
        {isAuthenticated && <Navbar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          
          <Route path="/completed-lessons" element={<PrivateRoute><CompletedLessons /></PrivateRoute>} />
          <Route path="/quiz-history" element={<PrivateRoute><QuizHistory /></PrivateRoute>} />

          {/* Learner routes */}
          <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
          <Route path="/courses/:courseId" element={<PrivateRoute><CourseDetail /></PrivateRoute>} />
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
          <Route path="/completed-lessons" element={<PrivateRoute><CompletedLessons /></PrivateRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin-courses" element={<PrivateRoute><AdminCourses /></PrivateRoute>} />
          <Route path="/admin/courses/create" element={<PrivateRoute><AdminCourseEditor /></PrivateRoute>} />
          <Route path="/edit-course/:id" element={<PrivateRoute><AdminCourseEditor /></PrivateRoute>} />
          <Route path="/admin-lessons" element={<PrivateRoute><AdminLessons /></PrivateRoute>} />
          <Route path="/create-lesson" element={<PrivateRoute><CreateLesson /></PrivateRoute>} />
          <Route path="/edit-lesson/:id" element={<PrivateRoute><EditLesson /></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
          <Route path="/admin-quizzes" element={<PrivateRoute><AdminQuizzes /></PrivateRoute>} />
          <Route path="/create-quiz" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
          <Route path="/edit-quiz/:id" element={<PrivateRoute><AdminQuizEditor /></PrivateRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;
