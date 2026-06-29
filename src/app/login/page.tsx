"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TrendingUp, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { login, register } from "@/lib/auth";

type Mode = "login" | "register";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          tax_id: taxId,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <span className="font-display text-xl font-bold tracking-tight text-text-primary block leading-tight">
              Inventory<span className="text-primary">DSS</span>
            </span>
            <span className="text-xs text-text-muted">Soporte de decisiones · Retail</span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary mb-2">
            {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="text-text-secondary mb-8 text-sm">
            {mode === "login"
              ? "Ingresa tus credenciales para acceder a la plataforma."
              : "Registra tu empresa y tu usuario administrador."}
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <>
                <Field label="Nombre completo" value={fullName} onChange={setFullName} />
                <Field label="Nombre de la empresa" value={companyName} onChange={setCompanyName} />
                <Field label="RUC" value={taxId} onChange={setTaxId} />
              </>
            )}
            <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} />
            <Field label="Contraseña" type="password" value={password} onChange={setPassword} />

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 group disabled:opacity-60">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Ingresar al sistema" : "Crear cuenta"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-text-secondary">
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-medium text-primary hover:text-primary-hover"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden bg-[#1B1F3B]">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -top-24 -right-24 w-[26rem] h-[26rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -bottom-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-accent-violet/20 blur-[120px]" />

        <div className="relative z-10 max-w-lg text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Modelo FTGM
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight mb-6">
            Optimización inteligente para tu inventario
          </h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Plataforma web de soporte de decisiones para MYPEs retail. Reduce quiebres de stock,
            optimiza coberturas y genera pronósticos precisos.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-dark rounded-2xl p-5">
              <TrendingUp className="w-6 h-6 mb-3 text-white/90" />
              <p className="text-3xl font-bold mb-1">+32%</p>
              <p className="text-white/60 text-sm">Precisión en forecast</p>
            </div>
            <div className="glass-dark rounded-2xl p-5">
              <ShieldCheck className="w-6 h-6 mb-3 text-white/90" />
              <p className="text-3xl font-bold mb-1">-15%</p>
              <p className="text-white/60 text-sm">Riesgo de stockout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
        required
      />
    </div>
  );
}
