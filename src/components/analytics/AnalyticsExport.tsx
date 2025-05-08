import React, { useState } from 'react';
import {
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData
} from '@/components/analytics/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';

export interface AnalyticsExportProps {
  data: {
    summary: AnalyticsSummary;
    sessions: SessionData[];
    topics: TopicData[];
    studyTime: StudyTimeData[];
  };
  dateRange: string;
  studentName?: string | null;
  onClose: () => void;
}

export const AnalyticsExport: React.FC<AnalyticsExportProps> = ({
  data,
  dateRange,
  studentName,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
        mimeType = 'application/json';
      } else {
        // CSV export
        const summaryCSV = `Summary Data\nMetric,Value\nActive Students,${data.summary.activeStudents}\nTotal Sessions,${data.summary.totalSessions}\nTotal Queries,${data.summary.totalQueries}\nAvg Session Minutes,${data.summary.avgSessionMinutes}\n\n`;
        
        const sessionsHeader = 'ID,Student Name,Date,Duration (min),Topic,Queries\n';
        const sessionsRows = data.sessions.map(s => 
          `${s.id},"${s.userName || s.student_name || ''}",${format(new Date(s.startTime || s.session_date || ''), 'yyyy-MM-dd')},${s.duration_minutes || Math.floor((s.duration || 0) / 60)},${s.topicOrContent || s.topic_or_content_used || ''},${s.numQueries || s.questions_asked || 0}`
        ).join('\n');
        const sessionsCSV = `Sessions Data\n${sessionsHeader}${sessionsRows}\n\n`;
        
        const topicsHeader = 'Topic,Count\n';
        const topicsRows = data.topics.map(t => 
          `"${t.topic || t.name || ''}",${t.count || t.value || 0}`
        ).join('\n');
        const topicsCSV = `Topics Data\n${topicsHeader}${topicsRows}\n\n`;
        
        const studyTimeHeader = 'Student,Week,Year,Hours\n';
        const studyTimeRows = data.studyTime.map(st => 
          `"${st.student_name || st.studentName || st.name || ''}",${st.week || st.week_number || 0},${st.year || new Date().getFullYear()},${st.hours || (st.total_minutes ? st.total_minutes / 60 : 0)}`
        ).join('\n');
        const studyTimeCSV = `Study Time Data\n${studyTimeHeader}${studyTimeRows}`;
        
        content = summaryCSV + sessionsCSV + topicsCSV + studyTimeCSV;
        filename = `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        mimeType = 'text/csv';
      }
      
      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Export Analytics Data</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600">
            {studentName 
              ? `Data for ${studentName}, ${dateRange}`
              : `Data for all students, ${dateRange}`}
          </p>
        </div>
        
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="preview">Data Preview</TabsTrigger>
            <TabsTrigger value="export">Export Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-gray-600">Active Students:</div>
                <div className="text-sm font-medium">{data.summary.activeStudents}</div>
                <div className="text-sm text-gray-600">Total Sessions:</div>
                <div className="text-sm font-medium">{data.summary.totalSessions}</div>
                <div className="text-sm text-gray-600">Total Queries:</div>
                <div className="text-sm font-medium">{data.summary.totalQueries}</div>
                <div className="text-sm text-gray-600">Avg Session Minutes:</div>
                <div className="text-sm font-medium">{data.summary.avgSessionMinutes}</div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Sessions ({data.sessions.length})</h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Student</th>
                      <th className="text-left py-1">Date</th>
                      <th className="text-left py-1">Topic</th>
                      <th className="text-right py-1">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.slice(0, 5).map((session) => (
                      <tr key={session.id} className="border-b">
                        <td className="py-1">{session.userName || session.student_name}</td>
                        <td className="py-1">{format(new Date(session.startTime || session.session_date || ''), 'MMM d, yyyy')}</td>
                        <td className="py-1">{session.topicOrContent || session.topic_or_content_used}</td>
                        <td className="py-1 text-right">{session.duration_minutes || Math.floor((session.duration || 0) / 60)} min</td>
                      </tr>
                    ))}
                    {data.sessions.length > 5 && (
                      <tr>
                        <td colSpan={4} className="py-1 text-center text-gray-500">
                          + {data.sessions.length - 5} more sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Top Topics ({data.topics.length})</h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Topic</th>
                      <th className="text-right py-1">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topics.slice(0, 5).map((topic, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1">{topic.topic || topic.name}</td>
                        <td className="py-1 text-right">{topic.count || topic.value}</td>
                      </tr>
                    ))}
                    {data.topics.length > 5 && (
                      <tr>
                        <td colSpan={2} className="py-1 text-center text-gray-500">
                          + {data.topics.length - 5} more topics
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Study Time ({data.studyTime.length})</h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Student</th>
                      <th className="text-left py-1">Week</th>
                      <th className="text-right py-1">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studyTime.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1">{item.student_name || item.studentName || item.name}</td>
                        <td className="py-1">Week {item.week || item.week_number}</td>
                        <td className="py-1 text-right">{item.hours || (item.total_minutes ? (item.total_minutes / 60).toFixed(1) : 0)}</td>
                      </tr>
                    ))}
                    {data.studyTime.length > 5 && (
                      <tr>
                        <td colSpan={3} className="py-1 text-center text-gray-500">
                          + {data.studyTime.length - 5} more entries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="export" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Export Format</h3>
              <div className="flex gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="csv"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    className="mr-2"
                  />
                  <label htmlFor="csv">CSV (Excel compatible)</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="json"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                    className="mr-2"
                  />
                  <label htmlFor="json">JSON (Raw data)</label>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Data to Export</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="exportSummary"
                    checked={true}
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="exportSummary">Summary Data</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="exportSessions"
                    checked={true}
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="exportSessions">Sessions ({data.sessions.length})</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="exportTopics"
                    checked={true}
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="exportTopics">Topics ({data.topics.length})</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="exportStudyTime"
                    checked={true}
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="exportStudyTime">Study Time ({data.studyTime.length})</label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
