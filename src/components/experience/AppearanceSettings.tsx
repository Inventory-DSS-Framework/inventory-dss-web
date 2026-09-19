"use client";

import Link from "next/link";
import { Check, Crown, Monitor, Moon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { PALETTES, type ModePref } from "@/lib/appearance";
import { useExperience } from "./ExperienceProvider";

const MODES: { id: ModePref; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Oscuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Monitor },
];

/** A tiny rendering of the app in each mode, so the choice is visual rather than a word. */
function MiniApp({ variant }: { variant: ModePref }) {
  const tone = (dark: boolean) => ({
    bg: dark ? "#050707" : "#EEF1EF",
    panel: dark ? "#0A0C0C" : "#F7F8F7",
    card: dark ? "#171B1B" : "#FFFFFF",
    line: dark ? "#252B2A" : "#E3E8E5",
    accent: dark ? "#2DD4A0" : "#0CA884",
  });
  const render = (dark: boolean) => {
    const t = tone(dark);
    return (
      <div className="flex h-full w-full gap-1.5 p-1.5" style={{ background: t.bg }}>
        <div className="flex w-5 flex-col gap-1 pt-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 rounded-full" style={{ background: i === 1 ? t.accent : t.line }} />
          ))}
        </div>
        <div className="flex-1 rounded-md p-1.5" style={{ background: t.panel }}>
          <span className="block h-1.5 w-8 rounded-full" style={{ background: t.line }} />
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="h-5 rounded" style={{ background: t.card, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                <span className="m-1 block h-1 w-3 rounded-full" style={{ background: i === 0 ? t.accent : t.line }} />
              </div>
            ))}
          </div>
          <div className="mt-1 h-4 rounded" style={{ background: t.card, boxShadow: `inset 0 0 0 1px ${t.line}` }} />
        </div>
      </div>
    );
  };
  if (variant === "system") {
    return (
      <div className="relative h-full w-full">
        {render(false)}
        <div className="absolute inset-0" style={{ clipPath: "polygon(55% 0, 100% 0, 100% 100%, 45% 100%)" }}>
          {render(true)}
        </div>
      </div>
    );
  }
  return render(variant === "dark");
}

export function AppearanceSettings() {
  const { modePref, setModePref, palette, setPalette, motion, setMotion, isPremium } = useExperience();

  return (
    <Card className="space-y-8">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-text-primary">Apariencia</h3>
        <p className="mt-1 text-sm text-text-secondary">Personaliza cómo se ve y se siente la plataforma.</p>
      </div>

      {/* Mode */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Modo</p>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => {
            const active = modePref === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModePref(m.id)}
                className={cn(
                  "group rounded-2xl border p-2 text-left transition-all duration-200",
                  active ? "border-primary shadow-[0_0_0_4px_rgb(var(--c-primary)/0.12)]" : "border-border hover:border-text-muted/40",
                )}
              >
                <div className="aspect-[16/10] overflow-hidden rounded-xl">
                  <MiniApp variant={m.id} />
                </div>
                <div className="flex items-center justify-between px-1.5 pb-0.5 pt-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <m.icon className="h-4 w-4 text-text-muted" />
                    {m.label}
                  </span>
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full transition-all",
                      active ? "scale-100 bg-primary text-white" : "scale-75 opacity-0",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Color de marca</p>
          <span className="badge inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
            <Crown className="h-3 w-3" /> Premium
          </span>
        </div>
        <div className="relative">
          <div
            className={cn(
              "grid grid-cols-3 gap-3 sm:grid-cols-6",
              !isPremium && "pointer-events-none select-none opacity-45 blur-[1.5px]",
            )}
          >
            {PALETTES.map((p) => {
              const active = (isPremium ? palette : "emerald") === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200",
                    active ? "border-primary bg-primary-softer" : "border-border hover:-translate-y-0.5 hover:border-text-muted/40",
                  )}
                >
                  <span
                    className="relative grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `conic-gradient(from 210deg, ${p.swatch[0]}, ${p.swatch[1]}, ${p.swatch[0]})`,
                      boxShadow: active ? `0 0 0 3px rgb(var(--c-surface)), 0 0 0 5px ${p.swatch[0]}, 0 8px 22px -6px ${p.swatch[0]}` : undefined,
                    }}
                  >
                    {active && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">{p.label}</span>
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <div className="absolute inset-0 grid place-items-center">
              <Link href="/premium" className="btn btn-primary h-10 gap-2 px-4 text-sm">
                <Crown className="h-4 w-4" />
                Desbloquear colores con Premium
              </Link>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          El plan base usa verde esmeralda. El Motor FTGM siempre se muestra en negro y neón.
        </p>
      </div>

      {/* Motion */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-soft/60 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">Animaciones y efectos</p>
            <p className="mt-0.5 text-xs text-text-secondary">Transiciones, luces que siguen el cursor y fondos animados.</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={motion === "full"}
          onClick={() => setMotion(motion === "full" ? "reduced" : "full")}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
            motion === "full" ? "bg-primary" : "bg-surface-muted ring-1 ring-inset ring-border",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
              motion === "full" ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </Card>
  );
}
