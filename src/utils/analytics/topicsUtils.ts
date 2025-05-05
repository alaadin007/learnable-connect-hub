
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, TopicData } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";
import { getMockTopicsData } from "./mockDataUtils";

// Fetch topics data
export const fetchTopics = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<TopicData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for topics, using demo data");
      return getMockTopicsData();
    }

    // Get date range filter
    const { dateRange } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Execute the query with proper await
    const { data, error } = await supabase
      .from('session_logs')
      .select('topic_or_content_used')
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate)
      .not('topic_or_content_used', 'is', null);

    if (error) {
      console.error("Error fetching topics:", error);
      return getMockTopicsData();
    }

    // Count topics and format data
    const topicCounts: Record<string, number> = {};
    (data || []).forEach(session => {
      const topic = session.topic_or_content_used || 'General';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    // Format into the expected structure
    const topicsData: TopicData[] = Object.entries(topicCounts)
      .map(([topic, count]) => ({ 
        topic, 
        count, 
        name: topic, // For compatibility with components expecting 'name'
        value: count // For compatibility with components expecting 'value'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Get top 10 topics

    return topicsData;
  } catch (error) {
    console.error("Error in fetchTopics:", error);
    return getMockTopicsData();
  }
};
