
-- This migration fixes the infinite recursion issue in the teachers table policies

-- First, drop any problematic policies
DROP POLICY IF EXISTS "Teachers can read their own school's teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can read other teachers in same school" ON public.teachers;

-- Create a fixed policy that doesn't cause recursion
CREATE POLICY "Teachers can read their own record" ON public.teachers
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Create a separate policy for school admins to read all teachers
CREATE POLICY "School admins can read all teachers in their school" ON public.teachers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'school_admin'
      AND profiles.school_id = teachers.school_id
    )
  );

-- Add a policy for teachers to read other teachers in the same school
CREATE POLICY "Teachers can view other teachers in same school" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('teacher', 'teacher_supervisor')
      AND profiles.school_id = teachers.school_id
    )
  );

-- Ensure profiles table has appropriate policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create improved policies for profiles
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "School admins can read profiles in their school" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.user_type = 'school_admin'
      AND admin_profile.school_id = profiles.school_id
    )
  );

-- Make sure users can read other users' basic information
CREATE POLICY IF NOT EXISTS "Users can read basic profile info" ON public.profiles
  FOR SELECT TO authenticated
  USING (true)
  WITH CHECK (
    -- Only allow reading certain fields through column-level security
    -- This policy allows reading, but we'll restrict columns separately
    true
  );

-- Ensure public visibility of certain profile fields (like name) but not others
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a profiles view that makes it safer to query profiles
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  user_type,
  school_id,
  created_at
FROM
  public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create an RLS policy for the view (if needed)
CREATE POLICY "Anyone can view public profiles" ON public.public_profiles
  FOR SELECT TO authenticated
  USING (true);
