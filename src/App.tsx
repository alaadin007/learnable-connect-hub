
import { Route, Routes } from 'react-router-dom'
import { Toaster } from "sonner";
import Home from './pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import SchoolAdmin from '@/pages/SchoolAdmin'
import AdminTeacherManagement from '@/pages/AdminTeacherManagement'
import TeacherStudents from '@/pages/TeacherStudents'
import TeacherAnalytics from '@/pages/TeacherAnalytics'
import AdminAnalytics from '@/pages/AdminAnalytics'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TestAccounts from '@/pages/TestAccounts'
import AcceptInvitation from '@/components/auth/AcceptInvitation'
import ChatWithAI from '@/pages/ChatWithAI'
import Features from '@/pages/Features'
import Pricing from '@/pages/Pricing'
import Documents from '@/pages/Documents'
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<SchoolAdmin />} />
          <Route path="/admin/teacher-management" element={<AdminTeacherManagement />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          <Route path="/chat" element={<ChatWithAI />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/test-accounts" element={<TestAccounts />} />
          <Route path="/invite/:token" element={<AcceptInvitation />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
