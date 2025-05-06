
import { format } from "date-fns";
import { AnalyticsSummary, SessionData, StudyTimeData, TopicData } from "@/components/analytics/types";

// Export analytics data to CSV
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary | null, 
  sessions: SessionData[], 
  topics: TopicData[], 
  studyTime: StudyTimeData[],
  dateRangeText: string
): void => {
  try {
    // Create the CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add summary section
    csvContent += "ANALYTICS SUMMARY\r\n";
    csvContent += `Date Range,${dateRangeText}\r\n`;
    
    if (summary) {
      csvContent += `Active Students,${summary.activeStudents}\r\n`;
      csvContent += `Total Sessions,${summary.totalSessions}\r\n`;
      csvContent += `Total Queries,${summary.totalQueries}\r\n`;
      csvContent += `Average Session Duration (min),${summary.avgSessionMinutes}\r\n`;
    }
    
    csvContent += "\r\n";
    
    // Add sessions section
    csvContent += "LEARNING SESSIONS\r\n";
    csvContent += "Student Name,Date,Duration (min),Topics,Questions Asked,Questions Answered\r\n";
    
    sessions.forEach(session => {
      const row = [
        session.student_name || 'Unknown',
        session.session_date ? format(new Date(session.session_date), 'yyyy-MM-dd') : 'Unknown',
        session.duration_minutes || 0,
        Array.isArray(session.topics) ? session.topics.join('; ') : (session.topic || 'General'),
        session.questions_asked || session.queries || 0,
        session.questions_answered || 0
      ].join(',');
      
      csvContent += row + "\r\n";
    });
    
    csvContent += "\r\n";
    
    // Add topics section
    csvContent += "TOPICS BREAKDOWN\r\n";
    csvContent += "Topic,Count\r\n";
    
    topics.forEach(topic => {
      const row = [
        topic.topic || topic.name || 'Unknown',
        topic.count || topic.value || 0
      ].join(',');
      
      csvContent += row + "\r\n";
    });
    
    csvContent += "\r\n";
    
    // Add study time section
    csvContent += "STUDENT STUDY TIME\r\n";
    csvContent += "Student Name,Total Minutes,Hours\r\n";
    
    studyTime.forEach(student => {
      const row = [
        student.student_name || student.studentName || student.name || 'Unknown',
        student.total_minutes || 0,
        student.hours || (student.total_minutes ? (student.total_minutes / 60).toFixed(1) : 0)
      ].join(',');
      
      csvContent += row + "\r\n";
    });
    
    // Create and trigger a download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting analytics data:", error);
    alert("Failed to export analytics data. Please try again.");
  }
};

// Helper function for formatting date range text
export const getDateRangeText = (dateRange: { from?: Date, to?: Date } | undefined): string => {
  if (!dateRange || !dateRange.from) {
    return "Last 30 days";
  }
  
  const from = dateRange.from;
  const to = dateRange.to || from;
  
  // Same day
  if (from.getFullYear() === to.getFullYear() && 
      from.getMonth() === to.getMonth() && 
      from.getDate() === to.getDate()) {
    return format(from, 'MMM d, yyyy');
  }
  
  // Same month and year
  if (from.getFullYear() === to.getFullYear() && 
      from.getMonth() === to.getMonth()) {
    return `${format(from, 'MMM d')} - ${format(to, 'd, yyyy')}`;
  }
  
  // Same year but different months
  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
  }
  
  // Different years
  return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`;
};
