import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { 
  AnalyticsFilters, 
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData
} from "@/components/analytics/types";

// Create session log in database
export const createSessionLog = async (topic?: string): Promise<string | null> => {
  try {
    // Use the RPC function directly
    const { data, error } = await supabase.rpc("create_session_log", {
      topic: topic || "General Chat"
    });

    if (error) {
      console.error("Error creating session log:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error in createSessionLog:", error);
    return null;
  }
};

// End session log in database
export const endSessionLog = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to end");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("end_session_log", {
      log_id: sessionId,
      performance_data: performanceData
    });

    if (error) {
      console.error("Error ending session:", error);
    }
  } catch (error) {
    console.error("Error in endSessionLog:", error);
  }
};

// Update session topic in database
export const updateSessionTopic = async (sessionId: string, topic: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to update topic");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("update_session_topic", {
      log_id: sessionId,
      topic
    });

    if (error) {
      console.error("Error updating session topic:", error);
    }
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
  }
};

// Save chat message directly to database
export const saveChatMessage = async (
  message: { role: string; content: string },
  conversationId?: string,
  sessionId?: string
): Promise<{ success: boolean; message?: any; conversationId?: string }> => {
  try {
    if (!message || !message.role || !message.content) {
      console.error("Invalid message data");
      return { success: false };
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false };
    }

    // Get user's school ID
    const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
    if (schoolError) {
      console.error("Error getting school ID:", schoolError);
      return { success: false };
    }

    let convoId = conversationId;

    // If no conversation ID is provided, create a new conversation
    if (!convoId) {
      const { data: convoData, error: convoError } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: user.id, 
          school_id: schoolData,
          title: `New conversation on ${new Date().toLocaleDateString()}`,
          last_message_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (convoError) {
        console.error("Error creating conversation:", convoError);
        return { success: false };
      }
      convoId = convoData.id;
    } else {
      // Update the last_message_at for the existing conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    }

    // Save the message to the database
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: convoId,
        content: message.content,
        sender: message.role,
      }])
      .select('*')
      .single();

    if (msgError) {
      console.error("Error saving message:", msgError);
      return { success: false };
    }

    // If session ID is provided, update the session query count
    if (sessionId) {
      await supabase.rpc("increment_session_query_count", { log_id: sessionId });
    }

    return { 
      success: true, 
      message: msgData,
      conversationId: convoId
    };
  } catch (error) {
    console.error("Error in saveChatMessage:", error);
    return { success: false };
  }
};

// Get chat history directly from database
export const getChatHistory = async (conversationId: string): Promise<{ 
  messages: any[]; 
  conversation: any;
} | null> => {
  try {
    // Fetch conversation to verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convoError || !conversation) {
      console.error("Error fetching conversation:", convoError);
      return null;
    }

    // Fetch messages for the conversation
    const { data: messages, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgsError) {
      console.error("Error fetching messages:", msgsError);
      return null;
    }

    return { 
      messages: messages || [],
      conversation
    };
  } catch (error) {
    console.error("Error in getChatHistory:", error);
    return null;
  }
};

// Get user conversations directly from database
export const getUserConversations = async (): Promise<any[] | null> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Fetch all conversations for the user
    const { data: conversations, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (convoError) {
      console.error("Error fetching conversations:", convoError);
      return null;
    }

    return conversations || [];
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    return null;
  }
};

// Generate summary for conversation directly
export const generateConversationSummary = async (conversationId: string): Promise<{
  summary?: string;
  tags?: string[];
  category?: string;
} | null> => {
  try {
    // Verify the user can access this conversation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .select('id, user_id, topic, title')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();
    
    if (convoError || !conversation) {
      console.error("Conversation not found or access denied:", convoError);
      return null;
    }

    // Get the conversation messages
    const { data: messages, error: msgsError } = await supabase
      .from('messages')
      .select('content, sender')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (msgsError || !messages || messages.length === 0) {
      console.error("Failed to fetch messages:", msgsError);
      return null;
    }

    // Generate a summary based on the first few user messages
    const userMessages = messages.filter(msg => msg.sender === 'user').slice(0, 3);
    let summary = '';
    
    if (userMessages.length > 0) {
      // If we have a topic, include it in the summary
      if (conversation.topic) {
        summary = `Topic: ${conversation.topic} - `;
      }
      
      // Add content from the first few user messages
      for (let i = 0; i < Math.min(2, userMessages.length); i++) {
        const content = userMessages[i].content;
        const shortenedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        summary += (i > 0 ? ' | ' : '') + shortenedContent;
      }
    } else {
      summary = conversation.title || "Untitled conversation";
    }
    
    // Generate simple tags based on content
    const allText = userMessages.map(msg => msg.content).join(' ');
    const tags = generateTags(allText, conversation.topic);
    
    // Determine a category
    const category = determineCategory(allText, conversation.topic);

    // Update the conversation with the summary, tags and category
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        summary, 
        tags,
        category: category || null,
        title: conversation.title || generateTitle(summary)
      })
      .eq('id', conversationId);
    
    if (updateError) {
      console.error("Failed to update conversation:", updateError);
    }

    return { summary, tags, category };
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
};

// Helper functions for summary generation
function generateTags(text: string, topic: string | null): string[] {
  const tags: Set<string> = new Set();
  
  // Add topic-based tags
  if (topic) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    topicWords.forEach(word => {
      if (word.length > 3) {
        tags.add(word);
      }
    });
  }
  
  // Common academic subjects to look for
  const subjects = [
    "math", "algebra", "calculus", "geometry", "physics", "chemistry", "biology",
    "history", "geography", "literature", "english", "writing", "grammar",
    "science", "computer", "programming", "language", "spanish", "french",
    "psychology", "sociology", "economics", "philosophy", "music", "art"
  ];
  
  // Look for subject mentions in the text
  const lowercaseText = text.toLowerCase();
  subjects.forEach(subject => {
    if (lowercaseText.includes(subject)) {
      tags.add(subject);
    }
  });
  
  // Convert set to array and limit to top 5 tags
  return Array.from(tags).slice(0, 5);
}

function determineCategory(text: string, topic: string | null): string | null {
  const lowercaseText = text.toLowerCase();
  const topicLower = topic ? topic.toLowerCase() : '';
  
  // Define category mapping with keywords
  const categories = {
    "Homework": ["homework", "assignment", "exercise", "problem set", "worksheet"],
    "Exam Prep": ["exam", "test", "quiz", "study", "review", "midterm", "final"],
    "Research": ["research", "paper", "essay", "thesis", "analysis", "investigate"],
    "General Question": ["question", "explain", "how to", "what is", "why does", "help me understand"],
    "Project": ["project", "build", "create", "design", "develop", "implement"]
  };
  
  // Check for category matches
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword) || (topicLower && topicLower.includes(keyword))) {
        return category;
      }
    }
  }
  
  return null;
}

function generateTitle(summary: string): string {
  // Extract first part of summary (max 50 chars) for title
  const titleText = summary.length > 50 ? summary.substring(0, 47) + '...' : summary;
  return titleText;
}

// Student management functions
export const approveStudentDirect = async (studentId: string): Promise<boolean> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Get the school_id of the logged in teacher
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return false;
    }

    // Check if student exists and belongs to the same school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentError || !studentData) {
      console.error("Student not found or not in your school:", studentError);
      return false;
    }

    // Update student status to "active"
    const { error: updateError } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (updateError) {
      console.error("Error updating student status:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in approveStudent:", error);
    return false;
  }
};

export const revokeStudentAccessDirect = async (studentId: string): Promise<boolean> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Get the school_id of the logged in teacher
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.error("Only teachers can revoke student access:", teacherError);
      return false;
    }

    // Verify that the student belongs to the teacher's school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", studentId)
      .eq("school_id", teacherData.school_id)
      .single();

    if (studentError || !studentData) {
      console.error("Student not found or not in your school:", studentError);
      return false;
    }

    // Delete the student record (this doesn't delete the auth user, only revokes access)
    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (deleteError) {
      console.error("Failed to revoke student access:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in revokeStudentAccess:", error);
    return false;
  }
};

export const inviteStudentDirect = async (method: "code" | "email", email?: string): Promise<{
  success: boolean; 
  code?: string; 
  email?: string;
  message?: string;
}> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return { success: false, message: "Could not determine school ID" };
    }

    if (method === "code") {
      // Generate a unique invite code
      const { data: inviteData, error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          teacher_id: user.id,
          code: generateInviteCode(),
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        code: inviteData.code,
        message: "Student invite code generated successfully" 
      };
    } 
    else if (method === "email" && email) {
      // Generate a unique invite code for email
      const { data: inviteData, error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          teacher_id: user.id,
          code: generateInviteCode(),
          email: email,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        code: inviteData.code,
        email: email,
        message: "Student invite created successfully" 
      };
    } 
    else {
      return { success: false, message: "Invalid request parameters" };
    }
  } catch (error) {
    console.error("Error in inviteStudent:", error);
    return { success: false, message: "Internal error" };
  }
};

// Helper function to generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes similar looking characters
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Teacher management functions
export const inviteTeacherDirect = async (email: string): Promise<{
  success: boolean;
  inviteId?: string;
  message?: string;
}> => {
  try {
    // Verify the user is logged in and is a school supervisor
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if user is a school supervisor
    const { data: isSupervisor, error: supervisorError } = await supabase
      .rpc("is_supervisor", { user_id: user.id });

    if (supervisorError || !isSupervisor) {
      return { success: false, message: "Only school supervisors can invite teachers" };
    }

    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // Use RPC to invite teacher with existing function
    const { data: inviteResult, error: inviteError } = await supabase
      .rpc("invite_teacher", {
        teacher_email: email
      });

    if (inviteError) {
      console.error("Error inviting teacher:", inviteError);
      return { success: false, message: inviteError.message };
    }

    return { 
      success: true, 
      inviteId: inviteResult,
      message: "Teacher invitation sent successfully" 
    };
  } catch (error) {
    console.error("Error in inviteTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};

export const createTeacherDirect = async (email: string, full_name?: string): Promise<{
  success: boolean;
  message?: string;
  data?: {
    email: string;
    temp_password?: string;
  };
}> => {
  try {
    // This function uses admin privileges and must be run server-side
    // Since we're replacing edge functions, this would normally require an edge function
    // As a compromise, we'll indicate this limitation
    
    toast.error("Direct teacher creation requires server-side privileges");
    return { 
      success: false, 
      message: "Teacher creation requires admin privileges and cannot be performed directly from the browser. This would typically require server-side code."
    };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};

// Test account utilities
export const populateTestAccountWithSessionsDirect = async (userId: string, schoolId: string, numSessions = 5): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}> => {
  try {
    // Skip calls for non-test users or if missing required IDs
    if (!userId || !schoolId) {
      return { success: false, message: "Missing user ID or school ID" };
    }
    
    // Detect if this is a test account
    const isTest = userId.startsWith('test-') || schoolId.startsWith('test-');
    if (!isTest) {
      // Only create test sessions for test accounts
      return { success: false, message: "Not a test account" };
    }
    
    console.log(`Creating test sessions for ${userId} in school ${schoolId}`);
    
    // Call the database function directly
    const { error } = await supabase.rpc("populatetestaccountwithsessions", {
      userid: userId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error("Error creating test sessions:", error);
      return { success: false, message: error.message };
    }
    
    console.log("Test sessions created successfully");
    return { success: true, message: "Test sessions created successfully" };
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    return { success: false, message: error.message };
  }
};

// Add the CSV export functionality
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  dateRangeStr: string
): void => {
  try {
    // Prepare data for CSV
    // 1. Summary data
    const summaryData = [
      ['Analytics Summary', ''],
      ['Date Range', dateRangeStr],
      ['Active Students', summary.activeStudents.toString()],
      ['Total Sessions', summary.totalSessions.toString()],
      ['Total Queries', summary.totalQueries.toString()],
      ['Avg Session Minutes', summary.avgSessionMinutes.toString()],
      ['', ''] // Empty row as separator
    ];

    // 2. Sessions data
    const sessionsHeader = ['Student', 'Date', 'Topic', 'Duration (min)', 'Queries'];
    const sessionsRows = sessions.map(session => [
      session.student_name || 'Unknown',
      new Date(session.session_date).toLocaleDateString(),
      session.topic || 'General',
      session.duration_minutes?.toString() || '0',
      session.queries?.toString() || '0'
    ]);

    // 3. Topics data
    const topicsHeader = ['Topic', 'Count', 'Percentage'];
    const totalTopicCount = topics.reduce((sum, t) => sum + t.count, 0);
    const topicsRows = topics.map(topic => [
      topic.topic,
      topic.count.toString(),
      totalTopicCount > 0 ? `${((topic.count / totalTopicCount) * 100).toFixed(1)}%` : '0%'
    ]);

    // 4. Study time data
    const studyTimeHeader = ['Student', 'Total Minutes', 'Hours'];
    const studyTimeRows = studyTime.map(st => [
      st.student_name,
      st.total_minutes.toString(),
      (st.total_minutes / 60).toFixed(1)
    ]);

    // Combine all data
    const allData = [
      ...summaryData,
      ['Sessions', ''],
      sessionsHeader,
      ...sessionsRows,
      ['', ''], // Separator
      ['Topics', ''],
      topicsHeader,
      ...topicsRows,
      ['', ''], // Separator
      ['Study Time', ''],
      studyTimeHeader,
      ...studyTimeRows
    ];

    // Convert to CSV
    const csvContent = "data:text/csv;charset=utf-8," + 
      allData.map(row => row.join(',')).join('\n');
    
    // Download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analytics-${dateRangeStr.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw new Error("Failed to export data to CSV");
  }
};

// Fix the direct database query issues - add proper awaits and type handling
export const fetchAnalyticsSummary = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<AnalyticsSummary> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for analytics summary, using demo data");
      return getMockSummaryData();
    }

    // Get date range filter
    const { dateRange } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Build the query with proper await
    const { data, error } = await supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        school_id,
        topic_or_content_used,
        session_start,
        session_end,
        num_queries
      `)
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate);

    if (error) {
      console.error("Error fetching analytics summary:", error);
      return getMockSummaryData();
    }

    // Process the data
    const sessions = data || [];
    const uniqueStudents = new Set(sessions.map(s => s.user_id));
    const totalQueries = sessions.reduce((sum, s) => sum + (s.num_queries || 0), 0);
    
    // Calculate average session duration
    let totalMinutes = 0;
    let sessionsWithDuration = 0;
    
    sessions.forEach(session => {
      if (session.session_start && session.session_end) {
        const start = new Date(session.session_start);
        const end = new Date(session.session_end);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        
        if (durationMinutes > 0 && durationMinutes < 240) { // Filter out sessions longer than 4 hours
          totalMinutes += durationMinutes;
          sessionsWithDuration++;
        }
      }
    });
    
    const avgSessionMinutes = sessionsWithDuration > 0 
      ? Math.round(totalMinutes / sessionsWithDuration) 
      : 0;

    return {
      activeStudents: uniqueStudents.size,
      totalSessions: sessions.length,
      totalQueries,
      avgSessionMinutes
    };
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    return getMockSummaryData();
  }
};

// Helper function for mock summary data
const getMockSummaryData = (): AnalyticsSummary => {
  return {
    activeStudents: 12,
    totalSessions: 35,
    totalQueries: 105,
    avgSessionMinutes: 22
  };
};

// Check if string is a valid UUID
export const isValidUUID = (str: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
};

// Fix the session logs query with proper type handling
export const fetchSessionLogs = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for session logs, using demo data");
      return getMockSessionData();
    }

    // Get date range filter
    const { dateRange, teacherId, studentId } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Build query
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        school_id,
        topic_or_content_used,
        session_start,
        session_end,
        num_queries,
        profiles!inner(full_name)
      `)
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate)
      .order('session_start', { ascending: false });

    // Add student filter if provided
    if (studentId && isValidUUID(studentId)) {
      query = query.eq('user_id', studentId);
    }

    // Execute the query with proper await
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching session logs:", error);
      return getMockSessionData();
    }

    // Transform the data into the expected format
    const sessions: SessionData[] = (data || []).map(session => {
      // Calculate session duration in minutes
      let durationMinutes = 0;
      if (session.session_start && session.session_end) {
        const start = new Date(session.session_start);
        const end = new Date(session.session_end);
        durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Get the student name from the profiles relation
      const studentName = session.profiles?.full_name || 'Unknown Student';

      return {
        id: session.id,
        student_id: session.user_id,
        student_name: studentName,
        session_date: session.session_start,
        duration_minutes: durationMinutes,
        topics: session.topic_or_content_used ? [session.topic_or_content_used] : [],
        questions_asked: session.num_queries || 0,
        questions_answered: session.num_queries || 0, // Assuming all questions were answered
        userId: session.user_id,
        userName: studentName,
        topic: session.topic_or_content_used || 'General',
        queries: session.num_queries || 0
      };
    });

    return sessions;
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    return getMockSessionData();
  }
};

// Helper function for mock session data
const getMockSessionData = (): SessionData[] => {
  return Array(15).fill(null).map((_, i) => ({
    id: `mock-session-${i}`,
    student_id: `student-${i % 5 + 1}`,
    student_name: `Student ${i % 5 + 1}`,
    session_date: new Date(Date.now() - (i * 86400000)).toISOString(),
    duration_minutes: Math.floor(Math.random() * 45) + 10,
    topics: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5].split(','),
    questions_asked: Math.floor(Math.random() * 10) + 3,
    questions_answered: Math.floor(Math.random() * 8) + 2,
    userId: `student-${i % 5 + 1}`,
    userName: `Student ${i % 5 + 1}`,
    topic: ['Math', 'Science', 'History', 'English', 'Geography'][i %
