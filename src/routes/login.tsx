import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PasswordStrengthIndicator, getPasswordStrength } from "@/lib/password-strength.tsx";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Purana Bazaar" }] }),
  component: Login,
});

function Login() {
  return <AuthShell mode="login" />;
}

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    if (!isLogin) {
      const { isValid, level } = getPasswordStrength(password);
      if (!isValid || level === "weak") {
        toast.error("Password is too weak. Please use a stronger password.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (!data.user?.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("Please verify your email before logging in.");
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_blocked")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.is_blocked) {
          await supabase.auth.signOut();
          throw new Error("Your account has been blocked. Contact support.");
        }

        toast.success("Signed in successfully");
        navigate({ to: "/dashboard" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
          data: {
            full_name: fullName.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        },
      });
      if (error) throw error;

      if (data.session && data.user?.id) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        });
      }

      // Force verification-first flow even if auth config auto-signs in.
      if (data.session) await supabase.auth.signOut();
      toast.success("Account created. Check your email to verify your account before login.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Enter your email first to resend verification.");
      return;
    }

    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      });
      if (error) throw error;
      toast.success("Verification email sent. Please check inbox/spam.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend verification email.");
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/60 to-primary/90" />
        <div className="relative h-full p-12 flex flex-col text-primary-foreground">
          <Logo />
          <div className="mt-auto max-w-md">
            <h2 className="font-serif text-4xl leading-tight">A marketplace built on trust.</h2>
            <p className="mt-4 text-primary-foreground/70">Join buyers and sellers across Pakistan with verified, secure marketplace features.</p>
            <div className="mt-8 flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-gold" /> Bank-grade encryption · Verified IDs</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12 bg-hero">
        <div className="w-full max-w-md glass rounded-3xl p-8 md:p-10 shadow-elegant">
          <div className="lg:hidden mb-6"><Logo /></div>
          <h1 className="font-serif text-3xl text-primary">{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isLogin ? "Sign in to continue to your marketplace." : "Start buying and selling in 60 seconds."}</p>

          <form className="space-y-4" onSubmit={onSubmit}>
            {!isLogin && (
              <Field
                label="Full name"
                type="text"
                placeholder="Ali Raza"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
            )}
            {!isLogin && (
              <Field
                label="Phone"
                type="tel"
                placeholder="03xx-xxxxxxx"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            {!isLogin && <PasswordStrengthIndicator password={password} showFeedback={true} />}
            {isLogin ? (
              <div className="flex justify-between items-center text-xs">
                <label className="inline-flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="accent-primary" /> Remember me</label>
                <button type="button" onClick={handleResendVerification} disabled={resendingVerification} className="text-primary font-medium disabled:opacity-60">
                  {resendingVerification ? "Sending..." : "Resend verification"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">By signing up you agree to our <a className="text-primary" href="#">Terms</a> and <a className="text-primary" href="#">Privacy</a>.</p>
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              <Mail /> {submitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-center mt-6 text-muted-foreground">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <Link to={isLogin ? "/signup" : "/login"} className="text-primary font-medium">{isLogin ? "Create an account" : "Sign in"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = rest.type === "password";

  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <div className="relative mt-1.5">
        <input
          {...rest}
          type={isPasswordField && showPassword ? "text" : rest.type}
          className={`w-full h-11 rounded-xl bg-card border border-border focus:border-primary outline-none transition text-sm ${isPasswordField ? "pl-4 pr-11" : "px-4"}`}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={rest.disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 w-11 grid place-items-center text-muted-foreground hover:text-primary transition disabled:opacity-60"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}
