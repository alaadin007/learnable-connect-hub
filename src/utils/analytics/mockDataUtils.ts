
import { SessionData, TopicData, StudyTimeData } from "@/components/analytics/types";

// Helper function for mock session data
export const getMockSessionData = (): SessionData[] => {
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
    topic: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5],
    queries: Math.floor(Math.random() * 10) + 3
  }));
};

// Helper function for mock topics data
export const getMockTopicsData = (): TopicData[] => {
  return [
    { topic: 'Math', count: 15, name: 'Math', value: 15 },
    { topic: 'Science', count: 12, name: 'Science', value: 12 },
    { topic: 'History', count: 8, name: 'History', value: 8 },
    { topic: 'English', count: 7, name: 'English', value: 7 },
    { topic: 'Geography', count: 5, name: 'Geography', value: 5 }
  ];
};

// Helper function for mock study time data
export const getMockStudyTimeData = (): StudyTimeData[] => {
  return [
    { student_id: 'student-1', student_name: 'Student 1', total_minutes: 240, name: 'Student 1', studentName: 'Student 1', hours: 4, week: 1, year: 2023 },
    { student_id: 'student-2', student_name: 'Student 2', total_minutes: 180, name: 'Student 2', studentName: 'Student 2', hours: 3, week: 1, year: 2023 },
    { student_id: 'student-3', student_name: 'Student 3', total_minutes: 150, name: 'Student 3', studentName: 'Student 3', hours: 2.5, week: 1, year: 2023 },
    { student_id: 'student-4', student_name: 'Student 4', total_minutes: 120, name: 'Student 4', studentName: 'Student 4', hours: 2, week: 1, year: 2023 },
    { student_id: 'student-5', student_name: 'Student 5', total_minutes: 90, name: 'Student 5', studentName: 'Student 5', hours: 1.5, week: 1, year: 2023 }
  ];
};
