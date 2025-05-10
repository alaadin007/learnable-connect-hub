
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { 
  SessionData, 
  TopicData, 
  StudyTimeData, 
  AnalyticsSummary,
  DateRange,
  AnalyticsFilters 
} from '@/components/analytics/types';
import { 
  getAnalyticsSummary,
  getSessionLogs, 
  getTopics, 
  getStudyTime,
  getDateRangeText,
  exportAnalyticsToCSV
} from '@/utils/analyticsUtils';
import { toast } from 'sonner';
import { retryWithBackoff } from '@/utils/networkHelpers';

const TeacherAnalytics = () => {
  const { schoolId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>({});

  useEffect(() => {
    if (schoolId) {
      loadAnalyticsData(schoolId, filters);
    }
  }, [schoolId, filters]);

  const loadAnalyticsData = async (schoolId: string, filters?: AnalyticsFilters) => {
    setIsLoading(true);
    try {
      // Load summary data
      const summaryData = await retryWithBackoff(() => 
        getAnalyticsSummary(schoolId)
      );
      setSummary(summaryData);

      // Load session logs
      const sessionData = await retryWithBackoff(() => 
        getSessionLogs(schoolId, filters)
      );
      setSessions(sessionData);

      // Load topics
      const topicsData = await retryWithBackoff(() => 
        getTopics(schoolId, filters)
      );
      setTopics(topicsData);

      // Load study time
      const studyTimeData = await retryWithBackoff(() => 
        getStudyTime(schoolId, filters)
      );
      setStudyTime(studyTimeData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
      exportAnalyticsToCSV(
        summary,
        sessions,
        topics,
        studyTime,
        getDateRangeText(filters.dateRange)
      );
      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics data');
    }
  };

  const handleFilterChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Student Analytics</h1>
        <AnalyticsDashboard
          summary={summary}
          sessions={sessions}
          topics={topics}
          studyTime={studyTime}
          isLoading={isLoading}
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
        />
      </div>
    </DashboardLayout>
  );
};

export default TeacherAnalytics;
