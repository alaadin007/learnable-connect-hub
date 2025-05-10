
-- This file will create a stored procedure to safely access lecture transcripts

CREATE OR REPLACE FUNCTION public.get_lecture_transcripts(lecture_id_param uuid)
RETURNS TABLE (
  id uuid,
  lecture_id uuid,
  text text,
  start_time numeric,
  end_time numeric,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.lecture_id,
    t.text,
    t.start_time,
    t.end_time,
    t.created_at
  FROM 
    public.lecture_transcripts t
  WHERE 
    t.lecture_id = lecture_id_param
  ORDER BY
    t.start_time ASC;
END;
$$;

-- Add a comment to the function
COMMENT ON FUNCTION public.get_lecture_transcripts(uuid) IS 'Gets transcript segments for a specific lecture';
