"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, getCurrentSession } from "@/lib/supabase";
import { getStoredAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Add method to manually set auth state for custom backend login
  setCustomAuth: (token: string, user?: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  signOut: async () => {},
  setCustomAuth: () => {},
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
  const [loading] = useState(false); // Never block the UI
  const customAuthActive = useRef(false); // Track if using custom backend auth

  // Check for existing backend token on mount
  useEffect(() => {
    console.log("🔐 AuthProvider: Checking for existing backend token");

    const existingToken = getStoredAuthToken();
    if (existingToken) {
      console.log("🔐 Found existing backend token, setting custom auth state");
      customAuthActive.current = true;
      // Create a minimal user object for backend auth
      setUser({
        id: "backend-user",
        email: "backend-authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {},
      } as User);
      setSession({
        access_token: existingToken,
        refresh_token: "",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "backend-user",
          email: "backend-authenticated",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
        } as User,
      } as Session);
      return; // Don't initialize Supabase auth if backend auth is active
    }

    console.log("🔐 AuthProvider: Starting Supabase auth initialization");

    // Get initial session in background
    getCurrentSession()
      .then(({ session: initialSession }) => {
        console.log(
          "🔐 Initial Supabase session check:",
          initialSession ? "Found" : "None"
        );
        if (initialSession && !customAuthActive.current) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      })
      .catch((error) => {
        console.error("🔐 Initial session error:", error);
      });

    // Listen for Supabase auth changes in background (only if not using custom auth)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "🔐 Supabase auth state changed:",
        event,
        session ? "Session active" : "No session"
      );

      // Ignore Supabase auth changes if custom backend auth is active
      if (customAuthActive.current) {
        console.log(
          "🔐 Ignoring Supabase auth change - custom backend auth is active"
        );
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  // Method to manually set auth state for custom backend login
  const setCustomAuth = (token: string, customUser?: any) => {
    console.log("🔐 Setting custom backend auth state");
    customAuthActive.current = true;

    const authUser = customUser || {
      id: "backend-user",
      email: "backend-authenticated",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {},
    };

    setUser(authUser as User);
    setSession({
      access_token: token,
      refresh_token: "",
      expires_in: 3600,
      token_type: "bearer",
      user: authUser as User,
    } as Session);
  };

  const handleSignOut = async () => {
    console.log("🔐 Sign out called");
    try {
      if (customAuthActive.current) {
        // Custom backend sign out
        console.log("🔐 Signing out from custom backend");
        customAuthActive.current = false;
        localStorage.removeItem("authToken");
        localStorage.removeItem("auth_token");
      } else {
        // Supabase sign out
        console.log("🔐 Signing out from Supabase");
        await supabase.auth.signOut();
      }

      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("🔐 Sign out error:", error);
      // Still clear local state even if API fails
      customAuthActive.current = false;
      setUser(null);
      setSession(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut: handleSignOut,
    setCustomAuth,
  };

  console.log("🔐 AuthProvider rendering with state:", {
    hasUser: !!user,
    hasSession: !!session,
    loading,
    customAuth: customAuthActive.current,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
