import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase, isTestAccount, isTestEntity } from "@/integrations/supabase/client";
import type { User, AuthResponse } from "@supabase/supabase-js";

// Define UserProfile type
interface UserProfile {
  id: string;
  user_type: string;
  full_name: string;
  email: string;
  school_code?: string;
  school_name?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userRole: string | null;
  isLoading: boolean;
  schoolId: string | null;
  isSupervisor: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setTestUser: (accountType: string, index?: number) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<AuthResponse>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardByRole = useCallback((role: string | null) => {
    if (!role) return "/dashboard";
    switch (role) {
      case "school": return "/admin";
      case "teacher": return "/teacher/analytics";
      case "student": return "/dashboard";
      default: return "/dashboard";
    }
  }, []);

  const handleAuthenticatedNavigation = useCallback((role: string | null) => {
    const dashboardRoute = getDashboardByRole(role);
    const fromLocation = location.state?.from || dashboardRoute;
    navigate(fromLocation, { replace: true });
  }, [getDashboardByRole, location.state, navigate]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      if (isTestEntity(userId)) {
        const parts = userId.split("-");
        const testType = parts.length > 1 ? parts[1] : "student";
        const testIndex = parts.length > 2 ? parseInt(parts[2]) : 0;

        const mockTestSchoolId = `test-school-${testIndex}`;
        const mockSchoolName = testIndex > 0 ? `Test School ${testIndex}` : "Test School";
        const mockSchoolCode = `TEST${testIndex}`;

        const mockProfile: UserProfile = {
          id: userId,
          user_type: testType,
          full_name: `Test ${testType.charAt(0).toUpperCase() + testType.slice(1)} User`,
          email: `${testType}.test${testIndex > 0 ? testIndex : ''}@learnable.edu`,
          school_code: mockSchoolCode,
          school_name: mockSchoolName,
          organization: {
            id: mockTestSchoolId,
            name: mockSchoolName,
            code: mockSchoolCode,
          }
        };

        setProfile(mockProfile);
        setUserRole(testType);
        setSchoolId(mockTestSchoolId);
        setIsSupervisor(testType === "school");
        return testType;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      let orgData = null;

      if (profileData.user_type === "school" || profileData.user_type === "teacher") {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("code", profileData.school_code)
          .single();
        orgData = schoolData ?? null;
        if (orgData) setSchoolId(orgData.id);
      } else if (profileData.user_type === "student") {
        const { data: studentData } = await supabase
          .from("students")
          .select("school_id")
          .eq("id", userId)
          .single();

        if (studentData?.school_id) {
          const { data: schoolData } = await supabase
            .from("schools")
            .select("id, name, code")
            .eq("id", studentData.school_id)
            .single();
          orgData = schoolData ?? null;
          if (orgData) setSchoolId(orgData.id);
        }
      }

      if (profileData.user_type === "teacher") {
        const { data: teacherData } = await supabase
          .from("teachers")
          .select("is_supervisor")
          .eq("id", userId)
          .single();

        setIsSupervisor(!!teacherData?.is_supervisor);
      }

      const fullProfile: UserProfile = {
        ...profileData,
        email: user?.email || "",
        organization: orgData,
      };

      setProfile(fullProfile);
      setUserRole(profileData.user_type);

      return profileData.user_type;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      await fetchUserProfile(user.id);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchUserProfile]);

  const setTestUser = useCallback(async (accountType: string, index = 0) => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();

      const mockId = `test-${accountType}-${index}`;
      const mockSchoolId = `test-school-${index}`;
      const mockSchoolName = index > 0 ? `Test School ${index}` : "Test School";
      const mockSchoolCode = `TEST${index}`;
      const mockEmail = `${accountType}.test${index > 0 ? index : ''}@learnable.edu`;

      const mockUser = {
        id: mockId,
        email: mockEmail,
        user_metadata: {
          full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User`,
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
      } as User;

      const mockProfile: UserProfile = {
        id: mockId,
        user_type: accountType,
        full_name: mockUser.user_metadata.full_name,
        email: mockEmail,
        school_code: mockSchoolCode,
        school_name: mockSchoolName,
        organization: {
          id: mockSchoolId,
          name: mockSchoolName,
          code: mockSchoolCode,
        },
      };

      localStorage.setItem("testUser", JSON.stringify(mockUser));
      localStorage.setItem("testUserRole", accountType);
      localStorage.setItem("testUserIndex", index.toString());

      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType);
      setSchoolId(mockSchoolId);
      setIsSupervisor(accountType === "school");

      toast.success(`Logged in as test ${accountType} user`);

      const dashboardRoute = getDashboardByRole(accountType);
      navigate(dashboardRoute, { replace: true });
    } catch (error) {
      toast.error(`Test account setup failed: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, getDashboardByRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (isTestAccount(email)) {
        let accountType = "student";
        if (email.startsWith("school")) accountType = "school";
        else if (email.startsWith("teacher")) accountType = "teacher";

        const emailParts = email.split("@")[0].split(".");
        const index = emailParts.length > 1 && emailParts[1].startsWith("test")
          ? parseInt(emailParts[1].replace("test", "")) ?? 0
          : 0;

        await setTestUser(accountType, index);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from login");

      setUser(data.user);
      const role = await fetchUserProfile(data.user.id);
      handleAuthenticatedNavigation(role);
      toast.success("Logged in successfully");
    } catch (error) {
      toast.error(`Login failed: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setTestUser, fetchUserProfile, handleAuthenticatedNavigation]);

  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    setIsLoading(true);
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData }
      });
      if (response.error) throw response.error;
      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      localStorage.removeItem("testUserIndex");

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSchoolId(null);
      setIsSupervisor(false);

      navigate("/login");
    } catch (error) {
      toast.error(`Logout failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestRole = localStorage.getItem("testUserRole");
        const storedTestIndex = localStorage.getItem("testUserIndex") ?? "0";

        if (storedTestUser && storedTestRole) {
          const testUser = JSON.parse(storedTestUser) as User;
          const testIndex = Number(storedTestIndex);
          const testEmail = testUser.email ?? `${storedTestRole}.test${testIndex}@learnable.edu`;

          const mockProfile: UserProfile = {
            id: testUser.id,
            user_type: storedTestRole,
            email: testEmail,
            full_name: testUser.user_metadata?.full_name ?? "",
            school_code: `TEST${testIndex}`,
            school_name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
            organization: {
              id: `test-school-${testIndex}`,
              name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
              code: `TEST${testIndex}`,
            }
          };

          setUser(testUser);
          setProfile(mockProfile);
          setUserRole(storedTestRole);
          setSchoolId(`test-school-${testIndex}`);
          setIsSupervisor(storedTestRole === "school");

          setIsLoading(false);
        } else {
          setIsLoading(true);
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setUser(data.session.user);
            await fetchUserProfile(data.session.user.id);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else if (event === "SIGNED_OUT" && !localStorage.getItem("testUser")) {
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setSchoolId(null);
        setIsSupervisor(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userRole,
      isLoading,
      schoolId,
      isSuperviser: isSupervisor,
      signIn,
      signOut,
      setTestUser,
      signUp,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};