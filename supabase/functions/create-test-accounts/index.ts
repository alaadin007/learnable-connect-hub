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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { createAccounts = false } = await req.json();

    if (!createAccounts) {
      return new Response(
        JSON.stringify({ error: "Missing createAccounts parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if test school code exists
    const { data: schoolCodeData, error: schoolCodeError } = await supabaseClient
      .from("school_codes")
      .select("*")
      .eq("code", TEST_SCHOOL_CODE)
      .maybeSingle();

    if (schoolCodeError && !schoolCodeError.message.includes("No rows found")) {
      console.error("Error checking school code:", schoolCodeError);
      throw new Error(schoolCodeError.message);
    }

    if (!schoolCodeData) {
      // Create school and users if school code not found
      await supabaseClient.from("school_codes").insert({
        code: TEST_SCHOOL_CODE,
        school_name: TEST_SCHOOL_NAME,
        active: true,
      }).throwOnError();

      const testAccounts = [
        { email: "school.test@learnable.edu", password: "school123", userType: "school", fullName: "School Admin" },
        { email: "teacher.test@learnable.edu", password: "teacher123", userType: "teacher", fullName: "Teacher User" },
        { email: "student.test@learnable.edu", password: "student123", userType: "student", fullName: "Student User" },
      ];

      let schoolId: string | null = null;

      for (const account of testAccounts) {
        console.log(`Processing test account: ${account.email}`);

        // Delete existing user if any
        const { data: existingUsers } = await supabaseClient.auth.admin.listUsers({ filters: { email: account.email } });

        if (existingUsers?.users?.length) {
          await supabaseClient.auth.admin.deleteUser(existingUsers.users[0].id);
        }

        // Create user
        const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            user_type: account.userType,
            full_name: account.fullName,
            school_code: account.userType === "school" ? null : TEST_SCHOOL_CODE,
            school_name: TEST_SCHOOL_NAME,
          },
        });

        if (userError) {
          console.error(`Error creating user ${account.email}:`, userError);
          throw new Error(userError.message);
        }

        if (account.userType === "school" && userData.user) {
          const { data: schoolData, error: schoolError } = await supabaseClient
            .from("schools")
            .select("id")
            .eq("code", TEST_SCHOOL_CODE)
            .maybeSingle();

          if (schoolError) {
            console.error("Error fetching school ID:", schoolError);
          } else {
            schoolId = schoolData?.id || null;
          }
        }

        if (schoolId && userData.user && account.userType !== "school") {
          const table = account.userType === "teacher" ? "teachers" : "students";
          const { error: updateError } = await supabaseClient
            .from(table)
            .update({ school_id: schoolId })
            .eq("id", userData.user.id);

          if (updateError) {
            console.error(`Error linking ${account.userType} to school:`, updateError);
          }
        }
      }

      if (schoolId) {
        await generateSampleData(supabaseClient, schoolId);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Test accounts created successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // School code exists - check for existing school test user
    const { data: schoolTestUser, error: schoolTestUserError } = await supabaseClient.auth.admin.listUsers({
      filters: { email: "school.test@learnable.edu" },
    });

    if (schoolTestUserError) {
      console.error("Error checking school test user:", schoolTestUserError);
    }

    if (!schoolTestUser?.users?.length) {
      return new Response(
        JSON.stringify({ message: "Test accounts need to be recreated", recreate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Test accounts already exist" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in test accounts handler:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Sample data generator
async function generateSampleData(supabaseClient: any, schoolId: string) {
  try {
    const { data: teacherData, error: teacherError } = await supabaseClient.auth.admin.listUsers({
      filters: { email: "teacher.test@learnable.edu" },
    });
    const { data: studentData, error: studentError } = await supabaseClient.auth.admin.listUsers({
      filters: { email: "student.test@learnable.edu" },
    });

    if (teacherError || studentError) {
      console.error("Error fetching test users:", teacherError || studentError);
      return;
    }

    const teacherId = teacherData?.users?.[0]?.id;
    const studentId = studentData?.users?.[0]?.id;

    if (!teacherId || !studentId) {
      console.error("Teacher or student test user missing");
      return;
    }

    const topics = ["Math Homework", "Science Project", "History Essay", "English Literature", "Computer Science"];

    for (const topic of topics) {
      const { data: conversation, error: conversationError } = await supabaseClient
        .from("conversations")
        .insert({
          user_id: studentId,
          school_id: schoolId,
          topic,
          title: `Help with ${topic}`,
          summary: `Discussion about ${topic} concepts and problems`,
          category: "Homework",
          tags: [topic.toLowerCase(), "help", "homework"],
          starred: topic === topics[0],
        })
        .select()
        .single();

      if (conversationError) {
        console.error(`Error creating conversation for ${topic}:`, conversationError);
        continue;
      }

      if (conversation) {
        await supabaseClient
          .from("messages")
          .insert([
            { conversation_id: conversation.id, sender: "user", content: `Hi, I need help with my ${topic}.` },
            { conversation_id: conversation.id, sender: "assistant", content: `I'd be happy to help with ${topic}. What part?` },
            { conversation_id: conversation.id, sender: "user", content: "I'm having trouble understanding the core concepts." },
            { conversation_id: conversation.id, sender: "assistant", content: `Let me explain the key principles of ${topic} simply.` },
          ]);
      }
    }

    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - i);

      await supabaseClient.from("session_logs").insert({
        user_id: studentId,
        school_id: schoolId,
        topic_or_content_used: topics[i % topics.length],
        session_start: sessionDate.toISOString(),
        session_end: new Date(sessionDate.getTime() + 30 * 60000).toISOString(),
        num_queries: Math.floor(Math.random() * 10) + 5,
      });
    }

    const assessments = ["Algebra Quiz", "Chemistry Test", "History Exam", "Literature Analysis", "Programming Challenge"];
    for (let i = 0; i < assessments.length; i++) {
      const { data: assessment, error: assessmentError } = await supabaseClient
        .from("assessments")
        .insert({
          school_id: schoolId,
          teacher_id: teacherId,
          title: assessments[i],
          description: `Test assessment for ${assessments[i]}`,
          due_date: new Date(now.getTime() + (i + 1) * 86400000).toISOString(),
          max_score: 100,
        })
        .select()
        .single();

      if (assessmentError) {
        console.error(`Error creating assessment ${assessments[i]}:`, assessmentError);
        continue;
      }

      if (assessment && i < 3) {
        await supabaseClient.from("assessment_submissions").insert({
          assessment_id: assessment.id,
          student_id: studentId,
          score: Math.floor(Math.random() * 30) + 70,
          submitted_at: new Date().toISOString(),
          time_spent: Math.floor(Math.random() * 1800) + 600,
          completed: true,
          feedback: "Good work, but could improve in some areas.",
          strengths: ["Concept understanding", "Problem solving"],
          weaknesses: ["Time management", "Attention to detail"],
        });
      }
    }

    await supabaseClient.from("documents").insert({
      user_id: studentId,
      filename: "Sample Study Notes.pdf",
      file_type: "application/pdf",
      file_size: 1024000,
      storage_path: `documents/${studentId}/sample-study-notes.pdf`,
      processing_status: "completed",
    });

    console.log("Sample data created successfully.");
  } catch (error) {
    console.error("Error generating sample data:", error);
  }
}