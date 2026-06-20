"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@inventorydss.com");
  const [password, setPassword] = useState("password");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("mock-session", "true");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <span className="text-xl font-bold tracking-tight text-text-primary block leading-tight">
              Inventory<span className="text-primary">DSS</span>
            </span>
            <span className="text-xs text-text-muted">Soporte de decisiones · Retail</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">Bienvenido de nuevo</h1>
          <p className="text-text-secondary mb-8 text-sm">
            Ingresa tus credenciales para acceder a la plataforma <span className="font-medium text-text-primary">(Modo Demo)</span>.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-border text-primary focus:ring-primary" />
                Recordarme
              </label>
              <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover">¿Olvidaste tu contraseña?</a>
            </div>
            <button type="submit" className="btn btn-primary w-full py-3 group">
              Ingresar al sistema
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button type="button" onClick={handleLogin} className="btn btn-secondary w-full py-3">
              Continuar en modo demo
            </button>
          </form>
        </div>
      </div>

      {/* Brand side — flat deep indigo with frosted-glass cards */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden bg-[#1B1F3B]">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -top-24 -right-24 w-[26rem] h-[26rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -bottom-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-accent-violet/20 blur-[120px]" />

        <div className="relative z-10 max-w-lg text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Modelo FTGM
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-6">
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
