
-- This migration ensures the profiles and teachers tables are correctly set up

-- First, ensure profiles table has necessary columns
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix the profiles schema if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles'
                AND column_name = 'school_id') THEN
    ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles'
                AND column_name = 'user_type') THEN
    ALTER TABLE public.profiles ADD COLUMN user_type TEXT;
  END IF;
END $$;

-- Make sure teachers table has required structure
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    school_id UUID REFERENCES public.schools(id),
    is_supervisor BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make sure students table has required structure
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    school_id UUID REFERENCES public.schools(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make sure session_logs table has required structure
CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    topic_or_content_used TEXT,
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    num_queries INTEGER NOT NULL DEFAULT 0,
    performance_metric JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make sure conversations table has required structure
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    title TEXT,
    topic TEXT,
    tags TEXT[],
    starred BOOLEAN DEFAULT false,
    summary TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make sure messages table has required structure
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id),
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    feedback_rating INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Ensure session logs are only accessible by the user who created them or by school admins
CREATE POLICY IF NOT EXISTS "Users can access their own session logs"
ON public.session_logs FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.profiles p ON p.id = t.id
    WHERE p.id = auth.uid() AND p.user_type IN ('school', 'school_admin') AND t.school_id = session_logs.school_id
  )
);

-- Ensure conversations are only accessible by the user who created them
CREATE POLICY IF NOT EXISTS "Users can access their own conversations"
ON public.conversations FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Ensure messages are only accessible by users who own the linked conversation
CREATE POLICY IF NOT EXISTS "Users can access messages in their conversations"
ON public.messages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

-- Ensure students can only be accessed by school admins or teachers of their school
CREATE POLICY IF NOT EXISTS "School staff can access students"
ON public.students FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.school_id = students.school_id AND p.user_type IN ('school', 'school_admin', 'teacher', 'teacher_supervisor')
  )
);

-- Allow students to see their own record
CREATE POLICY IF NOT EXISTS "Students can view their own record"
ON public.students FOR SELECT
TO authenticated
USING (id = auth.uid());
