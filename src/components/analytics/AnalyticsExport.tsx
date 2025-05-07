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

/**
 * Escape CSV cell content to handle commas, quotes, newlines.
 */
function csvEscape(cell: string | number | null | undefined): string {
  if (cell == null) return "";
  const cellStr = cell.toString();
  const escaped = cellStr.replace(/"/g, '""');
  if (/[",\n]/.test(cellStr)) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * Normalize date to yyyy-MM-dd format if possible, else fallback to string.
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toISOString().slice(0, 10);
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
    const topicsData = topics.map(topic => [
      csvEscape(topic.topic ?? topic.name ?? "Unknown"),
      csvEscape(topic.count ?? topic.value ?? 0)
    ]);
    const topicsCSV = [
      ["Most Studied Topics", ""],
      topicsHeader,
      ...topicsData,
      ["", ""],
    ];
    
    // Prepare study time data
    const studyTimeHeader = ["Student", "Hours"];
    const studyTimeData = studyTimes.map(item => [
      csvEscape(item.student_name ?? item.studentName ?? item.name ?? "Unknown"),
      csvEscape(
        typeof item.total_minutes === "number"
          ? (item.total_minutes / 60).toFixed(2)
          : item.hours?.toString() ?? "0"
      )
    ]);
    const studyTimeCSV = [
      ["Weekly Study Time", ""],
      studyTimeHeader,
      ...studyTimeData,
      ["", ""],
    ];
    
    // Prepare sessions data
    const sessionsHeader = ["Student", "Topic", "Queries", "Duration", "Date"];
    const sessionsData = sessions.map(session => [
      csvEscape(session.student_name ?? session.userName ?? session.student ?? "Unknown"),
      csvEscape(
        Array.isArray(session.topics) && session.topics.length > 0
          ? session.topics[0]
          : session.topicOrContent ?? session.topic ?? "General"
      ),
      csvEscape(session.questions_asked ?? session.numQueries ?? session.queries ?? 0),
      csvEscape(
        typeof session.duration_minutes === "number"
          ? `${session.duration_minutes} min`
          : typeof session.duration === "string"
            ? session.duration
            : `${session.duration ?? 0} min`
      ),
      csvEscape(formatDate(session.session_date ?? session.startTime ?? undefined))
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