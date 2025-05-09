
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { School } from 'lucide-react';
import { testSupabaseConnection } from '@/utils/apiHelpers';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type FormValues = z.infer<typeof formSchema>;

const LoginForm = () => {
  const { signIn, session } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoginError(null);
    setIsLoading(true);
    
    try {
      // First, test the connection to make sure Supabase is reachable
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        throw new Error(`Connection to database failed: ${connectionTest.error}`);
      }
      
      console.log(`Attempting login with email: ${values.email}`);
      const result = await signIn(values.email, values.password);
      
      if (result.success) {
        console.log("Login successful, redirecting to dashboard");
        toast.success("Login successful!");
        navigate('/dashboard');
      } else {
        console.error("Login failed:", result.error);
        setLoginError(result.error || 'Login failed. Please check your credentials.');
        toast.error(result.error || 'Login failed');
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      setLoginError(error.message || 'An unexpected error occurred');
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // If session exists, redirect to dashboard
  React.useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleTestAccounts = () => {
    navigate('/test-accounts');
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="your.email@example.com" 
                    className="py-2" 
                    {...field} 
                  />
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
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="py-2" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {loginError && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
              {loginError}
            </div>
          )}

          <div className="flex justify-between items-center">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login"}
          </Button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Testing Options</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border border-amber-300 text-amber-700 py-2 hover:bg-amber-50"
            onClick={handleTestAccounts}
          >
            <School className="h-4 w-4" />
            <span>Use Test Accounts</span>
          </Button>
        </form>
      </Form>

      <div className="text-center pt-3">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
