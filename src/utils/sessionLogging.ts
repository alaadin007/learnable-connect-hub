
// If this file exists, I'm making an update to ensure the populateTestAccountWithSessions function works correctly,
// particularly with the teacher test account. This file is referenced in AuthContext but not shown in the current code snippet.
// If it doesn't exist, this will create it with the proper functionality.

// Export the function that's used in AuthContext
export const populateTestAccountWithSessions = async (userId: string, schoolId: string, numSessions = 5): Promise<void> => {
  try {
    console.log(`SessionLogging: Populating test account ${userId} with ${numSessions} sessions for school ${schoolId}`);
    
    // Call the Supabase function to populate test sessions
    const { error } = await supabase.functions.invoke("populate-test-performance", {
      body: { 
        userId,
        schoolId,
        numSessions 
      }
    });
    
    if (error) {
      console.error("Error invoking populate-test-performance:", error);
      throw error;
    }
    
    console.log(`SessionLogging: Successfully populated test sessions for ${userId}`);
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    throw error;
  }
};

// Add mock analytics data generation function
export const getMockAnalyticsData = (schoolId: string, filters: any = {}) => {
  console.log(`Generating mock analytics data for school ${schoolId} with filters:`, filters);
  
  // Define date range from filters or use defaults
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  
  if (filters.dateRange?.from) {
    startDate.setTime(filters.dateRange.from.getTime());
  } else if (filters.startDate) {
    startDate.setTime(new Date(filters.startDate).getTime());
  }
  
  if (filters.dateRange?.to) {
    endDate.setTime(filters.dateRange.to.getTime());
  } else if (filters.endDate) {
    endDate.setTime(new Date(filters.endDate).getTime());
  }
  
  // Generate mock summary data
  const summary = {
    activeStudents: Math.floor(Math.random() * 15) + 10,
    totalSessions: Math.floor(Math.random() * 50) + 30,
    totalQueries: Math.floor(Math.random() * 300) + 100,
    avgSessionMinutes: Math.floor(Math.random() * 20) + 10
  };
  
  // Generate mock session data
  const studentNames = ['Alex Johnson', 'Taylor Smith', 'Jordan Williams', 'Casey Brown', 'Riley Davis'];
  const topics = [
    'Algebra equations', 
    'World War II', 
    'Chemical reactions', 
    'Shakespeare literature', 
    'Geography concepts',
    'Programming basics',
    'Biology cell structure',
    'Geometry theorems'
  ];
  
  const sessions = Array.from({ length: 20 }, (_, i) => {
    const sessionDate = new Date();
    sessionDate.setDate(endDate.getDate() - Math.floor(Math.random() * 30));
    const duration = Math.floor(Math.random() * 50) + 10;
    const student = studentNames[Math.floor(Math.random() * studentNames.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const queries = Math.floor(Math.random() * 15) + 3;
    
    return {
      id: `session-${i + 1}`,
      userId: `user-${i % studentNames.length + 1}`,
      userName: student,
      student: student,
      startTime: sessionDate.toISOString(),
      endTime: new Date(sessionDate.getTime() + duration * 60000).toISOString(),
      duration: duration,
      topicOrContent: topic,
      topic: topic,
      numQueries: queries,
      queries: queries
    };
  }).filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
  
  // Generate mock topic data based on sessions
  const topicCounts: Record<string, number> = {};
  sessions.forEach(session => {
    const topic = session.topicOrContent;
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  
  const topicsData = Object.entries(topicCounts).map(([topic, count]) => ({
    topic,
    name: topic,
    count,
    value: count
  }));
  
  // Sort topics by count in descending order
  topicsData.sort((a, b) => b.count - a.count);
  
  // Generate mock study time data by student
  const studyTimeByStudent: Record<string, number> = {};
  sessions.forEach(session => {
    const student = session.userName;
    studyTimeByStudent[student] = (studyTimeByStudent[student] || 0) + Number(session.duration);
  });
  
  const studyTimeData = Object.entries(studyTimeByStudent).map(([student, minutes]) => ({
    studentName: student,
    name: student,
    hours: +(minutes / 60).toFixed(1),
    week: 1,
    year: new Date().getFullYear(),
    
    // Additional fields for the new types
    student_id: `user-${studentNames.indexOf(student) + 1}`,
    student_name: student,
    total_minutes: minutes
  }));
  
  // Sort study time by hours in descending order
  studyTimeData.sort((a, b) => b.hours - a.hours);
  
  return {
    summary,
    sessions,
    topics: topicsData,
    studyTime: studyTimeData
  };
};

// Import supabase client if it doesn't exist in the file
import { supabase } from "@/integrations/supabase/client";
