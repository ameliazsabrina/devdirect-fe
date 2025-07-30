"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, getCurrentSession, getCurrentUser } from "@/lib/supabase";
import { setAuthToken, removeAuthToken, authAPI } from "@/lib/api";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const exchangeTokenForBackendJWT = useCallback(
    async (supabaseSession: Session): Promise<boolean> => {
      try {
        const userEmail = supabaseSession.user?.email;
        if (!userEmail) {
          return false;
        }

        const exchangeResponse = await authAPI.exchangeOAuthToken(
          supabaseSession.access_token
        );

        if (
          exchangeResponse.status === "success" &&
          exchangeResponse.data?.token
        ) {
          setAuthToken(exchangeResponse.data.token);
          localStorage.setItem("authToken", exchangeResponse.data.token);
          return true;
        } else {
          if (
            exchangeResponse.message?.includes(
              "OAuth integration not configured"
            ) ||
            exchangeResponse.error?.includes("OAuth token exchange endpoint")
          ) {
            return await handleOAuthFallback(supabaseSession);
          }

          toast.error("Authentication Error", {
            description:
              "Failed to authenticate with backend. Please try logging in again.",
          });
          return false;
        }
      } catch (error) {
        console.error("Token exchange error:", error);
        toast.error("Authentication Error", {
          description: "Failed to complete authentication. Please try again.",
        });
        return false;
      }
    },
    []
  );

  const handleOAuthFallback = useCallback(
    async (supabaseSession: Session): Promise<boolean> => {
      try {
        const userEmail = supabaseSession.user?.email;
        const userName =
          supabaseSession.user?.user_metadata?.full_name ||
          supabaseSession.user?.user_metadata?.name ||
          userEmail?.split("@")[0] ||
          "Google User";

        if (!userEmail) {
          return false;
        }

        try {
          const loginResponse = await authAPI.login({
            email: userEmail,
            password: `google_oauth_${supabaseSession.user.id}`,
          });

          if (loginResponse.status === "success" && loginResponse.data?.token) {
            setAuthToken(loginResponse.data.token);
            localStorage.setItem("authToken", loginResponse.data.token);
            return true;
          }
        } catch (loginError) {
          // Login failed, will try registration
        }

        const registerResponse = await authAPI.register({
          email: userEmail,
          name: userName,
          password: `google_oauth_${supabaseSession.user.id}`,
          confirmPassword: `google_oauth_${supabaseSession.user.id}`,
          role: "applicant",
        });

        if (
          registerResponse.status === "success" &&
          registerResponse.data?.token
        ) {
          setAuthToken(registerResponse.data.token);
          localStorage.setItem("authToken", registerResponse.data.token);

          toast.success("Account created successfully!", {
            description:
              "Welcome to DevDirect! Your Google account has been linked.",
          });

          return true;
        } else {
          if (registerResponse.message?.includes("already exists")) {
            console.log(
              "User exists but login failed. This might be a password mismatch."
            );
          }

          return false;
        }
      } catch (error) {
        console.error("OAuth fallback error:", error);
        return false;
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  }, []);

  // Separate effect for initial session loading
  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        setLoading(true);
        const { session: initialSession } = await getCurrentSession();

        if (!isMounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Handle token exchange in background without blocking
          exchangeTokenForBackendJWT(initialSession)
            .then((success) => {
              if (!isMounted) return;
              if (!success) {
                setSession(null);
                setUser(null);
                removeAuthToken();
              }
            })
            .catch((error) => {
              console.error("Background token exchange failed:", error);
              if (isMounted) {
                setSession(null);
                setUser(null);
                removeAuthToken();
              }
            });
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate effect for auth state changes
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return;

      console.log("Auth state changed:", event, session);

      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_OUT" || !session) {
        console.log("User signed out or session ended - clearing all tokens");
        removeAuthToken();
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("supabase.auth.token");
        }
        return;
      }

      // Handle token exchange in background for auth state changes
      if (session?.access_token && event !== "TOKEN_REFRESHED") {
        exchangeTokenForBackendJWT(session)
          .then((success) => {
            if (!isMounted) return;
            if (!success) {
              setSession(null);
              setUser(null);
              removeAuthToken();
            }
          })
          .catch((error) => {
            console.error(
              "Background auth state token exchange failed:",
              error
            );
            if (isMounted) {
              setSession(null);
              setUser(null);
              removeAuthToken();
            }
          });
      } else if (!session?.access_token) {
        removeAuthToken();
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [exchangeTokenForBackendJWT]); // Only depend on the memoized function

  const value = {
    user,
    session,
    loading,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
