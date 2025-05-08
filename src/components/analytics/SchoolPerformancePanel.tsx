import React from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export interface SchoolPerformancePanelProps {
  schoolId: string;
  dateRange: DateRange;
}

const SchoolPerformancePanel: React.FC<SchoolPerformancePanelProps> = ({
  schoolId,
  dateRange
}) => {
  // Mock data for demonstration
  const completionRate = 75;
  const averageScore = 82;
  const studentParticipation = 90;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>School Performance</CardTitle>
        <CardDescription>Overall metrics for the school</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Completion Rate</h3>
          <Progress value={completionRate} />
          <p className="text-xs text-muted-foreground">{completionRate}% of assessments completed</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Average Score</h3>
          <Progress value={averageScore} />
          <p className="text-xs text-muted-foreground">Average score across all assessments</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Student Participation</h3>
          <Progress value={studentParticipation} />
          <p className="text-xs text-muted-foreground">{studentParticipation}% of students actively participating</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolPerformancePanel;
