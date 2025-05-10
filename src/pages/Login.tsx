
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { usePagePerformance } from '@/hooks/usePagePerformance';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, isLoading } = useAuth();
  
  // Get the intended destination from location state or default to dashboard
  const from = location.state?.from || '/dashboard';
  
  // Track performance
  usePagePerformance("LoginPage");
  
  useEffect(() => {
    // If user is already authenticated, redirect based on normalized role
    if (user && !isLoading) {
      console.log("User already logged in, redirecting based on role:", userRole);
      
      const normalizedRole = userRole === 'school' ? 'school_admin' : userRole;
      
      if (normalizedRole === 'school_admin') {
        navigate('/admin', { replace: true });
      } else if (normalizedRole === 'teacher') {
        navigate('/teacher/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, userRole, navigate, isLoading, from]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">LearnAble</h1>
          <p className="mt-2 text-gray-600">Your AI Learning Assistant</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
