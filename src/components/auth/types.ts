
export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  school_name: string | null;
  school_code: string | null;
  user_type: string;
  organization?: {
    id: any;
    name: string;
    code: string;
  };
}

export interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
}
