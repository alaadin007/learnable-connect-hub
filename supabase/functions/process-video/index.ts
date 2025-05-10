
// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { serve } from 'https://deno.land/std@0.180.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const processVideo = async (videoId: string) => {
  // Get env vars
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First, get the video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
      
    if (videoError || !video) {
      throw new Error('Video not found: ' + videoError?.message);
    }
    
    // For simplicity, we'll simulate processing with mock data
    // In a real implementation, you'd extract audio and convert to text
    const mockTranscripts = [
      { start_time: 0, end_time: 10, text: "Welcome to this video tutorial." },
      { start_time: 11, end_time: 20, text: "Today we will learn about AI tutoring." },
      { start_time: 21, end_time: 30, text: "Let's get started with the basics." }
    ];
    
    // Store the transcripts
    for (const transcript of mockTranscripts) {
      await supabase
        .from('video_transcripts')
        .insert({
          video_id: videoId,
          start_time: transcript.start_time,
          end_time: transcript.end_time,
          text: transcript.text
        });
    }
    
    // Update the video status
    await supabase
      .from('videos')
      .update({ 
        processing_status: 'completed',
        transcript_status: 'completed'
      })
      .eq('id', videoId);
      
    return {
      success: true,
      status: 'completed'
    };
  } catch (error) {
    console.error('Error processing video:', error);
    
    // Update the video status to 'error'
    await supabase
      .from('videos')
      .update({ 
        processing_status: 'error',
        transcript_status: 'error'
      })
      .eq('id', videoId);
      
    return {
      success: false,
      error: error.message
    };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const result = await processVideo(videoId);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
