
export interface Student {
  id: string;
  name: string;
}

export interface SessionData {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}
