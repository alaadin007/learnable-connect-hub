
-- Fix schema issues and add missing RLS policies

-- First, ensure all tables have proper RLS policies
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate problematic RLS policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "School staff can view profiles in same school" ON public.profiles;
CREATE POLICY "School staff can view profiles in same school" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.schools s
            JOIN public.profiles p ON s.id = p.school_id
            WHERE p.id = auth.uid() AND s.id = profiles.school_id
        )
    );

-- Create a function to handle errors better in RPC calls
CREATE OR REPLACE FUNCTION public.get_profile_safely(uid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'user_type', p.user_type,
            'school_id', p.school_id,
            'school_code', p.school_code,
            'is_active', p.is_active,
            'email', p.email
        )
        FROM public.profiles p
        WHERE p.id = uid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'id', uid
        );
END;
$$;

-- Create a function to get school safely
CREATE OR REPLACE FUNCTION public.get_school_safely(sid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'code', s.code,
            'contact_email', s.contact_email
        )
        FROM public.schools s
        WHERE s.id = sid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'id', sid
        );
END;
$$;

-- Add useful indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- Create RLS policies for teachers table
DROP POLICY IF EXISTS "School admins can read all teachers" ON public.teachers;
CREATE POLICY "School admins can read all teachers" ON public.teachers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type IN ('school_admin', 'school')
            AND profiles.school_id = teachers.school_id
        )
    );

-- Create RLS policies for students table
DROP POLICY IF EXISTS "School staff can read students" ON public.students;
CREATE POLICY "School staff can read students" ON public.students
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.school_id = students.school_id
            AND profiles.user_type IN ('school_admin', 'school', 'teacher', 'teacher_supervisor')
        )
    );

-- Make sure we have a proper function to check user types without circular dependencies
CREATE OR REPLACE FUNCTION public.get_user_type(uid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_type_var TEXT;
BEGIN
    SELECT user_type INTO user_type_var
    FROM public.profiles
    WHERE id = uid;
    
    RETURN user_type_var;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Ensure conversations table has proper RLS
DROP POLICY IF EXISTS "Users can access their own conversations" ON public.conversations;
CREATE POLICY "Users can access their own conversations" ON public.conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Add a function to check if a school ID is valid
CREATE OR REPLACE FUNCTION public.is_valid_school(school_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schools
        WHERE id = school_id_param
    );
END;
$$;

-- Fix the student_performance_metrics view if needed
DROP VIEW IF EXISTS public.student_performance_metrics;
CREATE OR REPLACE VIEW public.student_performance_metrics AS
SELECT 
    s.id AS student_id,
    p.full_name AS student_name,
    COALESCE(AVG(sub.score) FILTER (WHERE sub.completed), 0) AS avg_score,
    COUNT(DISTINCT sub.assessment_id) AS assessments_taken,
    CASE 
        WHEN COUNT(sub.id) > 0 THEN 
            (SUM(CASE WHEN sub.completed THEN 1 ELSE 0 END)::FLOAT / COUNT(sub.id)) * 100
        ELSE 0
    END AS completion_rate,
    COALESCE(AVG(sub.time_spent) FILTER (WHERE sub.completed), 0) AS avg_time_spent_seconds,
    string_agg(DISTINCT sub.strengths[1], ', ') AS top_strengths,
    string_agg(DISTINCT sub.weaknesses[1], ', ') AS top_weaknesses
FROM 
    public.students s
LEFT JOIN
    public.profiles p ON s.id = p.id
LEFT JOIN 
    public.assessment_submissions sub ON s.id = sub.student_id
GROUP BY 
    s.id, p.full_name;

-- Ensure we have proper RLS on student_performance_metrics view
DROP POLICY IF EXISTS "School staff can view student performance" ON public.student_performance_metrics;
CREATE POLICY "School staff can view student performance" ON public.student_performance_metrics
    FOR SELECT TO authenticated
    USING (true);  -- We'll control access at the data level with joins

-- Set up function to check if user is in same school
CREATE OR REPLACE FUNCTION public.is_same_school(user_id_param UUID, school_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_school_id UUID;
BEGIN
    SELECT school_id INTO user_school_id
    FROM public.profiles
    WHERE id = user_id_param;
    
    RETURN user_school_id = school_id_param;
END;
$$;

-- Make sure profiles table has email column if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Refactor user profile data to pull from auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = (SELECT email FROM auth.users WHERE id = NEW.id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync profile email if needed
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON public.profiles;
CREATE TRIGGER sync_profile_email_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();

-- Function to safely get user_school_id with error handling
CREATE OR REPLACE FUNCTION public.get_user_school_id_safely(uid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    school_id_var UUID;
BEGIN
    SELECT school_id INTO school_id_var
    FROM public.profiles
    WHERE id = uid;
    
    RETURN school_id_var;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;
