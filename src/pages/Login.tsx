
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user) {
      console.log("User already authenticated, redirecting to dashboard");
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        {!isLoading && <LoginForm />}
      </div>
    </div>
  );
};

export default Login;
