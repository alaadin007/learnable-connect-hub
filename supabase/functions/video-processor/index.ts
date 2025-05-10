
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { videoId, videoType, videoUrl, action, timestamp } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Video ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Get video details
    const { data: video, error: videoError } = await supabaseClient
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();
    
    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: "Video not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Process based on action requested
    switch (action) {
      case "summarize":
        return await handleSummarization(video, supabaseClient, corsHeaders);
      case "explain_timestamp":
        if (!timestamp) {
          return new Response(
            JSON.stringify({ error: "Timestamp is required for explanation" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        return await handleTimestampExplanation(video, timestamp, supabaseClient, corsHeaders);
      case "extract_key_points":
        return await handleKeyPointExtraction(video, supabaseClient, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
    }
  } catch (error) {
    console.error("Error processing video:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

async function handleSummarization(video, supabaseClient, corsHeaders) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    // For YouTube videos, we'll use the transcript or summary if available
    let videoContent = "";
    
    if (video.video_type === "youtube") {
      // Check if we already have a transcript
      const { data: transcript, error: transcriptError } = await supabaseClient
        .from("video_transcripts")
        .select("content")
        .eq("video_id", video.id)
        .single();
      
      if (!transcriptError && transcript) {
        videoContent = transcript.content;
      } else {
        // For simplicity, return an error - in production you would fetch the YouTube transcript
        return new Response(
          JSON.stringify({ error: "YouTube transcript not available" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else if (video.video_type === "lecture") {
      // Get lecture transcript if available
      const { data: lectureTranscript, error: lectureError } = await supabaseClient
        .from("lecture_transcripts")
        .select("text")
        .eq("lecture_id", video.lecture_id)
        .order("start_time", { ascending: true });
      
      if (!lectureError && lectureTranscript?.length > 0) {
        videoContent = lectureTranscript.map(t => t.text).join(" ");
      } else {
        return new Response(
          JSON.stringify({ error: "Lecture transcript not available" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }
    
    // Call OpenAI for summarization
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational assistant. Create a concise, informative summary of the video transcript provided. Structure the summary with key topics, main points, and important details."
          },
          { role: "user", content: `Please summarize this video transcript: ${videoContent.substring(0, 16000)}` }
        ],
        temperature: 0.5,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to generate summary");
    }
    
    const summary = data.choices[0].message.content;
    
    // Store the summary in the database
    const { error: summaryError } = await supabaseClient
      .from("video_summaries")
      .upsert({
        video_id: video.id,
        summary,
        created_at: new Date().toISOString(),
      });
    
    if (summaryError) {
      throw new Error("Failed to save summary");
    }
    
    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in video summarization:", error);
    return new Response(
      JSON.stringify({ error: "Failed to summarize video", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

async function handleTimestampExplanation(video, timestamp, supabaseClient, corsHeaders) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    // Find transcript segments near the requested timestamp
    let transcriptSegments = [];
    
    if (video.video_type === "lecture") {
      // Get lecture transcript near the timestamp
      const { data: segments, error } = await supabaseClient
        .from("lecture_transcripts")
        .select("*")
        .eq("lecture_id", video.lecture_id)
        .lte("start_time", timestamp + 30) // 30 seconds buffer
        .gte("end_time", timestamp - 30)
        .order("start_time", { ascending: true });
      
      if (error) {
        throw new Error("Failed to fetch transcript segments");
      }
      
      if (segments) {
        transcriptSegments = segments.map(seg => seg.text).join(" ");
      }
    } else {
      // For YouTube videos, we might need a different approach
      // For simplicity, we'll return an error
      return new Response(
        JSON.stringify({ error: "Timestamp explanation not supported for this video type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (transcriptSegments.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript found for this timestamp" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Call OpenAI to explain the segment
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational assistant. Provide a detailed explanation of the concept being discussed in this part of the video. Explain any technical terms, provide context, and make it easy to understand."
          },
          { role: "user", content: `Explain this segment of the video transcript: ${transcriptSegments}` }
        ],
        temperature: 0.5,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to generate explanation");
    }
    
    const explanation = data.choices[0].message.content;
    
    // Store the explanation in the database
    const { error: explanationError } = await supabaseClient
      .from("video_timestamp_explanations")
      .insert({
        video_id: video.id,
        timestamp: timestamp,
        explanation,
        transcript_segment: transcriptSegments,
        created_at: new Date().toISOString(),
      });
    
    if (explanationError) {
      throw new Error("Failed to save explanation");
    }
    
    return new Response(
      JSON.stringify({ explanation }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in timestamp explanation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to explain timestamp", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

async function handleKeyPointExtraction(video, supabaseClient, corsHeaders) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    // Get video transcript or content
    let videoContent = "";
    
    if (video.video_type === "youtube") {
      // Check if we already have a transcript
      const { data: transcript, error: transcriptError } = await supabaseClient
        .from("video_transcripts")
        .select("content")
        .eq("video_id", video.id)
        .single();
      
      if (!transcriptError && transcript) {
        videoContent = transcript.content;
      } else {
        return new Response(
          JSON.stringify({ error: "YouTube transcript not available" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else if (video.video_type === "lecture") {
      // Get lecture transcript
      const { data: lectureTranscript, error: lectureError } = await supabaseClient
        .from("lecture_transcripts")
        .select("text")
        .eq("lecture_id", video.lecture_id)
        .order("start_time", { ascending: true });
      
      if (!lectureError && lectureTranscript?.length > 0) {
        videoContent = lectureTranscript.map(t => t.text).join(" ");
      } else {
        return new Response(
          JSON.stringify({ error: "Lecture transcript not available" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }
    
    // Call OpenAI to extract key points
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational assistant. Extract the key points and concepts from this video transcript. Format your response as a numbered list of key points, with each point being concise and focused on a specific concept or fact."
          },
          { role: "user", content: `Extract key points from this video transcript: ${videoContent.substring(0, 16000)}` }
        ],
        temperature: 0.5,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to extract key points");
    }
    
    const keyPoints = data.choices[0].message.content;
    
    // Store the key points in the database
    const { error: keyPointsError } = await supabaseClient
      .from("video_key_points")
      .upsert({
        video_id: video.id,
        key_points: keyPoints,
        created_at: new Date().toISOString(),
      });
    
    if (keyPointsError) {
      throw new Error("Failed to save key points");
    }
    
    return new Response(
      JSON.stringify({ keyPoints }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in key point extraction:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract key points", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}
