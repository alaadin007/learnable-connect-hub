

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'Standard public schema with direct database functions replacing edge functions';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'school_admin',
    'teacher_supervisor',
    'teacher',
    'student',
    'system_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_teacher_invitation"("token" "text", "user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invitation_record public.teacher_invitations;
  user_email TEXT;
  existing_teacher_count INT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;

  -- Get the invitation
  SELECT * INTO invitation_record
  FROM public.teacher_invitations
  WHERE invitation_token = token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Check if email matches
  IF invitation_record.email != user_email THEN
    RAISE EXCEPTION 'Invitation email does not match user email';
  END IF;

  -- Mark invitation as accepted
  UPDATE public.teacher_invitations
  SET status = 'accepted'
  WHERE id = invitation_record.id;

  -- Check if the teacher record already exists
  SELECT COUNT(*) INTO existing_teacher_count
  FROM public.teachers
  WHERE id = user_id;

  -- Create teacher record if it doesn't exist
  IF existing_teacher_count = 0 THEN
    INSERT INTO public.teachers (id, school_id, is_supervisor)
    VALUES (user_id, invitation_record.school_id, false);
  END IF;

  -- Update profile user_type if needed
  UPDATE public.profiles
  SET user_type = 'teacher',
      school_code = (SELECT code FROM public.schools WHERE id = invitation_record.school_id)
  WHERE id = user_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."accept_teacher_invitation"("token" "text", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_role"("user_id_param" "uuid", "role_param" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the user already has this role
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_id_param AND role = role_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_param, role_param);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."assign_role"("user_id_param" "uuid", "role_param" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_if_email_exists"("input_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  -- First check profiles table
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.email = input_email
  ) INTO email_exists;
  
  -- If not found in profiles, check auth.users table
  IF NOT email_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE users.email = input_email
    ) INTO email_exists;
  END IF;
  
  RETURN email_exists;
END;
$$;


ALTER FUNCTION "public"."check_if_email_exists"("input_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_valid_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students WHERE id = NEW.user_id
    UNION
    SELECT 1 FROM public.teachers WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Invalid user_id: must be a student or teacher ID';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_valid_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_session_log"("topic" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id_var UUID;
    school_id_var UUID;
    log_id UUID;
BEGIN
    -- Get the current user ID
    user_id_var := auth.uid();
    
    -- Exit if no user is authenticated
    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get the school ID for the user
    SELECT school_id INTO school_id_var
    FROM public.students
    WHERE id = user_id_var;
    
    -- Exit if the user is not a student or doesn't have a school
    IF school_id_var IS NULL THEN
        RAISE EXCEPTION 'User must be a student with an associated school';
    END IF;
    
    -- Insert the new session log
    INSERT INTO public.session_logs (
        user_id,
        school_id,
        topic_or_content_used
    ) VALUES (
        user_id_var,
        school_id_var,
        topic
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."create_session_log"("topic" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_student_invitation"("school_id_param" "uuid") RETURNS TABLE("code" "text", "expires_at" timestamp with time zone, "invite_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_code TEXT;
  new_invite_id UUID;
  new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a new code
  SELECT generate_invitation_code() INTO new_code;
  
  -- Set expiration date (7 days from now)
  new_expires_at := now() + INTERVAL '7 days';
  
  -- Insert the invitation
  INSERT INTO student_invites (
    school_id,
    code,
    status,
    expires_at
  ) VALUES (
    school_id_param,
    new_code,
    'pending',
    new_expires_at
  ) RETURNING id INTO new_invite_id;
  
  -- Return the code, expiry and ID
  RETURN QUERY SELECT new_code, new_expires_at, new_invite_id;
END;
$$;


ALTER FUNCTION "public"."create_student_invitation"("school_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_session_log"("log_id" "uuid", "performance_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update the session_end and performance_metric for the specified log
    UPDATE public.session_logs
    SET 
        session_end = NOW(),
        performance_metric = COALESCE(performance_data, performance_metric)
    WHERE id = log_id
    AND session_end IS NULL
    AND user_id = auth.uid();
    
    -- If no rows were updated, likely invalid log_id or session already ended
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid session log ID or session already ended';
    END IF;
END;
$$;


ALTER FUNCTION "public"."end_session_log"("log_id" "uuid", "performance_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invitation_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- excludes similar looking characters
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate an 8 character code
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invitation_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invitation_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN LOWER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 20));
END;
$$;


ALTER FUNCTION "public"."generate_invitation_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_school_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8));
END;
$$;


ALTER FUNCTION "public"."generate_school_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_api_key"("service" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  key_value TEXT;
BEGIN
  SELECT api_key INTO key_value
  FROM public.api_keys
  WHERE service_name = service
  LIMIT 1;
  
  RETURN key_value;
END;
$$;


ALTER FUNCTION "public"."get_api_key"("service" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_school_info"() RETURNS TABLE("school_id" "uuid", "school_name" "text", "school_code" "text", "contact_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id UUID;
  school_id_var UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Find school ID from teachers table (includes school admins)
  SELECT school_id INTO school_id_var
  FROM teachers
  WHERE id = current_user_id;
  
  -- Return school details
  RETURN QUERY
  SELECT s.id, s.name, s.code, s.contact_email
  FROM schools s
  WHERE s.id = school_id_var;
END;
$$;


ALTER FUNCTION "public"."get_current_school_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_school_by_code"("input_code" "text") RETURNS TABLE("id" "uuid", "name" "text", "school_code" "text", "active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.name,
    sc.code,
    sc.active
  FROM 
    public.schools s
  JOIN 
    public.school_codes sc ON s.code = sc.code
  WHERE 
    sc.code = input_code
    AND sc.active = true;
END;
$$;


ALTER FUNCTION "public"."get_school_by_code"("input_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_school_improvement_metrics"("p_school_id" "uuid", "p_months_to_include" integer DEFAULT 6) RETURNS TABLE("month" "date", "avg_monthly_score" numeric, "monthly_completion_rate" numeric, "score_improvement_rate" numeric, "completion_improvement_rate" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  WITH monthly_averages AS (
    SELECT 
      DATE_TRUNC('month', submitted_at)::DATE AS month,
      ROUND(AVG(score) FILTER (WHERE completed), 1) AS avg_monthly_score,
      ROUND((COUNT(*) FILTER (WHERE completed)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) AS monthly_completion_rate
    FROM 
      public.assessment_submissions sub
    JOIN
      public.assessments a ON sub.assessment_id = a.id
    WHERE
      a.school_id = p_school_id
      AND submitted_at >= (CURRENT_DATE - (p_months_to_include || ' months')::INTERVAL)
    GROUP BY 
      DATE_TRUNC('month', submitted_at)::DATE
  ),
  previous_month AS (
    SELECT 
      month,
      avg_monthly_score,
      monthly_completion_rate,
      LAG(avg_monthly_score) OVER (ORDER BY month) AS prev_avg_score,
      LAG(monthly_completion_rate) OVER (ORDER BY month) AS prev_completion_rate
    FROM 
      monthly_averages
  )
  SELECT 
    pm.month,
    pm.avg_monthly_score,
    pm.monthly_completion_rate,
    CASE 
      WHEN pm.prev_avg_score > 0 THEN 
        ROUND(((pm.avg_monthly_score - pm.prev_avg_score) / pm.prev_avg_score) * 100, 1)
      ELSE 0
    END AS score_improvement_rate,
    CASE 
      WHEN pm.prev_completion_rate > 0 THEN 
        ROUND(((pm.monthly_completion_rate - pm.prev_completion_rate) / pm.prev_completion_rate) * 100, 1)
      ELSE 0
    END AS completion_improvement_rate
  FROM 
    previous_month pm
  ORDER BY 
    pm.month;
$$;


ALTER FUNCTION "public"."get_school_improvement_metrics"("p_school_id" "uuid", "p_months_to_include" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_school_name_from_code"("code" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  name TEXT;
BEGIN
  SELECT school_name INTO name
  FROM public.school_codes
  WHERE school_codes.code = $1 AND active = true;
  
  RETURN name;
END;
$_$;


ALTER FUNCTION "public"."get_school_name_from_code"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_school_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("school_id" "uuid", "school_name" "text", "total_assessments" bigint, "students_with_submissions" bigint, "total_students" bigint, "avg_submissions_per_assessment" numeric, "avg_score" numeric, "completion_rate" numeric, "student_participation_rate" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    s.id AS school_id,
    s.name AS school_name,
    COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                       AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                       THEN a.id ELSE NULL END) AS total_assessments,
    COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                       AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                       THEN sub.student_id ELSE NULL END) AS students_with_submissions,
    (SELECT COUNT(*) FROM public.students WHERE school_id = s.id) AS total_students,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                             AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                             THEN a.id ELSE NULL END) > 0 THEN 
        ROUND(COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                THEN sub.id ELSE NULL END)::NUMERIC / 
              COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                                AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                                THEN a.id ELSE NULL END), 2) 
      ELSE 0 
    END AS avg_submissions_per_assessment,
    CASE 
      WHEN SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                   AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END) > 0 THEN 
        ROUND(AVG(sub.score) FILTER (WHERE sub.completed
                                    AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                    AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)), 1) 
      ELSE 0 
    END AS avg_score,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                             AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                             THEN sub.id ELSE NULL END) > 0 THEN 
        ROUND((SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                        AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END)::NUMERIC / 
                COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                  AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                  THEN sub.id ELSE NULL END)) * 100, 1) 
      ELSE 0 
    END AS completion_rate,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                             AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                             THEN sub.student_id ELSE NULL END) > 0 THEN 
        ROUND((COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                 AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                 THEN sub.student_id ELSE NULL END)::NUMERIC / 
                NULLIF((SELECT COUNT(*) FROM public.students WHERE school_id = s.id), 0)) * 100, 1) 
      ELSE 0 
    END AS student_participation_rate
  FROM 
    public.schools s
  LEFT JOIN 
    public.assessments a ON s.id = a.school_id
  LEFT JOIN 
    public.assessment_submissions sub ON a.id = sub.assessment_id
  WHERE 
    s.id = p_school_id
  GROUP BY 
    s.id, s.name;
$$;


ALTER FUNCTION "public"."get_school_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("student_id" "uuid", "student_name" "text", "assessments_taken" bigint, "avg_score" numeric, "avg_time_spent_seconds" numeric, "assessments_completed" bigint, "completion_rate" numeric, "top_strengths" "text", "top_weaknesses" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    s.id AS student_id,
    p.full_name AS student_name,
    COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                       AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                       THEN sub.assessment_id ELSE NULL END) AS assessments_taken,
    ROUND(AVG(sub.score) FILTER (WHERE sub.completed
                               AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                               AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)), 1) AS avg_score,
    ROUND(AVG(sub.time_spent) FILTER (WHERE sub.completed
                                    AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                    AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)), 0) AS avg_time_spent_seconds,
    SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
               AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END) AS assessments_completed,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                             AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                             THEN sub.id ELSE NULL END) > 0 THEN 
        ROUND((SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                        AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END)::NUMERIC / 
                COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                  AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                  THEN sub.id ELSE NULL END)) * 100, 1) 
      ELSE 0 
    END AS completion_rate,
    (
      SELECT STRING_AGG(strength, ', ')
      FROM (
        SELECT UNNEST(sub.strengths) AS strength
        FROM public.assessment_submissions sub
        WHERE sub.student_id = s.id 
          AND sub.completed
          AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
          AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
        GROUP BY strength
        ORDER BY COUNT(*) DESC
        LIMIT 3
      ) top_strengths
    ) AS top_strengths,
    (
      SELECT STRING_AGG(weakness, ', ')
      FROM (
        SELECT UNNEST(sub.weaknesses) AS weakness
        FROM public.assessment_submissions sub
        WHERE sub.student_id = s.id 
          AND sub.completed
          AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
          AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
        GROUP BY weakness
        ORDER BY COUNT(*) DESC
        LIMIT 3
      ) top_weaknesses
    ) AS top_weaknesses
  FROM 
    public.students s
  JOIN
    public.profiles p ON s.id = p.id
  LEFT JOIN 
    public.assessment_submissions sub ON s.id = sub.student_id
  WHERE 
    s.school_id = p_school_id
  GROUP BY 
    s.id, p.full_name;
$$;


ALTER FUNCTION "public"."get_student_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("teacher_id" "uuid", "teacher_name" "text", "assessments_created" bigint, "students_assessed" bigint, "avg_submissions_per_assessment" numeric, "avg_student_score" numeric, "completion_rate" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    t.id AS teacher_id,
    p.full_name AS teacher_name,
    COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                       AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                       THEN a.id ELSE NULL END) AS assessments_created,
    COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                       AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                       THEN sub.student_id ELSE NULL END) AS students_assessed,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                             AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                             THEN a.id ELSE NULL END) > 0 THEN 
        ROUND(COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                THEN sub.id ELSE NULL END)::NUMERIC / 
              COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR a.created_at >= p_start_date)
                                AND (p_end_date IS NULL OR a.created_at <= p_end_date)
                                THEN a.id ELSE NULL END), 2) 
      ELSE 0 
    END AS avg_submissions_per_assessment,
    CASE 
      WHEN SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                   AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END) > 0 THEN 
        ROUND(AVG(sub.score) FILTER (WHERE sub.completed
                                    AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                    AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)), 1) 
      ELSE 0 
    END AS avg_student_score,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                             AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                             THEN sub.id ELSE NULL END) > 0 THEN 
        ROUND((SUM(CASE WHEN sub.completed AND (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                        AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date) THEN 1 ELSE 0 END)::NUMERIC / 
                COUNT(DISTINCT CASE WHEN (p_start_date IS NULL OR sub.submitted_at >= p_start_date)
                                  AND (p_end_date IS NULL OR sub.submitted_at <= p_end_date)
                                  THEN sub.id ELSE NULL END)) * 100, 1) 
      ELSE 0 
    END AS completion_rate
  FROM 
    public.teachers t
  JOIN
    public.profiles p ON t.id = p.id
  LEFT JOIN 
    public.assessments a ON t.id = a.teacher_id
  LEFT JOIN 
    public.assessment_submissions sub ON a.id = sub.assessment_id
  WHERE 
    t.school_id = p_school_id
  GROUP BY 
    t.id, p.full_name;
$$;


ALTER FUNCTION "public"."get_teacher_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT user_type INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_by_email"("input_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  -- Find the user ID in auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = input_email;
  
  -- If no user found, return null
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the user role from profiles
  SELECT user_type INTO user_role 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role_by_email"("input_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_roles"() RETURNS SETOF "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_school_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_id_var UUID;
BEGIN
  -- Try to get from teachers table first
  SELECT school_id INTO school_id_var
  FROM public.teachers
  WHERE id = auth.uid();
  
  -- If not found, try students table
  IF school_id_var IS NULL THEN
    SELECT school_id INTO school_id_var
    FROM public.students
    WHERE id = auth.uid();
  END IF;
  
  RETURN school_id_var;
END;
$$;


ALTER FUNCTION "public"."get_user_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_school_id"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_id_var UUID;
  is_admin BOOLEAN;
BEGIN
  -- First check if user is a teacher
  SELECT school_id, is_supervisor INTO school_id_var, is_admin 
  FROM public.teachers
  WHERE id = user_id;
  
  -- If not a teacher, check if user is a student
  IF school_id_var IS NULL THEN
    SELECT school_id INTO school_id_var
    FROM public.students
    WHERE id = user_id;
  END IF;
  
  RETURN school_id_var;
END;
$$;


ALTER FUNCTION "public"."get_user_school_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  school_id_var UUID;
  school_code_var TEXT;
  validated_user_type TEXT;
BEGIN
  -- Map simplified user types to standard database values
  CASE LOWER(NEW.raw_user_meta_data->>'user_type')
    WHEN 'student' THEN validated_user_type := 'student';
    WHEN 'teacher' THEN validated_user_type := 'teacher';
    WHEN 'school_admin' THEN validated_user_type := 'school_admin';
    WHEN 'school' THEN validated_user_type := 'school_admin';
    WHEN 'admin' THEN validated_user_type := 'school_admin';
    WHEN 'teacher_supervisor' THEN validated_user_type := 'teacher_supervisor';
    WHEN 'system_admin' THEN validated_user_type := 'system_admin';
    ELSE validated_user_type := 'student'; -- Default to student if unknown
  END CASE;

  -- Insert into profiles table for all user types
  INSERT INTO public.profiles (
    id,
    user_type,
    full_name,
    school_code,
    school_name
  ) VALUES (
    NEW.id,
    validated_user_type,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'school_code',
    NEW.raw_user_meta_data->>'school_name'
  );
  
  -- Handle specific user types and assign roles automatically
  IF NEW.raw_user_meta_data->>'user_type' = 'school' OR NEW.raw_user_meta_data->>'user_type' = 'school_admin' THEN
    -- Generate a unique code if not provided
    school_code_var := COALESCE(NEW.raw_user_meta_data->>'school_code', 
               UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8)));
    
    -- First create the entry in school_codes table
    INSERT INTO public.school_codes (
      code,
      school_name,
      active
    ) 
    VALUES (
      school_code_var,
      NEW.raw_user_meta_data->>'school_name',
      true
    );
    
    -- Then create the school
    INSERT INTO public.schools (
      name,
      code
    ) 
    VALUES (
      NEW.raw_user_meta_data->>'school_name',
      school_code_var
    )
    RETURNING id INTO school_id_var;
    
    -- Register this user as a supervisor teacher
    INSERT INTO public.teachers (
      id,
      school_id,
      is_supervisor
    ) VALUES (
      NEW.id,
      school_id_var,
      true -- Mark as supervisor
    );
    
    -- Assign school_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'school_admin');
    
  ELSIF validated_user_type = 'teacher' OR validated_user_type = 'teacher_supervisor' THEN
    -- Get school ID from code
    school_code_var := NEW.raw_user_meta_data->>'school_code';
    
    SELECT id INTO school_id_var
    FROM public.schools
    WHERE code = school_code_var;
    
    -- Check if supervisor flag is set
    IF NEW.raw_user_meta_data->>'is_supervisor' = 'true' OR validated_user_type = 'teacher_supervisor' THEN
      -- Register as supervisor teacher
      INSERT INTO public.teachers (
        id,
        school_id,
        is_supervisor
      ) VALUES (
        NEW.id,
        school_id_var,
        true
      );
      
      -- Assign teacher_supervisor role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'teacher_supervisor');
    ELSE
      -- Register as regular teacher
      INSERT INTO public.teachers (
        id,
        school_id,
        is_supervisor
      ) VALUES (
        NEW.id,
        school_id_var,
        false
      );
      
      -- Assign teacher role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'teacher');
    END IF;
    
  ELSIF validated_user_type = 'student' THEN
    -- Get school ID from code
    school_code_var := NEW.raw_user_meta_data->>'school_code';
    
    SELECT id INTO school_id_var
    FROM public.schools
    WHERE code = school_code_var;
    
    -- Register as student
    INSERT INTO public.students (
      id,
      school_id
    ) VALUES (
      NEW.id,
      school_id_var
    );
    
    -- Assign student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_school_admin_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if this is a school admin registration (based on metadata)
  IF NEW.raw_user_meta_data->>'user_type' = 'school_admin' OR 
     NEW.raw_user_meta_data->>'user_type' = 'school' THEN
    
    -- Ensure the user has an entry in the user_roles table with school_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'school_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update the profile to ensure the user_type is consistent
    UPDATE public.profiles 
    SET user_type = 'school_admin'
    WHERE id = NEW.id;
    
    -- Check if we need to update the school record
    IF EXISTS (
      SELECT 1 FROM public.schools 
      WHERE code = (NEW.raw_user_meta_data->>'school_code')
    ) THEN
      -- Associate school admin with the school
      INSERT INTO public.teachers (id, school_id, is_supervisor)
      SELECT NEW.id, id, true
      FROM public.schools
      WHERE code = (NEW.raw_user_meta_data->>'school_code')
      ON CONFLICT (id) DO 
        UPDATE SET is_supervisor = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_school_admin_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("_roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY(_roles)
  );
$$;


ALTER FUNCTION "public"."has_any_role"("_roles" "public"."app_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_session_query_count"("log_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Increment the num_queries for the specified log
    UPDATE public.session_logs
    SET num_queries = num_queries + 1
    WHERE id = log_id
    AND (session_end IS NULL OR session_end > NOW())
    AND user_id = auth.uid();
    
    -- If no rows were updated, likely invalid log_id or session already ended
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid session log ID or session already ended';
    END IF;
END;
$$;


ALTER FUNCTION "public"."increment_session_query_count"("log_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_teacher"("teacher_email" "text", "inviter_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_id_var UUID;
  token TEXT;
  invitation_id UUID;
BEGIN
  -- Check if user is a supervisor
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id = inviter_id
    AND teachers.is_supervisor = true
  ) THEN
    RAISE EXCEPTION 'Only school supervisors can invite teachers';
  END IF;

  -- Get the school_id of the inviter
  SELECT teachers.school_id INTO school_id_var
  FROM public.teachers
  WHERE teachers.id = inviter_id;

  -- Generate a token
  token := public.generate_invitation_token();

  -- Create invitation
  INSERT INTO public.teacher_invitations (
    school_id,
    email,
    invitation_token,
    created_by
  ) VALUES (
    school_id_var,
    teacher_email,
    token,
    inviter_id
  )
  RETURNING id INTO invitation_id;

  RETURN invitation_id;
END;
$$;


ALTER FUNCTION "public"."invite_teacher"("teacher_email" "text", "inviter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_supervisor"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = $1
    AND role IN ('school_admin', 'teacher_supervisor')
  );
END;
$_$;


ALTER FUNCTION "public"."is_supervisor"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_supervisor"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_supervisor_var BOOLEAN;
BEGIN
  SELECT is_supervisor INTO is_supervisor_var
  FROM public.teachers
  WHERE id = user_id;
  
  RETURN COALESCE(is_supervisor_var, false);
END;
$$;


ALTER FUNCTION "public"."is_user_supervisor"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populatetestaccountwithsessions"("userid" "uuid", "schoolid" "uuid", "num_sessions" integer DEFAULT 10) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  i INTEGER;
  session_id UUID;
  random_topic TEXT;
  duration INTEGER;
  topics TEXT[] := ARRAY['Algebra equations', 'World War II', 'Chemical reactions', 'Shakespeare''s Macbeth', 'Programming basics'];
  teacher_id UUID;
  assessment_id UUID;
  submission_id UUID;
  mock_score INTEGER;
  mock_time_spent INTEGER;
  mock_strengths TEXT[];
  mock_weaknesses TEXT[];
BEGIN
  -- Find or create a teacher for the school
  SELECT id INTO teacher_id FROM public.teachers WHERE school_id = schoolId LIMIT 1;
  
  IF teacher_id IS NULL AND num_sessions > 0 THEN
    -- Create a mock teacher if none exists
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), 'mock-teacher@example.com', jsonb_build_object('user_type', 'teacher', 'full_name', 'Mock Teacher'));
    
    INSERT INTO public.profiles (id, user_type, full_name)
    VALUES (currval('auth.users_id_seq'), 'teacher', 'Mock Teacher');
    
    INSERT INTO public.teachers (id, school_id, is_supervisor)
    VALUES (currval('auth.users_id_seq'), schoolId, false)
    RETURNING id INTO teacher_id;
  END IF;
  
  -- Create mock session logs
  FOR i IN 1..num_sessions LOOP
    -- Pick a random topic
    random_topic := topics[1 + floor(random() * array_length(topics, 1))::integer];
    
    -- Create a session log
    INSERT INTO public.session_logs (
      user_id,
      school_id,
      topic_or_content_used,
      session_start,
      session_end,
      num_queries
    ) VALUES (
      userId,
      schoolId,
      random_topic,
      now() - (i || ' days')::interval - (floor(random() * 120)::integer || ' minutes')::interval,
      now() - (i || ' days')::interval,
      floor(random() * 10 + 5)::integer
    )
    RETURNING id INTO session_id;
    
    -- Create a mock assessment if teacher exists
    IF teacher_id IS NOT NULL THEN
      -- Create assessment
      INSERT INTO public.assessments (
        school_id,
        teacher_id,
        title,
        description,
        created_at,
        due_date,
        max_score
      ) VALUES (
        schoolId,
        teacher_id,
        'Assessment on ' || random_topic,
        'This is a mock assessment about ' || random_topic,
        now() - (i || ' days')::interval - (floor(random() * 24)::integer || ' hours')::interval,
        now() + (floor(random() * 14)::integer || ' days')::interval,
        100
      )
      RETURNING id INTO assessment_id;
      
      -- Generate mock score
      mock_score := floor(random() * 40 + 60)::integer;  -- Random score between 60-100
      mock_time_spent := floor(random() * 1800 + 600)::integer;  -- 10-40 minutes in seconds
      
      -- Generate mock strengths and weaknesses
      IF random_topic = 'Algebra equations' THEN
        mock_strengths := ARRAY['Equation solving', 'Variable manipulation'];
        mock_weaknesses := ARRAY['Word problems', 'Complex equations'];
      ELSIF random_topic = 'World War II' THEN
        mock_strengths := ARRAY['Historical events', 'Key figures'];
        mock_weaknesses := ARRAY['Dates', 'Political context'];
      ELSIF random_topic = 'Chemical reactions' THEN
        mock_strengths := ARRAY['Balancing equations', 'Reaction types'];
        mock_weaknesses := ARRAY['Organic chemistry', 'Reaction rates'];
      ELSIF random_topic = 'Shakespeare''s Macbeth' THEN
        mock_strengths := ARRAY['Character analysis', 'Themes'];
        mock_weaknesses := ARRAY['Historical context', 'Language techniques'];
      ELSE
        mock_strengths := ARRAY['Logic', 'Algorithms'];
        mock_weaknesses := ARRAY['Syntax', 'Advanced concepts'];
      END IF;
      
      -- Create assessment submission
      INSERT INTO public.assessment_submissions (
        assessment_id,
        student_id,
        score,
        submitted_at,
        time_spent,
        completed,
        feedback,
        strengths,
        weaknesses
      ) VALUES (
        assessment_id,
        userId,
        mock_score,
        now() - (i || ' days')::interval,
        mock_time_spent,
        TRUE,
        'Good work overall, but could improve on ' || mock_weaknesses[1],
        mock_strengths,
        mock_weaknesses
      )
      RETURNING id INTO submission_id;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."populatetestaccountwithsessions"("userid" "uuid", "schoolid" "uuid", "num_sessions" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proxy_gemini_request"("prompt" "text", "model" "text" DEFAULT 'gemini-1.0-pro'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  api_key TEXT;
  response jsonb;
BEGIN
  -- Get the Gemini API key
  SELECT public.get_api_key('gemini') INTO api_key;
  
  IF api_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Gemini API key not found');
  END IF;
  
  -- Make the API request using pg_net
  SELECT content INTO response
  FROM net.http_post(
    'https://generativelanguage.googleapis.com/v1beta/models/' || model || ':generateContent?key=' || api_key,
    jsonb_build_object(
      'contents', jsonb_build_array(
        jsonb_build_object('parts', jsonb_build_array(
          jsonb_build_object('text', prompt)
        ))
      )
    )::text,
    'application/json',
    array[
      net.http_header('Content-Type', 'application/json')
    ]
  );
  
  RETURN response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."proxy_gemini_request"("prompt" "text", "model" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proxy_openai_request"("prompt" "text", "model" "text" DEFAULT 'gpt-4o-mini'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  api_key TEXT;
  response jsonb;
BEGIN
  -- Get the OpenAI API key
  SELECT public.get_api_key('openai') INTO api_key;
  
  IF api_key IS NULL THEN
    RETURN jsonb_build_object('error', 'OpenAI API key not found');
  END IF;
  
  -- Make the API request using pg_net
  SELECT content INTO response
  FROM net.http_post(
    'https://api.openai.com/v1/chat/completions',
    jsonb_build_object(
      'model', model,
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', prompt)
      ),
      'temperature', 0.7
    )::text,
    'application/json',
    array[
      net.http_header('Authorization', 'Bearer ' || api_key),
      net.http_header('Content-Type', 'application/json')
    ]
  );
  
  RETURN response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."proxy_openai_request"("prompt" "text", "model" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_school"("p_school_name" "text", "p_admin_email" "text", "p_admin_full_name" "text", "p_contact_email" "text" DEFAULT NULL::"text") RETURNS TABLE("school_id" "uuid", "school_code" "text", "admin_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."register_school"("p_school_name" "text", "p_admin_email" "text", "p_admin_full_name" "text", "p_contact_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_role"("user_id_param" "uuid", "role_param" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = user_id_param AND role = role_param;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."remove_role"("user_id_param" "uuid", "role_param" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_api_key"("service" "text", "key_value" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'school_admin'
  ) THEN
    RAISE EXCEPTION 'Only school administrators can manage API keys';
  END IF;

  -- Insert or update the API key
  INSERT INTO public.api_keys (service_name, api_key)
  VALUES (service, key_value)
  ON CONFLICT (service_name) 
  DO UPDATE SET 
    api_key = EXCLUDED.api_key,
    updated_at = now();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."set_api_key"("service" "text", "key_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_topic"("log_id" "uuid", "topic" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update the topic_or_content_used for the specified log
    UPDATE public.session_logs
    SET topic_or_content_used = topic
    WHERE id = log_id
    AND (session_end IS NULL OR session_end > NOW())
    AND user_id = auth.uid();
    
    -- If no rows were updated, likely invalid log_id or session already ended
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid session log ID or session already ended';
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_session_topic"("log_id" "uuid", "topic" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_document_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students WHERE id = NEW.user_id
    UNION
    SELECT 1 FROM public.teachers WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Invalid user_id: must be a student or teacher ID';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_document_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_school_code"("code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  code_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.school_codes
    WHERE school_codes.code = $1 AND active = true
  ) INTO code_exists;
  
  RETURN code_exists;
END;
$_$;


ALTER FUNCTION "public"."verify_school_code"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_teacher_invitation"("token" "text") RETURNS TABLE("invitation_id" "uuid", "school_id" "uuid", "school_name" "text", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id AS invitation_id, 
    i.school_id,
    s.name AS school_name,
    i.email
  FROM public.teacher_invitations i
  JOIN public.schools s ON s.id = i.school_id
  WHERE i.invitation_token = token
    AND i.status = 'pending'
    AND i.expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
END;
$$;


ALTER FUNCTION "public"."verify_teacher_invitation"("token" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_name" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "score" integer,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_spent" integer,
    "completed" boolean DEFAULT false,
    "feedback" "text",
    "strengths" "text"[] DEFAULT '{}'::"text"[],
    "weaknesses" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."assessment_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" timestamp with time zone,
    "max_score" integer DEFAULT 100 NOT NULL
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "topic" "text",
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "starred" boolean DEFAULT false,
    "category" "text",
    "summary" "text"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "section_number" integer DEFAULT 1 NOT NULL,
    "content" "text",
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender" "text" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_important" boolean DEFAULT false,
    "feedback_rating" integer,
    CONSTRAINT "messages_sender_check" CHECK (("sender" = ANY (ARRAY['user'::"text", 'ai'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "session_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_end" timestamp with time zone,
    "num_queries" integer DEFAULT 0 NOT NULL,
    "topic_or_content_used" "text",
    "performance_metric" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."most_studied_topics" AS
 SELECT "sl"."school_id",
    "sl"."topic_or_content_used",
    "count"("sl"."id") AS "count_of_sessions",
    "row_number"() OVER (PARTITION BY "sl"."school_id" ORDER BY ("count"("sl"."id")) DESC) AS "topic_rank"
   FROM "public"."session_logs" "sl"
  WHERE ("sl"."topic_or_content_used" IS NOT NULL)
  GROUP BY "sl"."school_id", "sl"."topic_or_content_used";


ALTER TABLE "public"."most_studied_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "user_type" character varying NOT NULL,
    "full_name" "text",
    "school_code" "text",
    "school_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_user_type_check" CHECK ((("user_type")::"text" = ANY (ARRAY['student'::"text", 'teacher'::"text", 'school_admin'::"text", 'school'::"text", 'admin'::"text", 'teacher_supervisor'::"text", 'system_admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_email" "text",
    "description" "text",
    "notifications_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."school_analytics_summary" AS
 SELECT "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "count"(DISTINCT "sl"."user_id") AS "active_students",
    "max"("sl"."session_start") AS "latest_session_start",
    "count"("sl"."id") AS "total_sessions",
    "sum"("sl"."num_queries") AS "total_queries",
    "round"("avg"((EXTRACT(epoch FROM (COALESCE("sl"."session_end", "now"()) - "sl"."session_start")) / (60)::numeric)), 1) AS "avg_session_minutes"
   FROM ("public"."schools" "s"
     LEFT JOIN "public"."session_logs" "sl" ON (("s"."id" = "sl"."school_id")))
  GROUP BY "s"."id", "s"."name";


ALTER TABLE "public"."school_analytics_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "school_name" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."school_codes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."school_improvement_metrics" AS
 WITH "monthly_averages" AS (
         SELECT "a"."school_id",
            ("date_trunc"('month'::"text", "sub"."submitted_at"))::"date" AS "month",
            "round"("avg"("sub"."score") FILTER (WHERE "sub"."completed"), 1) AS "avg_monthly_score",
            "round"(((("count"(*) FILTER (WHERE "sub"."completed"))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 1) AS "monthly_completion_rate"
           FROM ("public"."assessment_submissions" "sub"
             JOIN "public"."assessments" "a" ON (("sub"."assessment_id" = "a"."id")))
          GROUP BY "a"."school_id", (("date_trunc"('month'::"text", "sub"."submitted_at"))::"date")
        ), "previous_month" AS (
         SELECT "monthly_averages"."school_id",
            "monthly_averages"."month",
            "monthly_averages"."avg_monthly_score",
            "monthly_averages"."monthly_completion_rate",
            "lag"("monthly_averages"."avg_monthly_score") OVER (PARTITION BY "monthly_averages"."school_id" ORDER BY "monthly_averages"."month") AS "prev_avg_score",
            "lag"("monthly_averages"."monthly_completion_rate") OVER (PARTITION BY "monthly_averages"."school_id" ORDER BY "monthly_averages"."month") AS "prev_completion_rate"
           FROM "monthly_averages"
        )
 SELECT "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "pm"."month",
    "pm"."avg_monthly_score",
    "pm"."monthly_completion_rate",
        CASE
            WHEN ("pm"."prev_avg_score" > (0)::numeric) THEN "round"(((("pm"."avg_monthly_score" - "pm"."prev_avg_score") / "pm"."prev_avg_score") * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "score_improvement_rate",
        CASE
            WHEN ("pm"."prev_completion_rate" > (0)::numeric) THEN "round"(((("pm"."monthly_completion_rate" - "pm"."prev_completion_rate") / "pm"."prev_completion_rate") * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "completion_improvement_rate"
   FROM ("public"."schools" "s"
     LEFT JOIN "previous_month" "pm" ON (("s"."id" = "pm"."school_id")))
  WHERE ("pm"."month" IS NOT NULL)
  ORDER BY "s"."name", "pm"."month";


ALTER TABLE "public"."school_improvement_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" NOT NULL,
    "school_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."school_performance_metrics" AS
 SELECT "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "count"(DISTINCT "a"."id") AS "total_assessments",
    "count"(DISTINCT "sub"."student_id") AS "students_with_submissions",
    ( SELECT "count"(*) AS "count"
           FROM "public"."students"
          WHERE ("students"."school_id" = "s"."id")) AS "total_students",
        CASE
            WHEN ("count"(DISTINCT "a"."id") > 0) THEN "round"((("count"(DISTINCT "sub"."id"))::numeric / ("count"(DISTINCT "a"."id"))::numeric), 2)
            ELSE (0)::numeric
        END AS "avg_submissions_per_assessment",
        CASE
            WHEN ("sum"(
            CASE
                WHEN "sub"."completed" THEN 1
                ELSE 0
            END) > 0) THEN "round"("avg"("sub"."score") FILTER (WHERE "sub"."completed"), 1)
            ELSE (0)::numeric
        END AS "avg_score",
        CASE
            WHEN ("count"(DISTINCT "sub"."id") > 0) THEN "round"(((("sum"(
            CASE
                WHEN "sub"."completed" THEN 1
                ELSE 0
            END))::numeric / ("count"(DISTINCT "sub"."id"))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "completion_rate",
        CASE
            WHEN ("count"(DISTINCT "sub"."student_id") > 0) THEN "round"(((("count"(DISTINCT "sub"."student_id"))::numeric / (NULLIF(( SELECT "count"(*) AS "count"
               FROM "public"."students"
              WHERE ("students"."school_id" = "s"."id")), 0))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "student_participation_rate"
   FROM (("public"."schools" "s"
     LEFT JOIN "public"."assessments" "a" ON (("s"."id" = "a"."school_id")))
     LEFT JOIN "public"."assessment_submissions" "sub" ON (("a"."id" = "sub"."assessment_id")))
  GROUP BY "s"."id", "s"."name";


ALTER TABLE "public"."school_performance_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."session_query_counts" AS
 SELECT "sl"."id" AS "session_id",
    "sl"."user_id",
    "sl"."school_id",
    "sl"."session_start",
    "sl"."topic_or_content_used",
    "sl"."num_queries"
   FROM "public"."session_logs" "sl";


ALTER TABLE "public"."session_query_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "email" "text",
    "code" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval)
);


ALTER TABLE "public"."student_invites" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."student_performance_metrics" AS
 SELECT "s"."id" AS "student_id",
    "p"."full_name" AS "student_name",
    "s"."school_id",
    "count"(DISTINCT "sub"."assessment_id") AS "assessments_taken",
    "round"("avg"("sub"."score") FILTER (WHERE "sub"."completed"), 1) AS "avg_score",
    "round"("avg"("sub"."time_spent") FILTER (WHERE "sub"."completed"), 0) AS "avg_time_spent_seconds",
    "sum"(
        CASE
            WHEN "sub"."completed" THEN 1
            ELSE 0
        END) AS "assessments_completed",
    "count"(DISTINCT "sub"."id") AS "total_submissions",
        CASE
            WHEN ("count"(DISTINCT "sub"."id") > 0) THEN "round"(((("sum"(
            CASE
                WHEN "sub"."completed" THEN 1
                ELSE 0
            END))::numeric / ("count"(DISTINCT "sub"."id"))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "completion_rate",
    ( SELECT "string_agg"("top_strengths"."strength", ', '::"text") AS "string_agg"
           FROM ( SELECT "unnest"("sub_1"."strengths") AS "strength"
                   FROM "public"."assessment_submissions" "sub_1"
                  WHERE (("sub_1"."student_id" = "s"."id") AND "sub_1"."completed")
                  GROUP BY ("unnest"("sub_1"."strengths"))
                  ORDER BY ("count"(*)) DESC
                 LIMIT 3) "top_strengths") AS "top_strengths",
    ( SELECT "string_agg"("top_weaknesses"."weakness", ', '::"text") AS "string_agg"
           FROM ( SELECT "unnest"("sub_1"."weaknesses") AS "weakness"
                   FROM "public"."assessment_submissions" "sub_1"
                  WHERE (("sub_1"."student_id" = "s"."id") AND "sub_1"."completed")
                  GROUP BY ("unnest"("sub_1"."weaknesses"))
                  ORDER BY ("count"(*)) DESC
                 LIMIT 3) "top_weaknesses") AS "top_weaknesses"
   FROM (("public"."students" "s"
     JOIN "public"."profiles" "p" ON (("s"."id" = "p"."id")))
     LEFT JOIN "public"."assessment_submissions" "sub" ON (("s"."id" = "sub"."student_id")))
  GROUP BY "s"."id", "p"."full_name", "s"."school_id";


ALTER TABLE "public"."student_performance_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_profiles" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "full_name" "text",
    "email" "text",
    "date_of_birth" "date",
    "subjects" "text"[] DEFAULT '{}'::"text"[],
    "board" "text",
    "level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_progress_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "avg_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "completion_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "assessments_taken" integer DEFAULT 0 NOT NULL,
    "improvement_rate" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_progress_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."student_weekly_study_time" AS
 SELECT "sl"."user_id",
    "p"."full_name" AS "student_name",
    "sl"."school_id",
    EXTRACT(week FROM "sl"."session_start") AS "week_number",
    EXTRACT(year FROM "sl"."session_start") AS "year",
    "round"("sum"((EXTRACT(epoch FROM (COALESCE("sl"."session_end", "now"()) - "sl"."session_start")) / (3600)::numeric)), 2) AS "study_hours"
   FROM ("public"."session_logs" "sl"
     JOIN "public"."profiles" "p" ON (("sl"."user_id" = "p"."id")))
  GROUP BY "sl"."user_id", "p"."full_name", "sl"."school_id", (EXTRACT(week FROM "sl"."session_start")), (EXTRACT(year FROM "sl"."session_start"));


ALTER TABLE "public"."student_weekly_study_time" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invitation_token" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."teacher_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."teacher_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" NOT NULL,
    "school_id" "uuid",
    "is_supervisor" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."teacher_performance_metrics" AS
 SELECT "t"."id" AS "teacher_id",
    "p"."full_name" AS "teacher_name",
    "t"."school_id",
    "count"(DISTINCT "a"."id") AS "assessments_created",
    "count"(DISTINCT "sub"."student_id") AS "students_assessed",
        CASE
            WHEN ("count"(DISTINCT "a"."id") > 0) THEN "round"((("count"(DISTINCT "sub"."id"))::numeric / ("count"(DISTINCT "a"."id"))::numeric), 2)
            ELSE (0)::numeric
        END AS "avg_submissions_per_assessment",
        CASE
            WHEN ("sum"(
            CASE
                WHEN "sub"."completed" THEN 1
                ELSE 0
            END) > 0) THEN "round"("avg"("sub"."score") FILTER (WHERE "sub"."completed"), 1)
            ELSE (0)::numeric
        END AS "avg_student_score",
        CASE
            WHEN ("count"(DISTINCT "sub"."id") > 0) THEN "round"(((("sum"(
            CASE
                WHEN "sub"."completed" THEN 1
                ELSE 0
            END))::numeric / ("count"(DISTINCT "sub"."id"))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "completion_rate"
   FROM ((("public"."teachers" "t"
     JOIN "public"."profiles" "p" ON (("t"."id" = "p"."id")))
     LEFT JOIN "public"."assessments" "a" ON (("t"."id" = "a"."teacher_id")))
     LEFT JOIN "public"."assessment_submissions" "sub" ON (("a"."id" = "sub"."assessment_id")))
  GROUP BY "t"."id", "p"."full_name", "t"."school_id";


ALTER TABLE "public"."teacher_performance_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_assessment_id_student_id_key" UNIQUE ("assessment_id", "student_id");



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_content"
    ADD CONSTRAINT "document_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_codes"
    ADD CONSTRAINT "school_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."school_codes"
    ADD CONSTRAINT "school_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_invites"
    ADD CONSTRAINT "student_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_progress_history"
    ADD CONSTRAINT "student_progress_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_invitations"
    ADD CONSTRAINT "teacher_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "unique_service_name" UNIQUE ("service_name");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "unique_user_provider" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_document_content_document_id" ON "public"."document_content" USING "btree" ("document_id");



CREATE INDEX "idx_session_logs_school_id" ON "public"."session_logs" USING "btree" ("school_id");



CREATE INDEX "idx_session_logs_session_start" ON "public"."session_logs" USING "btree" ("session_start");



CREATE INDEX "idx_session_logs_user_id" ON "public"."session_logs" USING "btree" ("user_id");



CREATE INDEX "idx_student_invites_code" ON "public"."student_invites" USING "btree" ("code");



CREATE INDEX "idx_student_invites_email" ON "public"."student_invites" USING "btree" ("email");



CREATE INDEX "idx_student_invites_school_id" ON "public"."student_invites" USING "btree" ("school_id");



CREATE INDEX "idx_students_status" ON "public"."students" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "ensure_valid_document_user_id" BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."validate_document_user_id"();



CREATE OR REPLACE TRIGGER "ensure_valid_user_id" BEFORE INSERT OR UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."check_valid_user_id"();



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."document_content"
    ADD CONSTRAINT "document_content_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "fk_school_id" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "fk_student_id" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "fk_teacher_id" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_code_fkey" FOREIGN KEY ("code") REFERENCES "public"."school_codes"("code");



ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_invites"
    ADD CONSTRAINT "student_invites_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_progress_history"
    ADD CONSTRAINT "student_progress_history_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_progress_history"
    ADD CONSTRAINT "student_progress_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_invitations"
    ADD CONSTRAINT "teacher_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_invitations"
    ADD CONSTRAINT "teacher_invitations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin users can insert API keys" ON "public"."api_keys" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'school_admin'::"public"."app_role"))));



CREATE POLICY "Admin users can update API keys" ON "public"."api_keys" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'school_admin'::"public"."app_role"))));



CREATE POLICY "Admin users can view API keys" ON "public"."api_keys" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'school_admin'::"public"."app_role"))));



CREATE POLICY "Allow insert for authenticated" ON "public"."schools" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read access to active school codes" ON "public"."school_codes" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow select for authenticated" ON "public"."schools" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = ANY (ARRAY['school_admin'::"public"."app_role", 'system_admin'::"public"."app_role"]))))));



CREATE POLICY "Only admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = ANY (ARRAY['school_admin'::"public"."app_role", 'system_admin'::"public"."app_role"]))))));



CREATE POLICY "Only admins can update roles" ON "public"."user_roles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = ANY (ARRAY['school_admin'::"public"."app_role", 'system_admin'::"public"."app_role"]))))));



CREATE POLICY "Only school admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'school_admin'::"public"."app_role")))));



CREATE POLICY "School admins can create teacher invites for their school" ON "public"."teacher_invites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("teachers"."school_id" = "teacher_invites"."school_id")))));



CREATE POLICY "School admins can manage student invites" ON "public"."student_invites" USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("teachers"."school_id" = "student_invites"."school_id")))));



CREATE POLICY "School admins can view all submissions for their school" ON "public"."assessment_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teachers"
     JOIN "public"."assessments" ON (("assessments"."school_id" = "teachers"."school_id")))
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("assessments"."id" = "assessment_submissions"."assessment_id")))));



CREATE POLICY "School admins can view profiles in their school" ON "public"."profiles" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."teachers" "supervisor"
     JOIN "public"."teachers" "t" ON (("t"."school_id" = "supervisor"."school_id")))
  WHERE (("supervisor"."id" = "auth"."uid"()) AND ("supervisor"."is_supervisor" = true) AND ("t"."id" = "profiles"."id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."teachers" "supervisor"
     JOIN "public"."students" "s" ON (("s"."school_id" = "supervisor"."school_id")))
  WHERE (("supervisor"."id" = "auth"."uid"()) AND ("supervisor"."is_supervisor" = true) AND ("s"."id" = "profiles"."id"))))));



CREATE POLICY "School admins can view progress history for their school" ON "public"."student_progress_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("teachers"."school_id" = "student_progress_history"."school_id")))));



CREATE POLICY "School admins can view teacher invites for their school" ON "public"."teacher_invites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("teachers"."school_id" = "teacher_invites"."school_id")))));



CREATE POLICY "School members can view their school" ON "public"."schools" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."school_id" = "schools"."id") AND ("teachers"."id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."students"
  WHERE (("students"."school_id" = "schools"."id") AND ("students"."id" = "auth"."uid"()))))));



CREATE POLICY "School supervisors can view school session logs" ON "public"."session_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true) AND ("teachers"."school_id" = "session_logs"."school_id")))));



CREATE POLICY "Students can insert their own logs" ON "public"."session_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can submit assessments" ON "public"."assessment_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can update their own logs" ON "public"."session_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can update their own submissions" ON "public"."assessment_submissions" FOR UPDATE USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view own profile" ON "public"."students" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Students can view their own logs" ON "public"."session_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can view their own progress history" ON "public"."student_progress_history" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view their own record" ON "public"."students" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Students can view their own submissions" ON "public"."assessment_submissions" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Supervisors can create teacher invitations" ON "public"."teacher_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "teacher_invitations"."school_id") AND ("teachers"."is_supervisor" = true)))));



CREATE POLICY "Supervisors can update school info" ON "public"."schools" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."school_id" = "schools"."id") AND ("teachers"."id" = "auth"."uid"()) AND ("teachers"."is_supervisor" = true)))));



CREATE POLICY "Supervisors can update teachers in their school" ON "public"."teachers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teachers" "supervisor"
  WHERE (("supervisor"."id" = "auth"."uid"()) AND ("supervisor"."school_id" = "teachers"."school_id") AND ("supervisor"."is_supervisor" = true)))));



CREATE POLICY "Supervisors can view all teachers in their school" ON "public"."teachers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers" "supervisor"
  WHERE (("supervisor"."id" = "auth"."uid"()) AND ("supervisor"."school_id" = "teachers"."school_id") AND ("supervisor"."is_supervisor" = true)))));



CREATE POLICY "Supervisors can view teacher invitations" ON "public"."teacher_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "teacher_invitations"."school_id") AND ("teachers"."is_supervisor" = true)))));



CREATE POLICY "System can insert document content" ON "public"."document_content" FOR INSERT WITH CHECK (true);



CREATE POLICY "Teachers can create assessments" ON "public"."assessments" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can create student invites" ON "public"."student_invites" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "teachers"."school_id"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = "auth"."uid"()))));



CREATE POLICY "Teachers can delete their own assessments" ON "public"."assessments" FOR DELETE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update students in their school" ON "public"."students" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "students"."school_id")))));



CREATE POLICY "Teachers can update submissions for their assessments" ON "public"."assessment_submissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."assessments"
  WHERE (("assessments"."id" = "assessment_submissions"."assessment_id") AND ("assessments"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update their own assessments" ON "public"."assessments" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view logs for students in their school" ON "public"."session_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "session_logs"."school_id")))));



CREATE POLICY "Teachers can view own profile" ON "public"."teachers" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Teachers can view school session logs" ON "public"."session_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "session_logs"."school_id")))));



CREATE POLICY "Teachers can view student profiles in their school" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."teachers" "t"
     JOIN "public"."students" "s" ON (("s"."school_id" = "t"."school_id")))
     JOIN "public"."profiles" "p" ON ((("p"."id" = "s"."id") AND (("p"."user_type")::"text" = 'student'::"text"))))
  WHERE (("t"."id" = "auth"."uid"()) AND ("p"."id" = "profiles"."id")))));



CREATE POLICY "Teachers can view students in their school" ON "public"."students" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teachers"
  WHERE (("teachers"."id" = "auth"."uid"()) AND ("teachers"."school_id" = "students"."school_id")))));



CREATE POLICY "Teachers can view submissions for their assessments" ON "public"."assessment_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."assessments"
  WHERE (("assessments"."id" = "assessment_submissions"."assessment_id") AND ("assessments"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can view their school's assessments" ON "public"."assessments" FOR SELECT USING (("auth"."uid"() IN ( SELECT "teachers"."id"
   FROM "public"."teachers"
  WHERE ("teachers"."school_id" = "assessments"."school_id"))));



CREATE POLICY "Users can add messages to their conversations" ON "public"."messages" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create their own API keys" ON "public"."user_api_keys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own API keys" ON "public"."user_api_keys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own documents" ON "public"."documents" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own documents" ON "public"."documents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."student_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage own documents" ON "public"."documents" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own roles" ON "public"."user_roles" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = ANY (ARRAY['school_admin'::"public"."app_role", 'system_admin'::"public"."app_role"])))))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own API keys" ON "public"."user_api_keys" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own conversations" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own document content" ON "public"."document_content" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."documents"
  WHERE (("documents"."id" = "document_content"."document_id") AND ("documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own documents" ON "public"."documents" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."student_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own document content" ON "public"."document_content" FOR SELECT USING (("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents"
  WHERE ("documents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own documents" ON "public"."documents" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view own session logs" ON "public"."session_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view student invites for their school" ON "public"."student_invites" FOR SELECT USING (("school_id" IN ( SELECT "teachers"."school_id"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own API keys" ON "public"."user_api_keys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own conversations" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own document content" ON "public"."document_content" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."documents"
  WHERE (("documents"."id" = "document_content"."document_id") AND ("documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own documents" ON "public"."documents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."student_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_progress_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teachers_delete_policy" ON "public"."teachers" FOR DELETE USING (("public"."is_user_supervisor"("auth"."uid"()) AND (( SELECT "teachers_1"."school_id"
   FROM "public"."teachers" "teachers_1"
  WHERE ("teachers_1"."id" = "auth"."uid"())) = "school_id")));



CREATE POLICY "teachers_insert_policy" ON "public"."teachers" FOR INSERT WITH CHECK (("public"."is_user_supervisor"("auth"."uid"()) AND (( SELECT "teachers_1"."school_id"
   FROM "public"."teachers" "teachers_1"
  WHERE ("teachers_1"."id" = "auth"."uid"())) = "school_id")));



CREATE POLICY "teachers_select_policy" ON "public"."teachers" FOR SELECT USING ((("auth"."uid"() = "id") OR (( SELECT "teachers_1"."school_id"
   FROM "public"."teachers" "teachers_1"
  WHERE ("teachers_1"."id" = "auth"."uid"())) = "school_id")));



CREATE POLICY "teachers_update_policy" ON "public"."teachers" FOR UPDATE USING ((("auth"."uid"() = "id") OR ("public"."is_user_supervisor"("auth"."uid"()) AND (( SELECT "teachers_1"."school_id"
   FROM "public"."teachers" "teachers_1"
  WHERE ("teachers_1"."id" = "auth"."uid"())) = "school_id"))));



ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."accept_teacher_invitation"("token" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_teacher_invitation"("token" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_teacher_invitation"("token" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_if_email_exists"("input_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_if_email_exists"("input_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_if_email_exists"("input_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_valid_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_valid_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_valid_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session_log"("topic" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session_log"("topic" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session_log"("topic" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_student_invitation"("school_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_student_invitation"("school_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_student_invitation"("school_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_session_log"("log_id" "uuid", "performance_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."end_session_log"("log_id" "uuid", "performance_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_session_log"("log_id" "uuid", "performance_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_api_key"("service" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_api_key"("service" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_api_key"("service" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_school_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_school_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_school_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_by_code"("input_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_by_code"("input_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_by_code"("input_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_improvement_metrics"("p_school_id" "uuid", "p_months_to_include" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_improvement_metrics"("p_school_id" "uuid", "p_months_to_include" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_improvement_metrics"("p_school_id" "uuid", "p_months_to_include" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_name_from_code"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_name_from_code"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_name_from_code"("code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_performance_metrics"("p_school_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_by_email"("input_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_by_email"("input_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_by_email"("input_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_school_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_school_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_school_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_school_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_school_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_school_admin_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_school_admin_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_school_admin_registration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_role"("_roles" "public"."app_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_role"("_roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("_roles" "public"."app_role"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_session_query_count"("log_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_session_query_count"("log_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_session_query_count"("log_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_teacher"("teacher_email" "text", "inviter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_teacher"("teacher_email" "text", "inviter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_teacher"("teacher_email" "text", "inviter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_supervisor"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_supervisor"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_supervisor"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_supervisor"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_supervisor"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_supervisor"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."populatetestaccountwithsessions"("userid" "uuid", "schoolid" "uuid", "num_sessions" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."populatetestaccountwithsessions"("userid" "uuid", "schoolid" "uuid", "num_sessions" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."populatetestaccountwithsessions"("userid" "uuid", "schoolid" "uuid", "num_sessions" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."proxy_gemini_request"("prompt" "text", "model" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."proxy_gemini_request"("prompt" "text", "model" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."proxy_gemini_request"("prompt" "text", "model" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."proxy_openai_request"("prompt" "text", "model" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."proxy_openai_request"("prompt" "text", "model" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."proxy_openai_request"("prompt" "text", "model" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_school"("p_school_name" "text", "p_admin_email" "text", "p_admin_full_name" "text", "p_contact_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_school"("p_school_name" "text", "p_admin_email" "text", "p_admin_full_name" "text", "p_contact_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_school"("p_school_name" "text", "p_admin_email" "text", "p_admin_full_name" "text", "p_contact_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_role"("user_id_param" "uuid", "role_param" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_api_key"("service" "text", "key_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_api_key"("service" "text", "key_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_api_key"("service" "text", "key_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_topic"("log_id" "uuid", "topic" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_topic"("log_id" "uuid", "topic" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_topic"("log_id" "uuid", "topic" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_document_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_document_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_document_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_school_code"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_school_code"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_school_code"("code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_teacher_invitation"("token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_teacher_invitation"("token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_teacher_invitation"("token" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_submissions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."document_content" TO "anon";
GRANT ALL ON TABLE "public"."document_content" TO "authenticated";
GRANT ALL ON TABLE "public"."document_content" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."session_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_logs" TO "service_role";



GRANT ALL ON TABLE "public"."most_studied_topics" TO "anon";
GRANT ALL ON TABLE "public"."most_studied_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."most_studied_topics" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."school_analytics_summary" TO "anon";
GRANT ALL ON TABLE "public"."school_analytics_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."school_analytics_summary" TO "service_role";



GRANT ALL ON TABLE "public"."school_codes" TO "anon";
GRANT ALL ON TABLE "public"."school_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."school_codes" TO "service_role";



GRANT ALL ON TABLE "public"."school_improvement_metrics" TO "anon";
GRANT ALL ON TABLE "public"."school_improvement_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."school_improvement_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."school_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."school_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."school_performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."session_query_counts" TO "anon";
GRANT ALL ON TABLE "public"."session_query_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."session_query_counts" TO "service_role";



GRANT ALL ON TABLE "public"."student_invites" TO "anon";
GRANT ALL ON TABLE "public"."student_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."student_invites" TO "service_role";



GRANT ALL ON TABLE "public"."student_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."student_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."student_performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."student_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."student_progress_history" TO "anon";
GRANT ALL ON TABLE "public"."student_progress_history" TO "authenticated";
GRANT ALL ON TABLE "public"."student_progress_history" TO "service_role";



GRANT ALL ON TABLE "public"."student_weekly_study_time" TO "anon";
GRANT ALL ON TABLE "public"."student_weekly_study_time" TO "authenticated";
GRANT ALL ON TABLE "public"."student_weekly_study_time" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_invitations" TO "anon";
GRANT ALL ON TABLE "public"."teacher_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_invites" TO "anon";
GRANT ALL ON TABLE "public"."teacher_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_invites" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."teacher_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
