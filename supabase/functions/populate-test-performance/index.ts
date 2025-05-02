
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client with the authorization token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get request body
    const { userId, schoolId, numAssessments = 10 } = await req.json();

    if (!userId || !schoolId) {
      return new Response(
        JSON.stringify({ error: "User ID and School ID are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call the populateTestAccountWithSessions function
    const { data, error } = await supabaseClient.rpc("populatetestaccountwithsessions", {
      userid: userId,
      schoolid: schoolId,
      num_sessions: numAssessments
    });

    if (error) {
      console.error("Error populating test data:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add sample document with content
    try {
      // First create a document entry
      const { data: docData, error: docError } = await supabaseClient
        .from('documents')
        .insert({
          user_id: userId,
          filename: 'Sample Study Notes.pdf',
          file_type: 'application/pdf',
          file_size: 102400, // 100KB
          storage_path: `test/${userId}/sample_study_notes.pdf`,
          processing_status: 'completed'
        })
        .select()
        .single();
      
      if (docError) {
        throw new Error(`Error creating document: ${docError.message}`);
      }
      
      // Then add content for the document
      const { error: contentError } = await supabaseClient
        .from('document_content')
        .insert({
          document_id: docData.id,
          section_number: 1,
          content: `# Sample Study Notes

## Introduction to Chemistry
Chemistry is the study of matter, its properties, how and why substances combine or separate to form other substances, and how substances interact with energy.

### Key Concepts:
1. Atoms and molecules
2. Elements and compounds
3. Chemical reactions
4. Periodic table

## Chemical Reactions
Chemical reactions occur when substances interact to form new substances with different properties.

### Types of Reactions:
- Synthesis reactions: A + B → AB
- Decomposition reactions: AB → A + B
- Single displacement: A + BC → AC + B
- Double displacement: AB + CD → AD + CB

## Balancing Equations
Chemical equations must be balanced to satisfy the law of conservation of mass.

Example:
H₂ + O₂ → H₂O (unbalanced)
2H₂ + O₂ → 2H₂O (balanced)

## The Periodic Table
The periodic table organizes elements based on their atomic number and chemical properties.

### Key Features:
- Elements in the same group (column) have similar properties
- Periods (rows) show trends in reactivity, atomic radius, and ionization energy
- Metals are on the left, non-metals on the right`
        });
      
      if (contentError) {
        throw new Error(`Error adding document content: ${contentError.message}`);
      }
      
      console.log("Successfully added sample document with content");
      
    } catch (docError) {
      console.error("Error adding sample document:", docError);
      // Continue execution even if document creation fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully populated test data for user ${userId}` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
