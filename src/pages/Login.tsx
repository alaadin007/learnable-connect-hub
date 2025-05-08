
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/landing/Footer';
import Navbar from '@/components/layout/Navbar';
import LoginForm from '@/components/auth/LoginForm';
import LoginDebug from '@/components/auth/LoginDebug';

const Login = () => {
  const { isAuthenticated, user, userType } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    console.log('Login page loaded', { isAuthenticated, user, userType, from });
    
    if (isAuthenticated && user && userType) {
      console.log('User is authenticated, redirecting', { userType });
      
      let redirectPath = '/dashboard';
      
      // Redirect based on user type
      if (userType === 'student') {
        redirectPath = '/student/dashboard';
      } else if (userType === 'teacher') {
        redirectPath = '/teacher/dashboard';
      } else if (userType === 'school') {
        // School admin
        redirectPath = '/admin';
      }
      
      // Use the 'from' path if it exists and is not the login or register page
      const shouldUseFromPath = 
        from && 
        from !== '/login' && 
        from !== '/register' && 
        !from.includes('invitation');
        
      const finalPath = shouldUseFromPath ? from : redirectPath;
      console.log('Redirecting to', finalPath);
      
      // Direct redirect without delay since we've simplified the auth logic
      navigate(finalPath, { replace: true });
    }
  }, [isAuthenticated, user, userType, navigate, from]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center bg-learnable-super-light">
        <div className="w-full max-w-md px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
            <p className="text-learnable-gray mt-2">
              Log in to continue your learning journey
            </p>
          </div>

          <LoginForm />
          
          <LoginDebug />

          <div className="mt-6 text-center">
            <p className="text-learnable-gray">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
            <div className="mt-4">
              <Button variant="link" asChild>
                <Link to="/test-accounts" className="text-learnable-gray">
                  Want to try a demo account?
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
