
import { DateRange } from "react-day-picker";

// Helper function to make sure we have valid date filters
export const getDateFilterSQL = (dateRange?: DateRange): { startDate: string; endDate: string } => {
  if (!dateRange || !dateRange.from) {
    // Default to last 30 days if no dateRange is provided
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
  
  const startDate = new Date(dateRange.from);
  startDate.setHours(0, 0, 0, 0);
  
  let endDate: Date;
  if (dateRange.to) {
    endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // If only "from" is specified, use that day as both start and end
    endDate = new Date(dateRange.from);
    endDate.setHours(23, 59, 59, 999);
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};
