"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, Check, Eye, EyeOff, Hash, Loader2, Lock, Mail, User, type LucideIcon,
} from "lucide-react";
import { getRole, login, logout, register } from "@/lib/auth";
import { markOnboardingPending } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { DotField } from "@/components/login/DotField";
import { AIJourney } from "@/components/login/AIJourney";

type Mode = "login" | "register";

const COPY: Record<Mode, { eyebrow: string; title: string; subtitle: string; cta: string }> = {
  login: {
    eyebrow: "Acceso seguro",
    title: "Bienvenido de nuevo",
    subtitle: "Ingresa tus credenciales para acceder a la plataforma.",
    cta: "Ingresar al sistema",
  },
  register: {
    eyebrow: "Nueva empresa",
    title: "Crea tu cuenta",
    subtitle: "Registra tu empresa y tu usuario administrador.",
    cta: "Crear cuenta",
  },
};

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  const copy = COPY[mode];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        if (!/^\d{11}$/.test(taxId)) {
          setError("El RUC debe tener exactamente 11 dígitos numéricos.");
          setLoading(false);
          return;
        }
        await register({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          tax_id: taxId,
        });
        // The account exists; sign out and let the person log in themselves.
        logout();
        markOnboardingPending();
        setLoading(false);
        setPassword("");
        setMode("login");
        setJustRegistered(true);
        return;
      }
      await login(email, password);
      // Success: a check on the button, then the page settles out quietly into the app.
      setSuccess(true);
      const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.getAttribute("data-motion") === "reduced";
      window.setTimeout(() => setLeaving(true), reduced ? 0 : 420);
      // Sellers (cashiers) land straight on the till; a fresh account starts on the welcome tour.
      const home = getRole() === "seller" ? "/sales/new" : "/dashboard";
      window.setTimeout(() => router.push(home), reduced ? 0 : 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación");
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setJustRegistered(false);
  };

  const detectCaps = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background text-text-primary"
      style={{
        // A tinted ground instead of flat white: soft brand light top-right, mint bottom-left.
        background:
          "radial-gradient(70% 55% at 90% 8%, rgb(var(--c-primary) / 0.12), transparent 62%)," +
          "radial-gradient(60% 55% at 4% 100%, rgb(var(--c-accent-2) / 0.16), transparent 60%)," +
          "linear-gradient(165deg, rgb(var(--c-bg)) 0%, rgb(var(--c-bg-deep)) 100%)",
      }}
    >
      <DotField className="absolute inset-0 z-0 opacity-40" />
      {/* A calm pocket behind the form so the field never fights the inputs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(42% 62% at 19% 55%, rgb(var(--c-bg) / 0.7) 20%, rgb(var(--c-bg) / 0.3) 55%, transparent 80%)",
        }}
      />

      <header
        className={cn(
          "relative z-10 flex items-center justify-between px-6 pt-6 transition-all duration-500 sm:px-10",
          leaving && "opacity-0",
        )}
        style={{ animation: "fade-in 0.8s ease-out both" }}
      >
        <span className="font-display text-lg font-bold tracking-[-0.03em]">
          Inventory<span className="text-primary">DSS</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-text-muted sm:inline">Soporte de decisiones · Retail</span>
          <ModeToggle />
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 mx-auto grid min-h-[calc(100vh-66px)] max-w-[1320px] items-center gap-14 px-6 py-10 transition-all duration-500 [transition-timing-function:var(--ease-out)] sm:px-10 lg:grid-cols-[450px_1fr] lg:gap-20",
          leaving && "-translate-y-3 opacity-0 blur-[6px]",
        )}
      >
        {/* ── Form ─────────────────────────────────────────────── */}
        <section
          className={cn(
            "glass relative rounded-[30px] p-8 shadow-soft-xl transition-transform duration-500 sm:p-10",
            success && "scale-[0.985]",
          )}
          style={{ animation: "rise 0.9s var(--ease-out) both" }}
        >
          <div className="badge inline-flex items-center gap-2 rounded-full bg-primary-softer px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
            {copy.eyebrow}
          </div>

          <h1 key={mode} className="mt-4 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.04em]">
            {copy.title.split(" ").map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="mr-[0.25em] inline-block"
                style={{ animation: `word-in 0.7s var(--ease-out) ${0.08 + i * 0.07}s both` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p key={`${mode}-sub`} className="mt-3 text-[15px] text-text-secondary" style={{ animation: "fade-in 0.6s ease-out 0.25s both" }}>
            {copy.subtitle}
          </p>

          {/* Segmented switch with a gliding pill */}
          <div className="relative mt-7 grid grid-cols-2 rounded-2xl bg-surface-muted/70 p-1">
            <span
              aria-hidden
              className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-xl bg-surface shadow-soft transition-transform duration-500 [transition-timing-function:var(--ease-spring)]"
              style={{ transform: mode === "login" ? "translateX(4px)" : "translateX(calc(100% + 4px))", left: 0 }}
            />
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "relative z-10 h-9 rounded-xl text-sm font-medium transition-colors",
                  mode === m ? "text-text-primary" : "text-text-muted hover:text-text-secondary",
                )}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          {justRegistered && mode === "login" && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success animate-fade-up">
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
              Tu cuenta fue creada. Inicia sesión con tu correo y contraseña.
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger animate-fade-up">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {mode === "register" && (
              <div className="space-y-3.5 animate-fade-up">
                <FloatingField icon={User} label="Nombre completo" value={fullName} onChange={setFullName} autoComplete="name" />
                <FloatingField icon={Building2} label="Nombre de la empresa" value={companyName} onChange={setCompanyName} autoComplete="organization" />
                <FloatingField icon={Hash} label="RUC (11 dígitos)" value={taxId} onChange={(v) => setTaxId(v.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" maxLength={11} />
              </div>
            )}
            {mode === "login" ? (
              <FloatingField icon={User} label="Correo o usuario" value={email} onChange={setEmail} autoComplete="username" />
            ) : (
              <FloatingField icon={Mail} label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
            )}
            <FloatingField
              icon={Lock}
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyUp={detectCaps}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {capsLock && <p className="pl-1 text-xs font-medium text-warning animate-fade-in">Bloq Mayús está activado</p>}
            {mode === "register" && password.length > 0 && <PasswordStrength password={password} />}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "btn btn-primary group mt-2 h-12 w-full gap-2 rounded-2xl text-[15px] disabled:opacity-100",
                success && "bg-success",
              )}
            >
              {success ? (
                <Check className="h-5 w-5 animate-scale-in" strokeWidth={3} />
              ) : loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {copy.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </section>

        {/* ── Story ────────────────────────────────────────────── */}
        <section className="hidden lg:block" style={{ animation: "rise 1s var(--ease-out) 0.15s both" }}>
          <div className="badge inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1 text-[11px] font-semibold text-text-secondary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgb(var(--c-primary))]" />
            ERP + IA que predice tus ventas
          </div>
          <h2 className="mt-5 max-w-[640px] font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.04em]">
            Decide tu inventario <span className="text-gradient-brand">con datos</span>, no con intuición.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-secondary">
            Cargas tu inventario, cargas tus ventas, y la IA te dice qué reponer, cuánto y cuándo.
          </p>
          <AIJourney className="mt-8" compact />
        </section>
      </main>

      {/* Quiet hand-off: the content lifts away and the ground settles to the app's background. */}
      {leaving && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 bg-background"
          style={{ animation: "fade-in 0.45s ease-out 0.15s both" }}
        />
      )}
    </div>
  );
}

function FloatingField({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
  inputMode,
  trailing,
  onKeyUp,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  trailing?: React.ReactNode;
  onKeyUp?: (e: React.KeyboardEvent) => void;
}) {
  const id = useId();
  return (
    <div className="group relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary" />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={onKeyUp}
        placeholder=" "
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        required
        className="peer h-[58px] w-full rounded-2xl border border-border bg-surface/80 pb-2 pl-11 pr-12 pt-6 text-[15px] text-text-primary outline-none transition-all hover:border-text-muted/40 focus:border-primary/60 focus:bg-surface focus:shadow-[0_0_0_4px_rgb(var(--c-primary)/0.12)]"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-text-muted transition-all duration-200 peer-focus:top-[17px] peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-[17px] peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium peer-autofill:top-[17px] peer-autofill:text-[11px]"
      >
        {label}
      </label>
      {trailing && <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

/** Simple strength meter: red / yellow / green from length + character variety. */
function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const level = score <= 2 ? 0 : score <= 3 ? 1 : 2;
  const meta = [
    { label: "Débil", cls: "bg-danger", text: "text-danger" },
    { label: "Aceptable", cls: "bg-warning", text: "text-warning" },
    { label: "Fuerte", cls: "bg-success", text: "text-success" },
  ][level];
  return (
    <div className="space-y-1 pl-1 animate-fade-in">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= level ? meta.cls : "bg-surface-muted")}
          />
        ))}
        <span className={cn("ml-1 text-xs font-semibold", meta.text)}>{meta.label}</span>
      </div>
      {level === 0 && <p className="text-[11px] text-text-muted">Usa 8+ caracteres mezclando mayúsculas, números o símbolos.</p>}
    </div>
  );
}
