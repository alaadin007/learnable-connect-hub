
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AnalyticsSummary, SessionData, TopicData, StudyTimeData } from './types';

interface AnalyticsExportProps {
  summary: AnalyticsSummary;
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
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      console.error('No data to export');
      return;
    }
    
    // Get headers from the first row
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => {
        return headers.map(header => {
          const cell = row[header];
          // Handle values with commas or quotes
          if (cell === null || cell === undefined) {
            return '';
          }
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      })
    ];
    
    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create a download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(sessions, 'sessions')}
        disabled={!sessions.length}
      >
        <Download className="mr-2 h-4 w-4" />
        Export Sessions
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(studyTimes, 'study_times')}
        disabled={!studyTimes.length}
      >
        <Download className="mr-2 h-4 w-4" />
        Export Study Times
      </Button>
    </div>
  );
}
