-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('school_admin', 'teacher_supervisor', 'teacher', 'student', 'system_admin');

-- Create tables
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    school_id UUID REFERENCES public.schools(id),
    user_type user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_school_codes_school_id ON public.school_codes(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_school_id ON public.teacher_invitations(school_id);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Schools
CREATE POLICY "Enable read access for authenticated users" ON public.schools
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Enable insert for school registration" ON public.schools
    FOR INSERT TO anon
    WITH CHECK (true);

-- School Codes
CREATE POLICY "Enable read for school admins" ON public.school_codes
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.school_id = school_codes.school_id
        AND profiles.id = auth.uid()
        AND profiles.user_type = 'school_admin'
    ));

-- Profiles
CREATE POLICY "Users can read their own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for registration" ON public.profiles
    FOR INSERT TO public
    WITH CHECK (true);

-- Teacher Invitations
CREATE POLICY "School admins can manage invitations" ON public.teacher_invitations
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.school_id = teacher_invitations.school_id
        AND profiles.id = auth.uid()
        AND profiles.user_type = 'school_admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.school_id = teacher_invitations.school_id
        AND profiles.id = auth.uid()
        AND profiles.user_type = 'school_admin'
    ));

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, user_type)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'user_type')::user_role);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 