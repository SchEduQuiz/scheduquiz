import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import { PageTransition, LoadingSpinner } from './components/animations';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import LessonQuiz from './pages/LessonQuiz';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import PasswordResetPage from './pages/auth/PasswordResetPage';
import StudentDashboard from './pages/student/StudentDashboard';
import AssignmentSubmission from './pages/student/AssignmentSubmission';
import Achievements from './pages/student/Achievements';
import Bookmarks from './pages/student/Bookmarks';
import StudentResources from './pages/student/StudentResources';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseCatalog from './pages/courses/CourseCatalog';
import CourseDetails from './pages/courses/CourseDetails';
import LessonView from './pages/courses/LessonView';
import LessonDiscussionsPage from './pages/discussions/LessonDiscussionsPage';
import AssignmentDiscussionsPage from './pages/discussions/AssignmentDiscussionsPage';
import { Messages, ComposeMessage, MessageView } from './pages/messages';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} color="text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={
          <PageTransition>
            <HomePage />
          </PageTransition>
        } />
        <Route 
          path="quiz/:category" 
          element={
            <PrivateRoute>
              <PageTransition>
                <QuizPage />
              </PageTransition>
            </PrivateRoute>
          } 
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<PasswordResetPage />} />
        
        <Route path="courses" element={<CourseCatalog />} />
        <Route path="courses/:courseId" element={<CourseDetails />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonView />} />
        <Route 
          path="courses/:courseId/lessons/:lessonId/discussions" 
          element={
            <PrivateRoute>
              <LessonDiscussionsPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="courses/:courseId/assignments/:assignmentId/discussions" 
          element={
            <PrivateRoute>
              <AssignmentDiscussionsPage />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="quiz/lesson/:quizId" 
          element={
            <PrivateRoute>
              <LessonQuiz />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="analytics" 
          element={
            <PrivateRoute>
              <AnalyticsPage />
            </PrivateRoute>
          } 
        />
        
        <Route
          path="student/dashboard"
          element={
            <PrivateRoute requiredRole="student">
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="student/assignments/:assignmentId"
          element={
            <PrivateRoute requiredRole="student">
              <AssignmentSubmission />
            </PrivateRoute>
          }
        />
        <Route
          path="student/achievements"
          element={
            <PrivateRoute requiredRole="student">
              <Achievements />
            </PrivateRoute>
          }
        />
        <Route
          path="student/bookmarks"
          element={
            <PrivateRoute requiredRole="student">
              <Bookmarks />
            </PrivateRoute>
          }
        />
        <Route
          path="student/resources"
          element={
            <PrivateRoute requiredRole="student">
              <StudentResources />
            </PrivateRoute>
          }
        />
        <Route
          path="teacher/dashboard"
          element={
            <PrivateRoute requiredRole="teacher">
              <TeacherDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="admin/dashboard"
          element={
            <PrivateRoute requiredRole="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        
        <Route
          path="messages"
          element={
            <PrivateRoute>
              <Messages />
            </PrivateRoute>
          }
        />
        <Route
          path="messages/compose"
          element={
            <PrivateRoute>
              <ComposeMessage />
            </PrivateRoute>
          }
        />
        <Route
          path="messages/:messageId"
          element={
            <PrivateRoute>
              <MessageView />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
