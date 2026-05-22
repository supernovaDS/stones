import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setError("");
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    setError("");
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      throw authError;
    }

    // Supabase returns a fake user with no session when the email is
    // already registered (to prevent user enumeration). Detect this:
    // - If there's a user but no session, and the user has no identities,
    //   or identities is an empty array, the email is already taken.
    if (
      data?.user &&
      !data.session &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      const msg = "An account with this email already exists. Please log in instead.";
      setError(msg);
      throw new Error(msg);
    }

    return data;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) {
      setError(authError.message);
      throw authError;
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError("");
    const { error: authError } = await supabase.auth.signOut();
    if (authError) {
      setError(authError.message);
      throw authError;
    }
  }, []);

  const value = useMemo(
    () => ({
      authEnabled: hasSupabaseConfig,
      session,
      user,
      loading,
      error,
      signUp,
      signIn,
      signOut
    }),
    [error, loading, session, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
