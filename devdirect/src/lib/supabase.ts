import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jheqxwukevylsputyfuw.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
  throw new Error("Missing Supabase anon key");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export const signInWithGoogle = async () => {
  try {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "https://jheqxwukevylsputyfuw.supabase.co/auth/v1/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google OAuth error:", error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Sign in with Google failed:", error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }

    localStorage.removeItem("authToken");

    return { error: null };
  } catch (error) {
    console.error("Sign out failed:", error);
    return { error };
  }
};

export const getCurrentSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Get session error:", error);
      return { session: null, error };
    }

    return { session, error: null };
  } catch (error) {
    console.error("Get session failed:", error);
    return { session: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Get user error:", error);
      return { user: null, error };
    }

    return { user, error: null };
  } catch (error) {
    console.error("Get user failed:", error);
    return { user: null, error };
  }
};

export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

export default supabase;
