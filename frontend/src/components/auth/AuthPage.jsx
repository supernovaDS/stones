import { Cloud, Lock, Mail, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export function AuthPage() {
  const { error, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("profile-minimal");
    root.classList.add("profile-neo");
  }, []);

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
