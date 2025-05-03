
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Get environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Handle HTTP requests
serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    // Parse request body
    const { userId, schoolId, numSessions = 5 } = await req.json();

    if (!userId || !schoolId) {
      return new Response(
        JSON.stringify({ error: "userId and schoolId are required" }),
        { headers, status: 400 }
      );
    }

    console.log(`Populating test performance data for user ${userId} in school ${schoolId}`);

    // Check if we already have session data for this user
    const { data: existingSessions, error: checkError } = await supabase
      .from("session_logs")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (checkError) {
      console.error("Error checking for existing sessions:", checkError);
      throw checkError;
    }

    // If sessions already exist, don't add more - but still return success
    // since we don't want to actually fail the login attempt
    if (existingSessions && existingSessions.length > 0) {
      console.log(`User ${userId} already has session data, skipping population`);
      return new Response(
        JSON.stringify({ 
          message: "User already has session data", 
          success: true 
        }),
        { headers, status: 200 }
      );
    }

    // Create test sessions for this user
    const topics = ["Algebra equations", "World War II", "Chemical reactions", "Shakespeare's Macbeth", "Programming basics"];
    const now = new Date();
    
    // Handle UUID validation - make sure we have proper UUID format
    let validUserId = userId;
    let validSchoolId = schoolId;
    
    // Validate UUID format - either use as is if valid, or handle test- prefixed values
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(validUserId)) {
      // For test IDs, create a deterministic UUID to ensure consistency across requests
      if (validUserId.startsWith('test-')) {
        // Create a deterministic UUID for test accounts to avoid creating new data on each login
        validUserId = `00000000-0000-${validUserId.slice(-4)}-0000-000000000001`;
      } else {
        throw new Error(`Invalid user ID format: ${validUserId}`);
      }
    }
    
    if (!uuidPattern.test(validSchoolId)) {
      if (validSchoolId.startsWith('test-')) {
        // Same approach for school ID to ensure consistency
        validSchoolId = `00000000-0000-${validSchoolId.slice(-4)}-0000-000000000001`;
      } else {
        throw new Error(`Invalid school ID format: ${validSchoolId}`);
      }
    }
    
    // Create sessions even if some fail - we'll still proceed with as many as we can
    let createdSessions = 0;
    
    for (let i = 1; i <= numSessions; i++) {
      try {
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - i);
        
        // Create a session log
        const { data: sessionLog, error: sessionError } = await supabase
          .from("session_logs")
          .insert({
            user_id: validUserId,
            school_id: validSchoolId,
            topic_or_content_used: topics[i % topics.length],
            session_start: pastDate.toISOString(),
            session_end: new Date(pastDate.getTime() + 45 * 60000).toISOString(),
            num_queries: Math.floor(Math.random() * 15) + 5,
          })
          .select();

        if (sessionError) {
          console.error(`Error creating session ${i}:`, sessionError);
          continue; // Continue with the next session even if this one fails
        }

        createdSessions++;
        console.log(`Created session ${i} for user ${userId}`);
      } catch (error) {
        console.error(`Error creating session ${i}:`, error);
        // Continue with the next session
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully populated ${createdSessions} test sessions for user ${userId}`,
        success: true 
      }),
      { headers, status: 200 }
    );

  } catch (error) {
    console.error("Error in populate-test-performance function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        }, 
        status: 500 
      }
    );
  }
});
