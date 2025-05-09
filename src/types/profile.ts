
export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  organization?: {
    id: string;
    name?: string;
    code?: string;  // Adding code property that's being referenced
  };
  organization_id?: string;
  user_type?: string;
  is_supervisor?: boolean;
  email?: string;
  created_at?: string;
  updated_at?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_active?: boolean;
}
