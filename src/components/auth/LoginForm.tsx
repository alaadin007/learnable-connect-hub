
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isTestUser } from '@/utils/supabaseTypeHelpers';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    console.log('LoginForm: Attempting login for', values.email);
    
    try {
      // First check if the Supabase client is properly initialized
      if (!supabase) {
        console.error('Supabase client not initialized');
        toast.error('Authentication service unavailable. Please try again later.');
        setIsLoading(false);
        return;
      }

      // For test accounts, handle them with special password
      if (isTestUser(values.email)) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email, 
          password: 'password123'
        });
        
        if (error) {
          console.error('Test account login error:', error);
          toast.error(`Login failed: ${error.message}`);
        } else {
          toast.success('Successfully signed in with test account');
        }
        
        setIsLoading(false);
        return;
      }

      // Standard email/password login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });
      
      if (error) {
        console.error('Login error:', error);
        toast.error(`Login failed: ${error.message}`);
      } else {
        toast.success('Successfully signed in');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(`Login failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle test account login shortcuts
  const loginWithTestAccount = (type: 'student' | 'teacher' | 'school') => {
    const email = `${type}.test@learnable.edu`;
    form.setValue('email', email);
    form.setValue('password', 'password123');
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Login</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm">
            <p className="text-gray-500 mb-2">Quick access with test accounts:</p>
            <div className="flex justify-center space-x-2">
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                onClick={() => loginWithTestAccount('student')}
                className="text-xs"
              >
                Student
              </Button>
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                onClick={() => loginWithTestAccount('teacher')}
                className="text-xs"
              >
                Teacher
              </Button>
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                onClick={() => loginWithTestAccount('school')}
                className="text-xs"
              >
                School
              </Button>
            </div>
          </div>
        </form>
      </Form>
      
      <div className="mt-6 text-center text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
          Forgot your password?
        </Link>
      </div>
      
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-600">Don't have an account?</span>{' '}
        <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
          Register
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
