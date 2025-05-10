
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { usePagePerformance } from '@/hooks/usePagePerformance';

const Login = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading } = useAuth();
  
  // Track performance
  usePagePerformance("LoginPage");
  
  useEffect(() => {
    // If user is already authenticated, redirect based on role
    if (user && !isLoading) {
      if (userRole === 'school_admin' || userRole === 'school') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'teacher') {
        navigate('/teacher/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, userRole, navigate, isLoading]);
  
  if (isLoading) {
    return null; // Don't show anything while checking auth state
  }
  
  // Only show login form if user is not already authenticated
  if (!user) {
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
  }
  
  return null; // This will briefly show before redirecting
};

export default Login;
