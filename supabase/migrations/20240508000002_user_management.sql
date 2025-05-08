-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND user_type = role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's school
CREATE OR REPLACE FUNCTION get_user_school(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT school_id FROM public.profiles
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a teacher invitation
CREATE OR REPLACE FUNCTION create_teacher_invitation(
    p_school_id UUID,
    p_email TEXT,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
BEGIN
    -- Check if creator is a school admin
    IF NOT has_role(p_created_by, 'school_admin') THEN
        RAISE EXCEPTION 'Only school admins can create teacher invitations';
    END IF;

    -- Check if creator belongs to the school
    IF get_user_school(p_created_by) != p_school_id THEN
        RAISE EXCEPTION 'You can only create invitations for your own school';
    END IF;

    -- Generate invitation token
    v_token := encode(gen_random_bytes(32), 'hex');

    -- Create invitation
    INSERT INTO public.teacher_invitations (
        school_id,
        email,
        invitation_token,
        created_by
    )
    VALUES (
        p_school_id,
        p_email,
        v_token,
        p_created_by
    )
    RETURNING id INTO v_invitation_id;

    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a teacher invitation
CREATE OR REPLACE FUNCTION accept_teacher_invitation(
    p_invitation_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_school_id UUID;
BEGIN
    -- Get school_id from invitation
    SELECT school_id INTO v_school_id
    FROM public.teacher_invitations
    WHERE invitation_token = p_invitation_token
    AND is_accepted = false
    AND expires_at > NOW();

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Update invitation status
    UPDATE public.teacher_invitations
    SET is_accepted = true
    WHERE invitation_token = p_invitation_token;

    -- Update user profile
    UPDATE public.profiles
    SET school_id = v_school_id,
        user_type = 'teacher'
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 