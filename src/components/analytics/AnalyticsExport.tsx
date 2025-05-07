import { SessionData, TopicData, StudyTimeData, AnalyticsSummary } from "./types";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx-js-style';

interface AnalyticsExportProps {
  summary: AnalyticsSummary;
  sessions: SessionData[]; 
  topics: TopicData[]; 
  studyTime: StudyTimeData[];
  dateRangeText: string;
}

export function AnalyticsExport({ 
    summary, 
    sessions, 
    topics, 
    studyTime, 
    dateRangeText 
}: AnalyticsExportProps) {
    const exportAnalyticsToCSV = () => {
        // Prepare summary data
        const summaryData = [
            { "Metric": "Active Students", "Value": summary.activeStudents },
            { "Metric": "Total Sessions", "Value": summary.totalSessions },
            { "Metric": "Total Queries", "Value": summary.totalQueries },
            { "Metric": "Avg Session Minutes", "Value": summary.avgSessionMinutes },
            { "Metric": "Date Range", "Value": dateRangeText }
        ];

        // Prepare sessions data
        const sessionsData = formatSessionsData(sessions);

        // Prepare topics data
        const topicsData = topics.map(topic => {
            return {
                "Topic": topic.topic,
                "Count": topic.count
            };
        });

        // Prepare study time data
        const studyTimeData = studyTime.map(time => {
            return {
                "Student": time.student_name,
                "Total Minutes": time.total_minutes,
                "Hours": time.hours
            };
        });

        // Create worksheets
        const summaryWS = XLSX.utils.json_to_sheet(summaryData);
        const sessionsWS = XLSX.utils.json_to_sheet(sessionsData);
        const topicsWS = XLSX.utils.json_to_sheet(topicsData);
        const studyTimeWS = XLSX.utils.json_to_sheet(studyTimeData);

        // Create workbook and add worksheets
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");
        XLSX.utils.book_append_sheet(wb, sessionsWS, "Sessions");
        XLSX.utils.book_append_sheet(wb, topicsWS, "Topics");
        XLSX.utils.book_append_sheet(wb, studyTimeWS, "Study Time");

        // Generate Excel file
        XLSX.writeFile(wb, "analytics_data.xlsx");
    };
    
    interface FormattedSession {
        "Session ID": string;
        "Student": string;
        "Date": string;
        "Topic": string;
        "Duration (min)": number;
        "Queries": number;
        "Questions Asked": number;
        "Questions Answered": number;
        "Start Time": string;
    }
    const formatSessionsData = (sessions: SessionData[]): FormattedSession[] => {
        return sessions.map(session => {
            return {
                "Session ID": session.id,
                "Student": session.student_name || session.userName || "Unknown",
                "Date": new Date(session.session_date).toLocaleDateString(),
                "Topic": session.topic || "N/A",
                "Duration (min)": session.duration_minutes || (typeof session.duration === 'number' ? session.duration : 0),
                "Queries": session.queries || 0,
                "Questions Asked": session.questions_asked || 0,
                "Questions Answered": session.questions_answered || 0,
                "Start Time": "N/A"
            };
        });
    };
    
    return (
        <Button variant="outline" onClick={exportAnalyticsToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export Analytics
        </Button>
    );
}
