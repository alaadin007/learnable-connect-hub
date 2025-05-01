
export interface StudyTimeData {
  name: string;
  hours: number;
}

export interface TopicData {
  name: string;
  value: number;
}

export interface SessionData {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}

export interface StatsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface Student {
  id: string;
  name: string;
}
