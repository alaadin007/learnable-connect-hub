
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AnalyticsSummary, SessionData, TopicData, StudyTimeData } from "./types";

interface AnalyticsExportProps {
  summary: AnalyticsSummary;
  sessions: SessionData[];
  topics: TopicData[];
  studyTimes: StudyTimeData[];
  dateRangeText: string;
}

export const AnalyticsExport: React.FC<AnalyticsExportProps> = ({
  summary,
  sessions,
  topics,
  studyTimes,
  dateRangeText
}) => {
  const handleExport = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add summary section
    csvContent += "SUMMARY DATA\r\n";
    csvContent += `Date Range,${dateRangeText}\r\n`;
    csvContent += `Active Students,${summary.activeStudents}\r\n`;
    csvContent += `Total Sessions,${summary.totalSessions}\r\n`;
    csvContent += `Total Queries,${summary.totalQueries}\r\n`;
    csvContent += `Average Session Duration (minutes),${summary.avgSessionMinutes}\r\n\r\n`;
    
    // Add sessions section
    csvContent += "SESSION DATA\r\n";
    csvContent += "Student,Date,Topic,Duration (min),Queries\r\n";
    
    sessions.forEach(session => {
      const row = [
        session.student_name || session.userName || "Unknown",
        session.session_date.split("T")[0],
        session.topic || (session.topics ? session.topics.join("; ") : ""),
        session.duration_minutes,
        session.questions_asked || session.queries || 0
      ];
      csvContent += row.join(",") + "\r\n";
    });
    
    csvContent += "\r\nTOPIC DATA\r\n";
    csvContent += "Topic,Count\r\n";
    
    topics.forEach(topic => {
      csvContent += `${topic.topic},${topic.count}\r\n`;
    });
    
    csvContent += "\r\nSTUDY TIME DATA\r\n";
    csvContent += "Student,Total Minutes,Hours\r\n";
    
    studyTimes.forEach(studyTime => {
      csvContent += `${studyTime.student_name},${studyTime.total_minutes},${(studyTime.total_minutes / 60).toFixed(1)}\r\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    
    // Download file
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Export Data
    </Button>
  );
};
