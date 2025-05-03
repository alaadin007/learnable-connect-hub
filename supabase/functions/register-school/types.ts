
export interface SchoolRegistrationData {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export interface RegistrationResult {
  success: boolean;
  schoolId?: string;
  schoolCode?: string;
  adminUserId?: string;
  emailSent?: boolean;
  emailError?: string | null;
  message?: string;
  error?: string;
  details?: string;
}
