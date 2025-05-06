
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, SchoolPerformanceData, SchoolPerformanceSummary } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";

// Fetch school performance data
export const fetchSchoolPerformance = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<{
  monthlyData: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary;
}> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for school performance, using demo data");
      return getMockSchoolPerformanceData();
    }

    // Get date range filter
    const { dateRange } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Get summary performance metrics
    const { data: summaryData, error: summaryError } = await supabase
      .rpc("get_school_performance_metrics", {
        p_school_id: schoolId,
        p_start_date: dateFilter.startDate,
        p_end_date: dateFilter.endDate
      });

    if (summaryError || !summaryData || summaryData.length === 0) {
      console.error("Error fetching school performance summary:", summaryError);
      return getMockSchoolPerformanceData();
    }

    // Get improvement metrics over time
    const { data: monthlyData, error: monthlyError } = await supabase
      .rpc("get_school_improvement_metrics", {
        p_school_id: schoolId,
        p_months_to_include: 6
      });

    if (monthlyError) {
      console.error("Error fetching school performance trends:", monthlyError);
      return getMockSchoolPerformanceData();
    }

    // Format the summary data
    const summary: SchoolPerformanceSummary = {
      averageScore: summaryData[0].avg_score || 0,
      completionRate: summaryData[0].completion_rate || 0,
      participationRate: summaryData[0].student_participation_rate || 0,
      trend: "up", // Would be calculated from historical data
      changePercentage: 0, // Would be calculated from historical data
      total_assessments: summaryData[0].total_assessments || 0,
      students_with_submissions: summaryData[0].students_with_submissions || 0,
      total_students: summaryData[0].total_students || 0,
      avg_submissions_per_assessment: summaryData[0].avg_submissions_per_assessment || 0,
      avg_score: summaryData[0].avg_score || 0,
      completion_rate: summaryData[0].completion_rate || 0,
      student_participation_rate: summaryData[0].student_participation_rate || 0
    };

    // If we have monthly data, calculate the trend
    if (monthlyData && monthlyData.length >= 2) {
      const latestMonth = monthlyData[monthlyData.length - 1];
      const previousMonth = monthlyData[monthlyData.length - 2];
      
      summary.trend = latestMonth.avg_monthly_score > previousMonth.avg_monthly_score ? "up" : "down";
      summary.changePercentage = latestMonth.score_improvement_rate || 0;
    }

    // Format monthly data
    const formattedMonthlyData: SchoolPerformanceData[] = (monthlyData || []).map(item => ({
      month: new Date(item.month).toLocaleString('default', { month: 'short' }),
      score: item.avg_monthly_score || 0,
      avg_monthly_score: item.avg_monthly_score || 0,
      monthly_completion_rate: item.monthly_completion_rate || 0,
      score_improvement_rate: item.score_improvement_rate || 0,
      completion_improvement_rate: item.completion_improvement_rate || 0
    }));

    return {
      monthlyData: formattedMonthlyData,
      summary
    };
  } catch (error) {
    console.error("Error in fetchSchoolPerformance:", error);
    return getMockSchoolPerformanceData();
  }
};

// Helper function for mock school performance data
function getMockSchoolPerformanceData(): {
  monthlyData: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary;
} {
  const monthlyData: SchoolPerformanceData[] = [
    { month: 'Jan', score: 78, avg_monthly_score: 78, monthly_completion_rate: 75, score_improvement_rate: 0, completion_improvement_rate: 0 },
    { month: 'Feb', score: 82, avg_monthly_score: 82, monthly_completion_rate: 78, score_improvement_rate: 5.1, completion_improvement_rate: 4.0 },
    { month: 'Mar', score: 85, avg_monthly_score: 85, monthly_completion_rate: 82, score_improvement_rate: 3.7, completion_improvement_rate: 5.1 },
    { month: 'Apr', score: 83, avg_monthly_score: 83, monthly_completion_rate: 80, score_improvement_rate: -2.4, completion_improvement_rate: -2.4 },
    { month: 'May', score: 87, avg_monthly_score: 87, monthly_completion_rate: 84, score_improvement_rate: 4.8, completion_improvement_rate: 5.0 },
    { month: 'Jun', score: 89, avg_monthly_score: 89, monthly_completion_rate: 86, score_improvement_rate: 2.3, completion_improvement_rate: 2.4 }
  ];

  const summary: SchoolPerformanceSummary = {
    averageScore: 84,
    completionRate: 81,
    participationRate: 92,
    trend: "up",
    changePercentage: 2.3,
    total_assessments: 45,
    students_with_submissions: 120,
    total_students: 130,
    avg_submissions_per_assessment: 2.7,
    avg_score: 84,
    completion_rate: 81,
    student_participation_rate: 92
  };

  return {
    monthlyData,
    summary
  };
}
