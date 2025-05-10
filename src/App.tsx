
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Contact from './pages/Contact';
import Features from './pages/Features';
import SchoolRegistration from './pages/SchoolRegistration';
import Pricing from './pages/Pricing';
import ChatWithAI from './pages/ChatWithAI';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SchoolAdmin from './pages/SchoolAdmin';
import TeacherInvitation from './pages/TeacherInvitation';
import SchoolSettings from './pages/SchoolSettings';
import AdminTeacherManagement from './pages/AdminTeacherManagement';
import Documents from './pages/Documents';
import AdminAnalytics from './pages/AdminAnalytics';
import TeacherAnalytics from './pages/TeacherAnalytics';
import TeacherStudents from './pages/TeacherStudents';
import AdminTeachers from './pages/AdminTeachers';
import AdminStudents from './pages/AdminStudents';
import TestAccounts from './pages/TestAccounts';
import StudentLectures from './pages/StudentLectures';
import StudentLectureView from './pages/StudentLectureView';
import StudentProgress from './pages/StudentProgress';
import StudentSettings from './pages/StudentSettings';
import StudentAssessments from './pages/StudentAssessments';
import StudentAssessmentTaker from './pages/StudentAssessmentTaker';
import StudentAssessmentResults from './pages/StudentAssessmentResults';
import TeacherAssessments from './pages/TeacherAssessments';
import TeacherAssessmentResults from './pages/TeacherAssessmentResults';
import TeacherAssessmentSubmission from './pages/TeacherAssessmentSubmission';
import AssessmentCreator from './components/teacher/AssessmentCreator';
import TeacherDashboard from './pages/TeacherDashboard';
import { initPerformanceMonitoring } from './utils/performanceMonitor';
import { initRoutePreloader, preloadAnticipatedRoutes } from './utils/routePreloader';

function App() {
  const location = useLocation();
  const navigationType = useNavigationType();
  
  // Initialize performance monitoring
  useEffect(() => {
    const cleanup = initPerformanceMonitoring();
    const preloaderCleanup = initRoutePreloader();
    
    return () => {
      cleanup();
      preloaderCleanup();
    };
  }, []);
  
  // Track navigation performance
  useEffect(() => {
    // Only measure if this is not the initial load
    if (navigationType !== 'POP') {
      const pageStart = performance.now();
      
      // Mark the navigation start
      performance.mark(`navigation-${location.pathname}-start`);
      
      const markEndAndMeasure = () => {
        const pageEnd = performance.now();
        performance.mark(`navigation-${location.pathname}-end`);
        performance.measure(
          `navigation-${location.pathname}`,
          `navigation-${location.pathname}-start`,
          `navigation-${location.pathname}-end`
        );
        
        console.log(`[Navigation] ${location.pathname} loaded in ${Math.round(pageEnd - pageStart)}ms`);
      };
      
      // Mark end on next tick after render
      setTimeout(markEndAndMeasure, 0);
      
      // Preload anticipated routes
      preloadAnticipatedRoutes(location.pathname);
    }
  }, [location.pathname, navigationType]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/school-registration" element={<SchoolRegistration />} />
      <Route path="/teacher/invitation/:token" element={<TeacherInvitation />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatWithAI /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />

      {/* School admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><SchoolAdmin /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><SchoolSettings /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/teacher-management" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><AdminTeacherManagement /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/test-accounts" element={<ProtectedRoute allowedRoles={['school_admin', 'school']}><TestAccounts /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherStudents /></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherAnalytics /></ProtectedRoute>} />
      <Route path="/teacher/assessments" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherAssessments /></ProtectedRoute>} />
      <Route path="/teacher/assessments/create" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><AssessmentCreator /></ProtectedRoute>} />
      <Route path="/teacher/assessments/:id" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherAssessmentResults /></ProtectedRoute>} />
      <Route path="/teacher/assessments/:assessmentId/submissions/:submissionId" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><TeacherAssessmentSubmission /></ProtectedRoute>} />
      
      {/* Student routes */}
      <Route path="/student/lectures" element={<ProtectedRoute><StudentLectures /></ProtectedRoute>} />
      <Route path="/student/lecture/:lectureId" element={<ProtectedRoute><StudentLectureView /></ProtectedRoute>} />
      <Route path="/student/assessments" element={<ProtectedRoute><StudentAssessments /></ProtectedRoute>} />
      <Route path="/student/assessment/:id" element={<ProtectedRoute><StudentAssessmentTaker /></ProtectedRoute>} />
      <Route path="/student/assessment/:assessmentId/results/:submissionId" element={<ProtectedRoute><StudentAssessmentResults /></ProtectedRoute>} />
      <Route path="/student/progress" element={<ProtectedRoute><StudentProgress /></ProtectedRoute>} />
      <Route path="/student/settings" element={<ProtectedRoute><StudentSettings /></ProtectedRoute>} />
      
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
