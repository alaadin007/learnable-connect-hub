// This file contains utility functions for working with analytics data
import { DateRange } from "@/components/analytics/types";

// Function to format a date range for display
export function formatDateRange(range: DateRange): string {
  if (!range.from) return "All time";
  
  const fromDate = range.from.toLocaleDateString();
  const toDate = range.to ? range.to.toLocaleDateString() : "present";
  
  return `${fromDate} to ${toDate}`;
}

// Function to get mock analytics data for testing
export function getMockAnalyticsData() {
  return {
    totalStudents: 120,
    activeStudents: 85,
    avgScore: 78.5,
    completionRate: 72.3,
    topPerformers: [
      { id: "1", name: "Emma Johnson", score: 95.2 },
      { id: "2", name: "David Chen", score: 93.7 },
      { id: "3", name: "Maria Garcia", score: 91.5 },
    ],
    studyTimeByDay: [
      { date: "2023-04-01", hours: 2.5 },
      { date: "2023-04-02", hours: 3.2 },
      { date: "2023-04-03", hours: 4.1 },
      { date: "2023-04-04", hours: 2.8 },
      { date: "2023-04-05", hours: 3.5 },
      { date: "2023-04-06", hours: 5.0 },
      { date: "2023-04-07", hours: 4.2 },
    ],
    subjectPerformance: [
      { subject: "Math", score: 82.3 },
      { subject: "Science", score: 76.9 },
      { subject: "English", score: 88.1 },
      { subject: "History", score: 71.5 },
      { subject: "Art", score: 92.7 },
    ]
  };
}

// Add more utility functions as needed
