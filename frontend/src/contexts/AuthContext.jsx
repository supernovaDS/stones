import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearLocalWorkspaceData } from "../db/schema";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

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
      if (data.session?.user?.id) {
        localStorage.setItem("stones-current-user-id", data.session.user.id);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      const currentUserId = localStorage.getItem("stones-current-user-id");

      if (nextUser?.id) {
        if (currentUserId && currentUserId !== nextUser.id) {
          // Account switched: purge previous user's local database completely
          await clearLocalWorkspaceData();
          if (useAppStore.getState().initialize) {
            await useAppStore.getState().initialize({ skipSeed: true });
          }
        }
        localStorage.setItem("stones-current-user-id", nextUser.id);
      } else {
        localStorage.removeItem("stones-current-user-id");
      }

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);
      setError("");

      if ((event === "SIGNED_IN" || nextSession) && (window.location.hash || window.location.search)) {
        if (window.location.hash.includes("access_token") || window.location.hash === "#" || window.location.search.includes("code=")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
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

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
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
    await clearLocalWorkspaceData();
    const { error: authError } = await supabase.auth.signOut();
    if (useAppStore.getState().initialize) {
      await useAppStore.getState().initialize({ skipSeed: false });
    }
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
      signInWithGoogle,
      signOut
    }),
    [error, loading, session, signIn, signInWithGoogle, signOut, signUp, user]
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
