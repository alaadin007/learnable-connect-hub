
import React, { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import Sidebar, { SidebarLink } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart2, 
  School, 
  Users, 
  UserPlus,
  Settings, 
  Home
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const AdminLayout = ({ 
  children, 
  title = "School Admin Dashboard", 
  subtitle = "Manage your school's teachers, students, and settings" 
}: AdminLayoutProps) => {
  const { profile } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-grow flex">
        <Sidebar className="hidden md:block bg-white border-r border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-100">
            <h2 className="text-xl font-bold text-gray-800">School Admin</h2>
            <p className="text-sm text-gray-500 mt-1">
              {profile?.school_name || 'School Management'}
            </p>
          </div>
          
          <div className="py-4">
            <SidebarLink to="/admin" icon={<Home className="h-5 w-5" />}>Dashboard</SidebarLink>
            <SidebarLink to="/admin/teachers" icon={<UserPlus className="h-5 w-5" />}>Teachers</SidebarLink>
            <SidebarLink to="/admin/students" icon={<Users className="h-5 w-5" />}>Students</SidebarLink>
            <SidebarLink to="/admin/analytics" icon={<BarChart2 className="h-5 w-5" />}>Analytics</SidebarLink>
            <SidebarLink to="/admin/settings" icon={<Settings className="h-5 w-5" />}>Settings</SidebarLink>
          </div>
        </Sidebar>
      
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-8">
            {title && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
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

export default AdminLayout;
