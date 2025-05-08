
-- Create additional tables for analytics

-- Create a view for session query counts - combines session data with user names
CREATE OR REPLACE VIEW public.session_query_counts AS
SELECT
  sl.id AS session_id,
  sl.user_id,
  p.full_name AS student_name,
  sl.school_id,
  sl.session_start,
  sl.session_end,
  sl.topic_or_content_used,
  sl.num_queries
FROM
  public.session_logs sl
JOIN
  public.profiles p ON p.id = sl.user_id;

-- Create a view for most studied topics
CREATE OR REPLACE VIEW public.most_studied_topics AS
SELECT
  topic_or_content_used,
  COUNT(*) AS count_of_sessions,
  school_id,
  RANK() OVER (PARTITION BY school_id ORDER BY COUNT(*) DESC) AS topic_rank
FROM
  public.session_logs
WHERE
  topic_or_content_used IS NOT NULL
GROUP BY
  school_id, topic_or_content_used;

-- Create a view for student weekly study time
CREATE OR REPLACE VIEW public.student_weekly_study_time AS
WITH weekly_sessions AS (
  SELECT
    user_id,
    p.full_name AS student_name,
    sl.school_id,
    EXTRACT(WEEK FROM sl.session_start) AS week_number,
    EXTRACT(YEAR FROM sl.session_start) AS year,
    SUM(
      EXTRACT(EPOCH FROM (COALESCE(sl.session_end, NOW()) - sl.session_start)) / 3600
    ) AS study_hours
  FROM
    public.session_logs sl
  JOIN
    public.profiles p ON p.id = sl.user_id
  WHERE
    sl.session_start IS NOT NULL
  GROUP BY
    user_id, p.full_name, sl.school_id, week_number, year
)
SELECT
  user_id,
  student_name,
  school_id,
  week_number,
  year,
  ROUND(study_hours::numeric, 2) AS study_hours
FROM
  weekly_sessions;

-- Create a view for school analytics summary
CREATE OR REPLACE VIEW public.school_analytics_summary AS
WITH school_stats AS (
  SELECT
    school_id,
    COUNT(DISTINCT user_id) AS active_students,
    COUNT(*) AS total_sessions,
    SUM(num_queries) AS total_queries,
    AVG(EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start)) / 60) AS avg_session_minutes,
    MAX(session_start) AS latest_session_start
  FROM
    public.session_logs
  WHERE
    session_start >= NOW() - INTERVAL '30 days'
  GROUP BY
    school_id
)
SELECT
  ss.school_id,
  s.name AS school_name,
  ss.active_students,
  ss.total_sessions,
  ss.total_queries,
  ROUND(ss.avg_session_minutes::numeric, 1) AS avg_session_minutes,
  ss.latest_session_start
FROM
  school_stats ss
JOIN
  public.schools s ON s.id = ss.school_id;

-- Ensure we have permissions set up for these views
GRANT SELECT ON public.session_query_counts TO authenticated;
GRANT SELECT ON public.most_studied_topics TO authenticated;
GRANT SELECT ON public.student_weekly_study_time TO authenticated;
GRANT SELECT ON public.school_analytics_summary TO authenticated;

-- Create policies for these views
CREATE POLICY "Anyone can view session_query_counts" 
ON public.session_query_counts FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone can view most_studied_topics" 
ON public.most_studied_topics FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone can view student_weekly_study_time" 
ON public.student_weekly_study_time FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone can view school_analytics_summary" 
ON public.school_analytics_summary FOR SELECT 
TO authenticated
USING (true);
