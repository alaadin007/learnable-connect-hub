
-- Fix infinite recursion issues in RLS policies by creating security definer functions

-- 1. Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT user_type INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 2. Create a security definer function to check if a user belongs to a school
CREATE OR REPLACE FUNCTION public.is_user_in_school(user_id uuid DEFAULT auth.uid(), school_id_param uuid = NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_school_id uuid;
BEGIN
  SELECT school_id INTO user_school_id FROM public.profiles WHERE id = user_id;
  RETURN user_school_id = school_id_param OR school_id_param IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 3. Fix profiles table RLS policies to avoid recursion
DROP POLICY IF EXISTS "School staff can view profiles in same school" ON public.profiles;
CREATE POLICY "School staff can view profiles in same school" ON public.profiles
  FOR SELECT 
  USING (public.is_user_in_school(auth.uid(), school_id));

-- 4. Fix teachers table RLS policies to avoid recursion
DROP POLICY IF EXISTS "Teachers can view other teachers in same school" ON public.teachers;
CREATE POLICY "Teachers can view other teachers in same school" ON public.teachers
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('teacher', 'teacher_supervisor')
    AND public.is_user_in_school(auth.uid(), school_id)
  );

-- 5. Fix students table RLS policies
DROP POLICY IF EXISTS "School staff can read students" ON public.students;
CREATE POLICY "School staff can read students" ON public.students
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('school_admin', 'school', 'teacher', 'teacher_supervisor')
    AND public.is_user_in_school(auth.uid(), school_id)
  );

-- 6. Create a function to get user school ID without recursion
CREATE OR REPLACE FUNCTION public.get_user_school_id(uid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  school_id_var uuid;
BEGIN
  SELECT school_id INTO school_id_var FROM public.profiles WHERE id = uid;
  RETURN school_id_var;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
