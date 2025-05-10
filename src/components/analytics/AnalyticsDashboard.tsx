
import React, { useState } from 'react';
import SessionsTable from './SessionsTable';
import TopicsChart from './TopicsChart';
import StudyTimeChart from './StudyTimeChart';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsExport } from './AnalyticsExport';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import { AnalyticsFilters as FiltersType } from '@/components/analytics/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define props interface for the dashboard
export interface AnalyticsDashboardProps {
  isLoading: boolean;
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
  onExport: () => void;
  data: {
    summary: any;
    sessions: any[];
    topics: any[];
    studyTime: any[];
  };
}

export const AnalyticsDashboard = ({
  filters,
  onFilterChange,
  onExport,
  data
}: AnalyticsDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <AnalyticsFilters 
          currentFilters={filters} 
          onFiltersChange={onFilterChange} 
          isLoading={false}
        />
        <AnalyticsExport onExportClick={onExport} isLoading={false} />
      </div>
      
      <AnalyticsSummaryCards 
        summary={data.summary}
        isLoading={false}
        dateRange={filters.dateRange}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="time">Study Time</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <SessionsTable 
                sessions={data.sessions} 
                isLoading={false} 
                title="Recent Sessions" 
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <TopicsChart data={data.topics} isLoading={false} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <StudyTimeChart data={data.studyTime} isLoading={false} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="sessions">
          <Card>
            <CardContent className="pt-6">
              <SessionsTable 
                sessions={data.sessions} 
                isLoading={false} 
                title="All Sessions" 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="topics">
          <Card>
            <CardContent className="pt-6">
              <TopicsChart data={data.topics} isLoading={false} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="time">
          <Card>
            <CardContent className="pt-6">
              <StudyTimeChart data={data.studyTime} isLoading={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
