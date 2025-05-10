
import React, { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import Sidebar, { SidebarLink } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users,
  BookOpen,
  FileText,
  BarChart2,
  MessageSquare,
  Settings
} from 'lucide-react';

interface TeacherLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const TeacherLayout = ({ 
  children, 
  title = "Teacher Dashboard", 
  subtitle = "Manage your students and view analytics" 
}: TeacherLayoutProps) => {
  const { profile } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex">
        <Sidebar className="hidden md:block bg-white border-r border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-blue-600">Teacher Portal</h2>
            <p className="text-sm text-gray-500 mt-1">
              {profile?.full_name || 'Teacher Dashboard'}
            </p>
          </div>
          
          <div className="py-4">
            <SidebarLink to="/teacher/analytics" icon={<BarChart2 className="h-5 w-5" />}>Dashboard</SidebarLink>
            <SidebarLink to="/teacher/students" icon={<Users className="h-5 w-5" />}>Students</SidebarLink>
            <SidebarLink to="/teacher/assessments" icon={<FileText className="h-5 w-5" />}>Assessments</SidebarLink>
            <SidebarLink to="/chat" icon={<MessageSquare className="h-5 w-5" />}>AI Chat</SidebarLink>
            <SidebarLink to="/documents" icon={<BookOpen className="h-5 w-5" />}>Documents</SidebarLink>
          </div>
        </Sidebar>
      
        <main className="flex-grow bg-blue-50">
          <div className="container mx-auto px-4 py-8">
            {title && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-blue-800">{title}</h1>
                {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default TeacherLayout;
