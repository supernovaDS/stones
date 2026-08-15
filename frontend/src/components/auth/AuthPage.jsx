import { Cloud, Lock, Mail, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export function AuthPage() {
  const { error, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      toast.error(authError.message || "Google Sign-In failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const validatePassword = (pwd) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return pwd.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (mode === "signup" && !validatePassword(password)) {
      toast.error("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const data = await signUp({ email, password });
        // If signup succeeded but no session yet, email confirmation is required
        if (data?.user && !data.session) {
          setEmailSent(true);
          toast.success("Check your email to verify your account!");
        }
      } else {
        await signIn({ email, password });
      }
    } catch (authError) {
      toast.error(authError.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Email confirmation sent screen ────────────────────────────
  if (emailSent) {
    return (
      <main className="app-shell grid min-h-screen place-items-center p-4">
        <section className="modal-card w-[min(92vw,430px)] p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-black bg-[#2ef2a6] shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#0a6b42] dark:shadow-[3px_3px_0_#000]">
              <CheckCircle size={28} />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-black">Check your email</h2>
          <p className="mb-6 text-sm font-bold text-stone-600 dark:text-[#7a7670]">
            We sent a verification link to <strong className="text-black dark:text-[#c8c3ba]">{email}</strong>.
            <br />Click the link to activate your account, then come back and log in.
          </p>
          <button
            className="nb-button action w-full"
            onClick={() => {
              setEmailSent(false);
              setMode("login");
              setPassword("");
            }}
            type="button"
          >
            Back to Login
          </button>
        </section>
      </main>
    );
  }

  // ── Login / Sign-up form ──────────────────────────────────────
  return (
    <main className="app-shell grid min-h-screen place-items-center p-4">
      <section className="modal-card w-[min(92vw,430px)] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg border-[3px] border-black bg-[#ffdc4a] shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#3d2800] dark:shadow-[3px_3px_0_#000]">
            <Cloud size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Stones</h1>
            <p className="text-sm font-bold text-stone-600 dark:text-[#7a7670]">
              Sign in to sync your workspace.
            </p>
          </div>
        </div>

        <button
          className="nb-button w-full mb-4 flex items-center justify-center gap-3 bg-white hover:bg-stone-50 text-black dark:bg-[#12151a] dark:hover:bg-[#1c222c] dark:text-[#c8c3ba] border-[3px] border-black dark:border-[#1e232a] py-2.5 shadow-[4px_4px_0_#111] dark:shadow-[3px_3px_0_#000] font-black"
          disabled={submitting}
          onClick={handleGoogleSignIn}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <hr className="flex-1 border-stone-300 dark:border-[#1e232a]" />
          <span className="text-xs font-black uppercase text-stone-400 dark:text-[#5a5650]">OR</span>
          <hr className="flex-1 border-stone-300 dark:border-[#1e232a]" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            className={mode === "login" ? "nb-button action" : "nb-button"}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "nb-button action" : "nb-button"}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-black">
            Email
            <span className="nb-input flex items-center gap-2 px-3 py-2">
              <Mail size={16} />
              <input
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent outline-none"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-black">
            Password
            <span className="nb-input flex items-center gap-2 px-3 py-2">
              <Lock size={16} />
              <input
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="min-w-0 flex-1 bg-transparent outline-none"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? <p className="text-sm font-bold text-[#ff5a5f]">{error}</p> : null}

          <button className="nb-button action" disabled={submitting} type="submit">
            {submitting ? "Working..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
