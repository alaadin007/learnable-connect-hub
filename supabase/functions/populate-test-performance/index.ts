
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

    // Add sample documents with content
    try {
      // Create multiple documents for better testing
      const documentTypes = [
        {
          filename: 'Sample Study Notes.pdf',
          fileType: 'application/pdf',
          fileSize: 102400, // 100KB
          contentType: 'notes'
        },
        {
          filename: 'Math Homework.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 75000, // 75KB
          contentType: 'homework'
        },
        {
          filename: 'Physics Experiment.pptx',
          fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          fileSize: 250000, // 250KB
          contentType: 'presentation'
        }
      ];
      
      for (const doc of documentTypes) {
        // First create a document entry
        const { data: docData, error: docError } = await supabaseClient
          .from('documents')
          .insert({
            user_id: userId,
            filename: doc.filename,
            file_type: doc.fileType,
            file_size: doc.fileSize,
            storage_path: `test/${userId}/${doc.filename.toLowerCase().replace(/\s+/g, '_')}`,
            processing_status: 'completed'
          })
          .select()
          .single();
        
        if (docError) {
          throw new Error(`Error creating document ${doc.filename}: ${docError.message}`);
        }
        
        // Then add content for the document
        let content = '';
        
        if (doc.contentType === 'notes') {
          content = `# Sample Study Notes

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
- Metals are on the left, non-metals on the right`;
        } else if (doc.contentType === 'homework') {
          content = `# Math Homework Assignment

## Algebra Problems

1. Solve for x: 3x + 7 = 22
2. Factor completely: x² - 9
3. Simplify: (3x²y)(4xy³)

## Geometry Problems

1. Find the area of a circle with radius 5 cm
2. Calculate the volume of a rectangular prism with dimensions 3 cm × 4 cm × 6 cm
3. If a triangle has angles of 30° and 60°, what is the measure of the third angle?

## Word Problems

1. A train travels at 60 mph. How long will it take to travel 240 miles?
2. If 8 workers can build a wall in 10 days, how long would it take 12 workers to build the same wall?
3. A rectangle has an area of 48 square inches and a width of 6 inches. What is its length?`;
        } else {
          content = `# Physics Experiment: Measuring Acceleration Due to Gravity

## Objectives
- Measure the acceleration due to gravity using a simple pendulum
- Understand the relationship between pendulum length and period
- Apply mathematical models to experimental data

## Materials Needed
- String (1.5 meters)
- Metal bob or weight
- Meter stick
- Stopwatch or timer
- Protractor
- Stand and clamp

## Procedure
1. Set up the pendulum with an initial length of 0.5 meters
2. Pull the pendulum to a small angle (< 10°)
3. Release and measure the time for 10 complete oscillations
4. Repeat for different lengths: 0.75m, 1.0m, 1.25m, and 1.5m
5. Calculate the period for each trial

## Data Analysis
- Graph the square of the period (T²) vs. length (L)
- Calculate the slope of the best-fit line
- Determine g using the formula: g = 4π²/slope`;
        }
        
        const { error: contentError } = await supabaseClient
          .from('document_content')
          .insert({
            document_id: docData.id,
            section_number: 1,
            content: content,
            processing_status: 'completed'
          });
        
        if (contentError) {
          throw new Error(`Error adding document content: ${contentError.message}`);
        }
      }
      
      console.log("Successfully added sample documents with content");
      
    } catch (docError) {
      console.error("Error adding sample document:", docError);
      // Continue execution even if document creation fails
    }

    // Create sample conversations for AI chat
    try {
      const conversationTopics = [
        {
          title: "Help with Algebra",
          topic: "Math concepts",
          summary: "Discussion about solving quadratic equations",
          category: "Homework",
          tags: ["math", "algebra", "quadratic", "homework"]
        },
        {
          title: "English Literature Essay",
          topic: "Shakespeare analysis",
          summary: "Analysis of themes in Macbeth",
          category: "Assignment",
          tags: ["english", "literature", "shakespeare", "essay"]
        },
        {
          title: "Science Project Ideas",
          topic: "Biology experiments",
          summary: "Brainstorming ideas for science fair",
          category: "Project",
          tags: ["science", "biology", "project", "experiment"]
        }
      ];

      for (const convo of conversationTopics) {
        // Create conversation
        const { data: conversation, error: convoError } = await supabaseClient
          .from("conversations")
          .insert({
            user_id: userId,
            school_id: schoolId,
            title: convo.title,
            topic: convo.topic,
            summary: convo.summary,
            category: convo.category,
            tags: convo.tags,
            starred: convo.title === "Help with Algebra" // Star the first one
          })
          .select()
          .single();

        if (convoError) {
          console.error("Error creating conversation:", convoError);
          continue;
        }

        // Add messages to the conversation
        if (convo.title === "Help with Algebra") {
          await supabaseClient.from("messages").insert([
            {
              conversation_id: conversation.id,
              sender: "user",
              content: "I need help solving this equation: x² + 5x + 6 = 0"
            },
            {
              conversation_id: conversation.id,
              sender: "assistant",
              content: "I'd be happy to help you solve this quadratic equation. Let's start by factoring it.\n\nThe equation x² + 5x + 6 = 0 can be factored by finding two numbers that multiply to give 6 and add up to 5.\n\nThose numbers are 2 and 3 because 2 × 3 = 6 and 2 + 3 = 5.\n\nSo we can rewrite the equation as (x + 2)(x + 3) = 0"
            },
            {
              conversation_id: conversation.id,
              sender: "user",
              content: "How do I find the solutions from there?"
            },
            {
              conversation_id: conversation.id,
              sender: "assistant",
              content: "Now that we have factored the equation into (x + 2)(x + 3) = 0, we can apply the zero product property.\n\nThis property states that if a product equals zero, then at least one of the factors must equal zero.\n\nSo either (x + 2) = 0 or (x + 3) = 0\n\nSolving for x:\nFrom (x + 2) = 0, we get x = -2\nFrom (x + 3) = 0, we get x = -3\n\nTherefore, the solutions to the equation x² + 5x + 6 = 0 are x = -2 and x = -3."
            }
          ]);
        } else if (convo.title === "English Literature Essay") {
          await supabaseClient.from("messages").insert([
            {
              conversation_id: conversation.id,
              sender: "user",
              content: "Can you help me identify the main themes in Shakespeare's Macbeth?"
            },
            {
              conversation_id: conversation.id,
              sender: "assistant",
              content: "I'd be happy to help you with the main themes in Macbeth! Here are the key themes Shakespeare explores in this tragedy:\n\n1. **Ambition and Power**: Macbeth's unchecked ambition and thirst for power drive the plot and lead to his downfall. The play shows how ambition can corrupt even honorable individuals.\n\n2. **Fate vs. Free Will**: The witches' prophecies raise questions about whether Macbeth's actions are predetermined or his own choices.\n\n3. **Guilt and Conscience**: Both Macbeth and Lady Macbeth suffer from guilt after Duncan's murder, manifesting as hallucinations and sleepwalking."
            },
            {
              conversation_id: conversation.id,
              sender: "user",
              content: "How does Shakespeare use supernatural elements in the play?"
            },
            {
              conversation_id: conversation.id,
              sender: "assistant",
              content: "Shakespeare uses supernatural elements in Macbeth in several significant ways:\n\n1. **The Three Witches**: They set the dark, mysterious tone from the beginning and their prophecies drive Macbeth's actions. They represent fate, temptation, and moral ambiguity.\n\n2. **Ghosts and Visions**: Banquo's ghost appears to Macbeth during the banquet scene, visible only to him, representing his guilty conscience and mental deterioration.\n\n3. **Hallucinations**: The floating dagger Macbeth sees before killing Duncan represents his inner turmoil and the unnatural act he's about to commit.\n\n4. **Unnatural Events**: After Duncan's murder, nature itself reacts with storms, earthquakes, and strange animal behavior, emphasizing how Macbeth's actions have disrupted the natural order."
            }
          ]);
        }
      }
      
      console.log("Successfully created sample conversations");
      
    } catch (convoError) {
      console.error("Error creating conversations:", convoError);
      // Continue execution even if conversation creation fails
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
