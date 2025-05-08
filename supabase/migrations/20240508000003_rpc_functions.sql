
-- Create a function to check if an email exists in the auth system
CREATE OR REPLACE FUNCTION check_if_email_exists(input_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = input_email
  ) INTO email_exists;
  
  RETURN email_exists;
END;
$$;

-- Create a function to get user role by email
CREATE OR REPLACE FUNCTION get_user_role_by_email(input_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  user_role TEXT;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id FROM auth.users WHERE email = input_email;
  
  -- If no user found, return null
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get user_type from profiles table
  SELECT user_type INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- Map school_admin to school for consistency
  IF user_role = 'school_admin' THEN
    RETURN 'School Administrator';
  ELSIF user_role = 'teacher' OR user_role = 'teacher_supervisor' THEN
    RETURN 'Teacher';
  ELSIF user_role = 'student' THEN
    RETURN 'Student';
  END IF;
  
  -- Return the role with first letter capitalized
  RETURN INITCAP(user_role);
END;
$$;

-- Function to check auth status efficiently
CREATE OR REPLACE FUNCTION check_auth_status()
RETURNS TABLE(
  is_authenticated BOOLEAN,
  user_id UUID,
  email TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Return false if no user authenticated
  IF current_user_id IS NULL THEN
    is_authenticated := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Get user email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Get user role
  SELECT user_type INTO user_role
  FROM public.profiles
  WHERE id = current_user_id;
  
  -- Return user info
  is_authenticated := TRUE;
  user_id := current_user_id;
  email := user_email;
  role := user_role;
  RETURN NEXT;
  RETURN;
END;
$$;
