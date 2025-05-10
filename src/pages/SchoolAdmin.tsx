
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Package2, Users, BookOpen, PieChart, Settings, School, UserPlus } from 'lucide-react';
import AdminNavbar from '@/components/school-admin/AdminNavbar';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import { toast } from 'sonner';

// Define the proper type for SchoolCodeGenerator props
interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
}

const SchoolAdmin = () => {
  const { user, profile } = useAuth();
  const [schoolStats, setSchoolStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSessions: 0,
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in or not a school admin
    if (!user || !profile || profile.user_type !== 'school_admin') {
      toast.error('You must be a school administrator to access this page.');
      navigate('/login');
      return;
    }

    const fetchSchoolStats = async () => {
      setIsLoading(true);
      try {
        const schoolId = profile.school_id;

        if (!schoolId) {
          throw new Error('School ID not found');
        }

        // Get student count
        const { count: studentCount, error: studentError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        if (studentError) throw studentError;

        // Get teacher count
        const { count: teacherCount, error: teacherError } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        if (teacherError) throw teacherError;

        // Get session count
        const { count: sessionCount, error: sessionError } = await supabase
          .from('session_logs')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        if (sessionError) throw sessionError;

        // Get average scores from student_performance_metrics
        const { data: performanceData, error: performanceError } = await supabase
          .from('student_performance_metrics')
          .select('avg_score')
          .eq('school_id', schoolId);

        if (performanceError) throw performanceError;

        // Calculate average score
        const avgScore = performanceData && performanceData.length > 0
          ? performanceData.reduce((acc, item) => acc + (item.avg_score || 0), 0) / performanceData.length
          : 0;

        setSchoolStats({
          totalStudents: studentCount || 0,
          totalTeachers: teacherCount || 0,
          totalSessions: sessionCount || 0,
          averageScore: Math.round(avgScore),
        });

      } catch (error: any) {
        console.error('Error fetching school stats:', error);
        toast.error('Failed to load school statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolStats();
  }, [user, profile, navigate]);

  // Create a properly typed handler for the SchoolCodeManager component
  const handleCodeGenerated = (code: string) => {
    toast.success('New invite code generated!');
    // Additional logic can be added here
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold gradient-text">School Administration</h1>
          </div>

          <AdminNavbar />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-gray-500">Loading school data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Students"
                value={schoolStats.totalStudents}
                icon={<Users className="h-8 w-8 text-blue-500" />}
              />
              <StatCard
                title="Total Teachers"
                value={schoolStats.totalTeachers}
                icon={<UserPlus className="h-8 w-8 text-green-500" />}
              />
              <StatCard
                title="Study Sessions"
                value={schoolStats.totalSessions}
                icon={<BookOpen className="h-8 w-8 text-purple-500" />}
              />
              <StatCard
                title="Avg. Score"
                value={`${schoolStats.averageScore}%`}
                icon={<PieChart className="h-8 w-8 text-orange-500" />}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ActionCard
                  title="Manage Teachers"
                  description="Add or manage school teachers"
                  icon={<UserPlus className="h-6 w-6" />}
                  onClick={() => navigate('/admin/teacher-management')}
                />
                <ActionCard
                  title="Student Management"
                  description="View and manage students"
                  icon={<Users className="h-6 w-6" />}
                  onClick={() => navigate('/admin/students')}
                />
                <ActionCard
                  title="View Analytics"
                  description="School performance reports"
                  icon={<PieChart className="h-6 w-6" />}
                  onClick={() => navigate('/admin/analytics')}
                />
                <ActionCard
                  title="School Settings"
                  description="Configure school preferences"
                  icon={<Settings className="h-6 w-6" />}
                  onClick={() => navigate('/admin/settings')}
                />
              </div>
            </div>
            <div>
              {/* Use properly typed component */}
              <SchoolCodeGenerator onCodeGenerated={handleCodeGenerated} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, icon }: StatCardProps) => (
  <Card>
    <CardContent className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
      </div>
      <div className="bg-gray-100 p-3 rounded-full">{icon}</div>
    </CardContent>
  </Card>
);

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ActionCard = ({ title, description, icon, onClick }: ActionCardProps) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={onClick}>
    <CardContent className="flex items-center gap-4 p-4">
      <div className="bg-gradient-to-r from-learnable-blue to-learnable-purple rounded-full p-2 text-white">
        {icon}
      </div>
      <div>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export default SchoolAdmin;
