
// This Supabase Edge Function converts text to speech using ElevenLabs API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId = "EXAVITQu4vr4xnSDxMaL" } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing text parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ElevenLabs API key from environment variables
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!elevenLabsApiKey) {
      console.error("ElevenLabs API Key not configured");
      return new Response(
        JSON.stringify({ error: "Text-to-speech service not properly configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Sarah voice by default (EXAVITQu4vr4xnSDxMaL is Sarah's voice ID)
    const voice = voiceId || "EXAVITQu4vr4xnSDxMaL";
    
    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail?.message || errorText;
      } catch (e) {
        errorMessage = errorText;
      }
      
      throw new Error(`ElevenLabs API error: ${errorMessage}`);
    }

    // Get audio data as ArrayBuffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    // Create data URL for audio
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    return new Response(
      JSON.stringify({ audioUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in text-to-speech function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
