
import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { SessionData, TopicData, StudyTimeData, AnalyticsSummary } from "./types";

interface AnalyticsExportProps {
  summary: AnalyticsSummary | null;
  sessions: SessionData[];
  topics: TopicData[];
  studyTimes: StudyTimeData[];
  dateRangeText: string;
}

export function AnalyticsExport({ 
  summary, 
  sessions, 
  topics, 
  studyTimes,
  dateRangeText
}: AnalyticsExportProps) {
  const exportToCSV = () => {
    // Prepare summary data
    const summaryData = summary ? [
      ["Analytics Summary", ""],
      ["Date Range", dateRangeText],
      ["Active Students", summary.activeStudents.toString()],
      ["Total Sessions", summary.totalSessions.toString()],
      ["Total Queries", summary.totalQueries.toString()],
      ["Avg Session (minutes)", summary.avgSessionMinutes.toString()],
      ["", ""],
    ] : [];
    
    // Prepare topics data
    const topicsHeader = ["Topic", "Count"];
    const topicsData = topics.map(topic => [topic.name, topic.value.toString()]);
    const topicsCSV = [
      ["Most Studied Topics", ""],
      topicsHeader,
      ...topicsData,
      ["", ""],
    ];
    
    // Prepare study time data
    const studyTimeHeader = ["Student", "Hours"];
    const studyTimeData = studyTimes.map(item => [item.name, item.hours.toString()]);
    const studyTimeCSV = [
      ["Weekly Study Time", ""],
      studyTimeHeader,
      ...studyTimeData,
      ["", ""],
    ];
    
    // Prepare sessions data
    const sessionsHeader = ["Student", "Topic", "Queries", "Duration", "Date"];
    const sessionsData = sessions.map(session => [
      session.student,
      session.topic || "General",
      session.queries.toString(),
      session.duration,
      new Date(session.startTime).toLocaleString()
    ]);
    const sessionsCSV = [
      ["Session Details", ""],
      sessionsHeader,
      ...sessionsData
    ];
    
    // Combine all data
    const csvContent = [
      ...summaryData,
      ...topicsCSV,
      ...studyTimeCSV,
      ...sessionsCSV
    ]
      .map(row => row.join(","))
      .join("\n");
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics-export-${dateRangeText.replace(/\s/g, "-")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Button 
      variant="outline" 
      onClick={exportToCSV}
      className="ml-auto"
    >
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      Export Data
    </Button>
  );
}
