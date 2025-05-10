
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AnalyticsSummary, SessionData, TopicData, StudyTimeData } from './types';

export interface AnalyticsExportProps {
  onExportClick: () => void;
  isLoading: boolean;
}

export function AnalyticsExport({ onExportClick, isLoading }: AnalyticsExportProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportClick}
        disabled={isLoading}
      >
        <Download className="mr-2 h-4 w-4" />
        Export Analytics
      </Button>
    </div>
  );
}
