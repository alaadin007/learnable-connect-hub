
-- Add remaining RLS policies for teachers table
CREATE POLICY "Teachers can view their own data" 
  ON public.teachers 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Teachers can update their own data" 
  ON public.teachers 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "School admins can view teachers in their school" 
  ON public.teachers 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.id = auth.uid() 
      AND sa.school_id = teachers.school_id
    )
  );

-- Create secure functions to replace the views
CREATE OR REPLACE FUNCTION public.get_school_analytics_summary(p_school_id UUID)
RETURNS TABLE(
  school_id UUID,
  school_name TEXT,
  active_students BIGINT,
  total_sessions BIGINT,
  total_queries BIGINT,
  avg_session_minutes NUMERIC,
  latest_session_start TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to this school
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = auth.uid() AND t.school_id = p_school_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.id = auth.uid() AND sa.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'Access denied to school data';
  END IF;

  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    COUNT(DISTINCT sl.user_id) as active_students,
    COUNT(sl.id) as total_sessions,
    COALESCE(SUM(sl.num_queries), 0) as total_queries,
    COALESCE(AVG(EXTRACT(EPOCH FROM (sl.session_end - sl.session_start))/60), 0) as avg_session_minutes,
    MAX(sl.session_start) as latest_session_start
  FROM public.schools s
  LEFT JOIN public.session_logs sl ON s.id = sl.school_id
  WHERE s.id = p_school_id
  GROUP BY s.id, s.name;
END;
$$;

-- Create function for most studied topics
CREATE OR REPLACE FUNCTION public.get_most_studied_topics(p_school_id UUID)
RETURNS TABLE(
  topic_or_content_used TEXT,
  count_of_sessions BIGINT,
  topic_rank BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to this school
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = auth.uid() AND t.school_id = p_school_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.id = auth.uid() AND sa.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'Access denied to school data';
  END IF;

  RETURN QUERY
  SELECT 
    sl.topic_or_content_used,
    COUNT(*) as count_of_sessions,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as topic_rank
  FROM public.session_logs sl
  WHERE sl.school_id = p_school_id 
    AND sl.topic_or_content_used IS NOT NULL
  GROUP BY sl.topic_or_content_used
  ORDER BY count_of_sessions DESC;
END;
$$;

-- Create function for student weekly study time
CREATE OR REPLACE FUNCTION public.get_student_weekly_study_time(p_school_id UUID)
RETURNS TABLE(
  user_id UUID,
  student_name TEXT,
  year NUMERIC,
  week_number NUMERIC,
  study_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to this school
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = auth.uid() AND t.school_id = p_school_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.id = auth.uid() AND sa.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'Access denied to school data';
  END IF;

  RETURN QUERY
  SELECT 
    sl.user_id,
    p.full_name as student_name,
    EXTRACT(YEAR FROM sl.session_start) as year,
    EXTRACT(WEEK FROM sl.session_start) as week_number,
    COALESCE(SUM(EXTRACT(EPOCH FROM (sl.session_end - sl.session_start))/3600), 0) as study_hours
  FROM public.session_logs sl
  JOIN public.profiles p ON sl.user_id = p.id
  WHERE sl.school_id = p_school_id
    AND sl.session_end IS NOT NULL
  GROUP BY sl.user_id, p.full_name, EXTRACT(YEAR FROM sl.session_start), EXTRACT(WEEK FROM sl.session_start)
  ORDER BY year DESC, week_number DESC, student_name;
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_school_analytics_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_most_studied_topics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_weekly_study_time(UUID) TO authenticated;
