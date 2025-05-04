
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

interface TeacherPerformanceTableProps {
  data: any[];
  isLoading: boolean;
}

export const TeacherPerformanceTable: React.FC<TeacherPerformanceTableProps> = ({
  data,
  isLoading
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Performance</CardTitle>
        <CardDescription>Comparative performance metrics by teacher</CardDescription>
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
                <TableHead>Teacher</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.students}</TableCell>
                  <TableCell>{teacher.avgScore}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {teacher.trend === 'up' ? (
                        <>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Improving
                          </Badge>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </>
                      ) : teacher.trend === 'down' ? (
                        <>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Declining
                          </Badge>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Stable
                          </Badge>
                          <Minus className="h-4 w-4 text-gray-500" />
                        </>
                      )}
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
