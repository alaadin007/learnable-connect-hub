
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

interface StudentPerformanceTableProps {
  data: any[];
  isLoading: boolean;
}

export const StudentPerformanceTable: React.FC<StudentPerformanceTableProps> = ({
  data,
  isLoading
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance</CardTitle>
        <CardDescription>Individual student performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.teacher}</TableCell>
                  <TableCell>{student.avgScore}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.subjects.map((subject: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {student.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : student.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500" />
                      )}
                      <span className={
                        student.trend === 'up' ? 'text-green-600' :
                        student.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }>
                        {student.trend === 'up' ? 'Improving' :
                         student.trend === 'down' ? 'Declining' : 'Stable'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
