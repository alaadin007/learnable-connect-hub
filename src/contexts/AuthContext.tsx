
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  supabase,
  isTestAccount,
  TEST_SCHOOL_CODE,
  SUPABASE_PUBLIC_URL,
  SUPABASE_PUBLIC_KEY,
} from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Session, AuthError } from "@supabase/supabase-js";

// Define UserRole type
export type UserRole = "school" | "teacher" | "student";

type Organization = {
  id: string;
  name: string;
  code: string;
};

type UserProfile = {
  id: string;
  user_type: UserRole | null;
  full_name: string | null;
  school_code: string | null;
  organization?: Organization | null;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  isLoading: boolean;
  isSupervisor: boolean;
  schoolId: string | null;
  signIn: (
    email: string,
    password?: string
  ) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (type: UserRole, schoolIndex?: number) => Promise<User>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userRole: null,
  loading: true,
  isLoading: true,
  isSupervisor: false,
  schoolId: null,
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  signUp: async () => ({ user: null, session: null, error: null }),
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  setTestUser: async () => Promise.resolve({} as User),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Define setTestUser before it's used in signIn
  const setTestUser = useCallback(
    async (type: UserRole, schoolIndex = 0): Promise<User> => {
      try {
        const testSchoolId = `test-school-${schoolIndex}`;

        const testProfile: UserProfile = {
          id: `test-${type}-${Date.now()}`,
          user_type: type,
          full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          school_code: TEST_SCHOOL_CODE,
          organization:
            type === "school"
              ? {
                  id: testSchoolId,
                  name: `Test School ${schoolIndex}`,
                  code: TEST_SCHOOL_CODE,
                }
              : null,
        };

        setProfile(testProfile);
        setUserRole(type);
        setIsSupervisor(type === "school");
        setSchoolId(testSchoolId);

        const mockUser = {
          id: testProfile.id,
          email: `${type}.test@learnable.edu`,
          user_metadata: {
            full_name: testProfile.full_name,
            user_type: type,
            school_code: TEST_SCHOOL_CODE,
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User;

        setUser(mockUser);

        if (type !== "school") {
          try {
            // Fire and forget test data creation
            setTimeout(() => {
              fetch(`${SUPABASE_PUBLIC_URL}/rest/v1/rpc/populatetestaccountwithsessions`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: SUPABASE_PUBLIC_KEY,
                  Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`,
                },
                body: JSON.stringify({
                  userid: mockUser.id,
                  schoolid: testSchoolId,
                  num_sessions: 5,
                }),
              }).then(() => {
                console.log("Created test sessions data");
              }).catch(error => {
                console.warn("Failed to create test session data:", error);
              });
            }, 100);
          } catch (error) {
            console.warn("Error setting up test data:", error);
          }
        }

        return mockUser;
      } catch (error) {
        console.error("Error setting test user:", error);
        throw error;
      }
    },
    []
  );

  // Fetch user profile
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      try {
        console.log("Fetching profile for user:", userId);
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*, organization:schools(id, name, code)")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);

          // Fallback to user metadata if possible
          if (user && user.user_metadata) {
            const userType = user.user_metadata.user_type || null;
            const fullName = user.user_metadata.full_name || null;
            const schoolCode = user.user_metadata.school_code || null;

            const fallbackProfile: UserProfile = {
              id: userId,
              user_type: userType as UserRole | null,
              full_name: fullName,
              school_code: schoolCode,
              organization: null,
            };

            if (userType) {
              setUserRole(userType as UserRole);
              setIsSupervisor(userType === "school");
            }

            setProfile(fallbackProfile);
            return fallbackProfile;
          }

          return null;
        }

        // Assemble safe profile data
        const safeProfileData: UserProfile = {
          id: profileData.id,
          user_type: profileData.user_type as UserRole | null,
          full_name: profileData.full_name,
          school_code: profileData.school_code,
          organization: null,
        };

        if (profileData.organization && typeof profileData.organization === "object") {
          const orgData = profileData.organization as Record<string, unknown>;
          const orgId = orgData.id ? String(orgData.id) : "";
          const orgName = orgData.name ? String(orgData.name) : "";
          const orgCode = orgData.code ? String(orgData.code) : "";

          if (orgId && orgName && orgCode) {
            safeProfileData.organization = {
              id: orgId,
              name: orgName,
              code: orgCode,
            };
          }
        }

        setProfile(safeProfileData);

        if (profileData.user_type) {
          setUserRole(profileData.user_type as UserRole);
        }

        setIsSupervisor(
          profileData.user_type === "school" &&
            !!safeProfileData.organization?.id
        );

        if (safeProfileData.organization?.id) {
          setSchoolId(safeProfileData.organization.id);
        } else if (profileData.user_type === "school") {
          const { data: schoolData } = await supabase
            .from("schools")
            .select("id")
            .eq("code", safeProfileData.school_code || "")
            .single();

          if (schoolData) {
            setSchoolId(schoolData.id);
          }
        }

        if (user && isTestAccount(user.email || "")) {
          console.log("Test account detected, skipping persistent profile storage");
        }

        return profileData;
      } catch (err) {
        console.error("Error in fetchProfile:", err);

        if (user && user.user_metadata) {
          const fallbackProfile: UserProfile = {
            id: user.id,
            user_type: user.user_metadata.user_type as UserRole | null,
            full_name: user.user_metadata.full_name || null,
            school_code: user.user_metadata.school_code || null,
          };

          setUserRole(fallbackProfile.user_type);
          setIsSupervisor(fallbackProfile.user_type === "school");
          setProfile(fallbackProfile);
          return fallbackProfile;
        }
        return null;
      }
    },
    [user]
  );

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Initialize auth state & listen to auth changes
  useEffect(() => {
    setLoading(true);

    const usingTestAccount = localStorage.getItem("usingTestAccount") === "true";
    const testAccountType = localStorage.getItem("testAccountType") as UserRole | null;

    if (usingTestAccount && testAccountType) {
      // Restore test user synchronously
      try {
        const testSchoolId = `test-school-0`;
        const testProfile: UserProfile = {
          id: `test-${testAccountType}-${Date.now()}`,
          user_type: testAccountType,
          full_name: `Test ${testAccountType.charAt(0).toUpperCase() + testAccountType.slice(1)}`,
          school_code: TEST_SCHOOL_CODE,
          organization:
            testAccountType === "school"
              ? {
                  id: testSchoolId,
                  name: `Test School 0`,
                  code: TEST_SCHOOL_CODE,
                }
              : null,
        };

        setProfile(testProfile);
        setUserRole(testAccountType);
        setIsSupervisor(testAccountType === "school");
        setSchoolId(testSchoolId);

        const mockUser = {
          id: testProfile.id,
          email: `${testAccountType}.test@learnable.edu`,
          user_metadata: {
            full_name: testProfile.full_name,
            user_type: testAccountType,
            school_code: TEST_SCHOOL_CODE,
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User;

        setUser(mockUser);
        console.log(`Test account session restored: ${testAccountType}`);
      } catch (error) {
        console.error("Failed to restore test account session:", error);
        localStorage.removeItem("usingTestAccount");
        localStorage.removeItem("testAccountType");
      } finally {
        setLoading(false);
      }
      return;
    }

    const setSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          try {
            await fetchProfile(session.user.id);
          } catch (profileError) {
            console.error("Profile fetch error during init:", profileError);
            if (session.user.user_metadata) {
              const ut = session.user.user_metadata.user_type;
              if (ut) {
                setUserRole(ut as UserRole);
                setIsSupervisor(ut === "school");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error during session check:", error);
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        try {
          await fetchProfile(session.user.id);
        } catch (profileError) {
          console.error("Profile fetch error on auth change:", profileError);
          if (session.user.user_metadata) {
            const ut = session.user.user_metadata.user_type;
            if (ut) {
              setUserRole(ut as UserRole);
              setIsSupervisor(ut === "school");
            }
          }
        }
      } else {
        if (!usingTestAccount) {
          setUser(null);
          setProfile(null);
          setUserRole(null);
          setIsSupervisor(false);
          setSchoolId(null);
        }
      }
      setLoading(false);
    });

    setSession();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return { user: data?.user || null, session: data?.session || null, error: null };
      } catch (error: any) {
        console.error("SignUp error:", error);
        return { user: null, session: null, error };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password?: string) => {
      if (email.endsWith(".test@learnable.edu")) {
        let type: UserRole = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";

        await supabase.auth.signOut();
        localStorage.removeItem("usingTestAccount");
        localStorage.removeItem("testAccountType");

        await setTestUser(type);

        localStorage.setItem("usingTestAccount", "true");
        localStorage.setItem("testAccountType", type);

        return { data: { user: null, session: null }, error: null };
      }

      try {
        // Special case for a specific email omitted for brevity, implement as needed

        if (!password) {
          const { error } = await supabase.auth.signInWithOtp({ email });
          if (error) throw error;
          return { data: { user: null, session: null }, error: null };
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        // If user metadata missing user_type/school_code, try updating user metadata from profile

        if (data?.user && (!data.user.user_metadata?.user_type || !data.user.user_metadata?.school_code)) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("user_type, school_code, full_name")
              .eq("id", data.user.id)
              .single();

            if (!profileError && profileData) {
              const updatedMetadata = {
                ...data.user.user_metadata,
                user_type: profileData.user_type,
                school_code: profileData.school_code,
                full_name: profileData.full_name || data.user.user_metadata?.full_name,
              };

              await supabase.auth.updateUser({ data: updatedMetadata });

              const updatedUser = {
                ...data.user,
                user_metadata: updatedMetadata,
              };

              return { data: { user: updatedUser, session: data.session }, error: null };
            }
          } catch (profileLookupError) {
            console.warn("Could not fetch profile data during sign-in:", profileLookupError);
          }
        }

        return { data, error: null };
      } catch (error: any) {
        console.error("SignIn error:", error);
        return { data: { user: null, session: null }, error };
      }
    },
    [setTestUser]
  );

  const signOut = useCallback(async () => {
    try {
      const usingTestAccount = localStorage.getItem("usingTestAccount") === "true";

      if (usingTestAccount) {
        localStorage.removeItem("usingTestAccount");
        localStorage.removeItem("testAccountType");
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setIsSupervisor(false);
        setSchoolId(null);
      }

      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("SignOut error:", error);
    }
  }, [navigate]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const contextValue = useMemo(() => ({
    user,
    profile,
    userRole,
    loading,
    isLoading: loading,
    isSupervisor,
    schoolId,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    setTestUser,
  }), [
    user,
    profile,
    userRole,
    loading,
    isSupervisor,
    schoolId,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    setTestUser,
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
