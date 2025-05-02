
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_SCHOOL_CODE = "TESTCODE";
const TEST_SCHOOL_NAME = "Test School";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { createAccounts = false } = await req.json();

    if (!createAccounts) {
      return new Response(
        JSON.stringify({ error: "Missing createAccounts parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the school code already exists
    const { data: schoolCodeData } = await supabaseClient
      .from("school_codes")
      .select("*")
      .eq("code", TEST_SCHOOL_CODE)
      .single();

    // If school code doesn't exist, create it and all test accounts
    if (!schoolCodeData) {
      // Step 1: Create school code
      await supabaseClient.from("school_codes").insert({
        code: TEST_SCHOOL_CODE,
        school_name: TEST_SCHOOL_NAME,
        active: true,
      });

      // Step 2: Create test accounts
      const testAccounts = [
        {
          email: "school.test@learnable.edu",
          password: "school123",
          userType: "school",
          fullName: "School Admin",
        },
        {
          email: "teacher.test@learnable.edu",
          password: "teacher123",
          userType: "teacher",
          fullName: "Teacher User",
        },
        {
          email: "student.test@learnable.edu",
          password: "student123",
          userType: "student",
          fullName: "Student User",
        },
      ];

      let schoolId: string | null = null;

      // Create each account
      for (const account of testAccounts) {
        // Create auth user
        const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            user_type: account.userType,
            full_name: account.fullName,
            school_code: account.userType === "school" ? null : TEST_SCHOOL_CODE,
            school_name: TEST_SCHOOL_NAME,
          },
        });

        if (userError) {
          throw new Error(`Error creating ${account.userType} account: ${userError.message}`);
        }

        // For school account, capture the school ID for other accounts
        if (account.userType === "school" && userData.user) {
          // Get the school ID
          const { data: schoolData } = await supabaseClient
            .from("schools")
            .select("id")
            .eq("code", TEST_SCHOOL_CODE)
            .single();

          if (schoolData) {
            schoolId = schoolData.id;
          }
        }

        // If this is the teacher or student and we have a school ID, link them
        if (schoolId && account.userType !== "school" && userData.user) {
          if (account.userType === "teacher") {
            // Update teacher's school_id
            await supabaseClient
              .from("teachers")
              .update({ school_id: schoolId })
              .eq("id", userData.user.id);
          } else {
            // Update student's school_id
            await supabaseClient
              .from("students")
              .update({ school_id: schoolId })
              .eq("id", userData.user.id);
          }
        }
      }

      // Generate some sample data for the test accounts
      if (schoolId) {
        await generateSampleData(supabaseClient, schoolId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Test accounts created successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // School code exists, check if test users exist
    const { data: schoolTestUser } = await supabaseClient.auth.admin.listUsers({
      filters: {
        email: "school.test@learnable.edu",
      },
    });

    // If school test user doesn't exist, recreate all test accounts
    if (!schoolTestUser.users || schoolTestUser.users.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Test accounts need to be recreated",
          recreate: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Test accounts exist
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test accounts already exist",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating test accounts:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to generate sample data for test accounts
async function generateSampleData(supabaseClient: any, schoolId: string) {
  try {
    // Get the teacher and student IDs
    const { data: teacherData } = await supabaseClient.auth.admin.listUsers({
      filters: {
        email: "teacher.test@learnable.edu",
      },
    });

    const { data: studentData } = await supabaseClient.auth.admin.listUsers({
      filters: {
        email: "student.test@learnable.edu",
      },
    });

    if (!teacherData.users || !teacherData.users[0] || !studentData.users || !studentData.users[0]) {
      console.error("Missing teacher or student data");
      return;
    }

    const teacherId = teacherData.users[0].id;
    const studentId = studentData.users[0].id;

    // Create sample conversations for the student
    const topics = ["Math Homework", "Science Project", "History Essay", "English Literature", "Computer Science"];

    for (let i = 0; i < topics.length; i++) {
      const { data: conversation } = await supabaseClient
        .from("conversations")
        .insert({
          user_id: studentId,
          school_id: schoolId,
          topic: topics[i],
          title: `Help with ${topics[i]}`,
          summary: `Discussion about ${topics[i]} concepts and problems`,
          category: i % 2 === 0 ? "Homework" : "Project",
          tags: [`${topics[i].toLowerCase()}`, "help", i % 2 === 0 ? "homework" : "project"],
          starred: i === 0, // Star the first conversation
        })
        .select()
        .single();

      if (conversation) {
        // Add sample messages to each conversation
        await supabaseClient.from("messages").insert([
          {
            conversation_id: conversation.id,
            sender: "user",
            content: `Hi, I need help with my ${topics[i]}.`,
          },
          {
            conversation_id: conversation.id,
            sender: "assistant",
            content: `I'd be happy to help you with your ${topics[i]}. What specific part are you struggling with?`,
          },
          {
            conversation_id: conversation.id,
            sender: "user",
            content: "I'm having trouble understanding the core concepts.",
          },
          {
            conversation_id: conversation.id,
            sender: "assistant",
            content: `Let me explain the key principles of ${topics[i]} in a simple way...`,
          },
        ]);
      }
    }

    // Create sample session logs for the student
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - i);
      
      await supabaseClient.from("session_logs").insert({
        user_id: studentId,
        school_id: schoolId,
        topic_or_content_used: topics[i % topics.length],
        session_start: sessionDate.toISOString(),
        session_end: new Date(sessionDate.getTime() + 30 * 60000).toISOString(), // 30 minutes later
        num_queries: Math.floor(Math.random() * 10) + 5,
      });
    }

    // Create sample assessments from the teacher
    const assessmentTopics = ["Algebra Quiz", "Chemistry Test", "History Exam", "Literature Analysis", "Programming Challenge"];

    for (let i = 0; i < assessmentTopics.length; i++) {
      const { data: assessment } = await supabaseClient
        .from("assessments")
        .insert({
          school_id: schoolId,
          teacher_id: teacherId,
          title: assessmentTopics[i],
          description: `This is a test assessment for ${assessmentTopics[i]}`,
          due_date: new Date(now.getTime() + (i + 1) * 86400000).toISOString(), // Due in i+1 days
          max_score: 100,
        })
        .select()
        .single();

      if (assessment) {
        // Create a submission for some assessments
        if (i < 3) {
          await supabaseClient.from("assessment_submissions").insert({
            assessment_id: assessment.id,
            student_id: studentId,
            score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
            submitted_at: new Date().toISOString(),
            time_spent: Math.floor(Math.random() * 1800) + 600, // Between 10 and 40 minutes
            completed: true,
            feedback: "Good work, but could improve in some areas.",
            strengths: ["Concept understanding", "Problem solving"],
            weaknesses: ["Time management", "Attention to detail"],
          });
        }
      }
    }

    // Create a sample document for the student
    await supabaseClient.from("documents").insert({
      user_id: studentId,
      filename: "Sample Study Notes.pdf",
      file_type: "application/pdf",
      file_size: 1024000,
      storage_path: `documents/${studentId}/sample-study-notes.pdf`,
      processing_status: "completed",
    });

    console.log("Sample data generated successfully");
  } catch (error) {
    console.error("Error generating sample data:", error);
  }
}
