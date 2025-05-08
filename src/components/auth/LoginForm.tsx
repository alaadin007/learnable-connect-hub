
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

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
    let errorDetails = '';

    try {
      // First try direct login through Supabase
      console.log('Attempting Supabase login directly...');

      // Test connection before attempting login
      try {
        // Simple check to verify Supabase connection
        const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1);
        if (testError) {
          console.error('Supabase connection error:', testError);
          errorDetails = `Connection error: ${testError.message}`;
        } else {
          console.log('Supabase connection successful');
        }
      } catch (connErr: any) {
        console.error('Connection test failed:', connErr);
        errorDetails = `Connection test failed: ${connErr.message}`;
      }

      // Proceed with login attempt
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          console.error('Direct login error:', error);
          toast.error(`Authentication error: ${error.message}`);
          setIsLoading(false);
          return;
        }

        if (data?.user) {
          console.log('Direct login successful, user:', data.user.id);
          
          // Now use the Auth context login
          const success = await login(values.email, values.password);
          
          if (success) {
            console.log('Context login successful, refreshing profile...');
            // Refresh the profile after login
            if (refreshProfile) {
              await refreshProfile();
            }
            
            toast.success('Successfully signed in');
            
            // Redirect to the appropriate page
            console.log('Redirecting to:', from);
            navigate(from, { replace: true });
          } else {
            console.error('Context login returned false but no error was thrown');
            toast.error('Login failed. Please check your credentials and try again.');
          }
        } else {
          console.error('No user returned from login but no error was thrown');
          toast.error('Unable to log in. Please try again.');
        }
      } catch (authErr: any) {
        console.error('Authentication error:', authErr);
        errorDetails = `Auth error: ${authErr.message}`;
        toast.error(`Authentication error: ${authErr.message}`);
      }
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      errorDetails += ` | Unexpected error: ${err.message}`;
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      if (errorDetails) {
        console.error('Login failed with details:', errorDetails);
        toast.error('Login failed. Please check console for details.');
      }
      setIsLoading(false);
    }
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
