-- Function to generate a unique school code
CREATE OR REPLACE FUNCTION generate_unique_school_code(school_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_code TEXT;
    final_code TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base code from school name (first 3 letters + random number)
    base_code := UPPER(SUBSTRING(REGEXP_REPLACE(school_name, '[^a-zA-Z]', '', 'g'), 1, 3));
    
    -- Add random numbers until we find a unique code
    LOOP
        IF counter = 0 THEN
            final_code := base_code || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        ELSE
            final_code := base_code || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0') || counter::TEXT;
        END IF;
        
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.schools WHERE code = final_code);
        counter := counter + 1;
        
        IF counter > 999 THEN
            RAISE EXCEPTION 'Could not generate unique school code';
        END IF;
    END LOOP;
    
    RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to register a new school
CREATE OR REPLACE FUNCTION register_school(
    p_school_name TEXT,
    p_admin_email TEXT,
    p_admin_full_name TEXT,
    p_contact_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    school_id UUID,
    school_code TEXT,
    admin_id UUID
) AS $$
DECLARE
    v_school_id UUID;
    v_school_code TEXT;
    v_admin_id UUID;
BEGIN
    -- Check if admin email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_admin_email) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Generate unique school code
    v_school_code := generate_unique_school_code(p_school_name);
    
    -- Create school record
    INSERT INTO public.schools (name, code, contact_email)
    VALUES (p_school_name, v_school_code, COALESCE(p_contact_email, p_admin_email))
    RETURNING id INTO v_school_id;
    
    -- Create school code record
    INSERT INTO public.school_codes (school_id, code)
    VALUES (v_school_id, v_school_code);
    
    -- Return the results
    RETURN QUERY SELECT 
        v_school_id,
        v_school_code,
        v_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 