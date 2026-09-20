"use client";

import { ChevronsRight, PackageX, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingCycle, PlanDTO } from "@/types/billing";
import { PremiumOverlay } from "./PremiumOverlay";
import { PlanComparison } from "./PlanComparison";
import { PREMIUM_FEATURES } from "./plan-data";
import { Eyebrow, FitToScreen, SceneRail, Words, d, useSceneSequence } from "./scene-kit";
import type { Origin } from "@/lib/premium-origin";

/**
 * The short way into the plans: the overlay grows out of the button that was pressed,
 * plays two slides that say why this matters, and lands on the prices. Nothing more —
 * the long presentation lives in /forecasting, where the AI actually runs.
 */

const SCENES_MS = [3400, 3800, 600];
const RAIL = ["Por qué", "Qué suma", "Planes"];
const PRICES = 2;

interface Props {
  plans: PlanDTO[];
  cycle: BillingCycle;
  onCycle: (c: BillingCycle) => void;
  onCheckout: () => void;
  onClose: () => void;
  origin?: Origin | null;
  reduced?: boolean;
}

export function PremiumTeaser({ plans, cycle, onCycle, onCheckout, onClose, origin = null, reduced = false }: Props) {
  const { scene, leaving, run, go, replay } = useSceneSequence(SCENES_MS, { enabled: !reduced });

  const skip =
    scene < PRICES ? (
      <button type="button" onClick={() => go(PRICES)} className="btn ps-btn-ghost h-9 gap-1.5 rounded-full px-3.5 text-[13px]">
        Ver precios <ChevronsRight className="h-3.5 w-3.5" />
      </button>
    ) : null;

  const rail = (
    <SceneRail labels={RAIL} durations={SCENES_MS} scene={scene} leaving={leaving} run={run} onGo={reduced ? undefined : go} />
  );

  return (
    <PremiumOverlay label="Plan Premium" onClose={onClose} actions={skip} subheader={rail} origin={reduced ? null : origin} scroll={false}>
      <div key={`${run}-${scene}`} className={cn("h-full", leaving ? "ps-scene-out" : "ps-scene-in")}>
        <FitToScreen>
          {scene === 0 && <SceneWhy />}
          {scene === 1 && <SceneWhat />}
          {scene === PRICES && (
            <PlanComparison
              plans={plans}
              cycle={cycle}
              onCycle={onCycle}
              onCheckout={onCheckout}
              onBack={onClose}
              onReplay={reduced ? undefined : replay}
            />
          )}
        </FitToScreen>
      </div>
    </PremiumOverlay>
  );
}

/* ── 1 · Por qué ───────────────────────────────────────────────────────────── */

const RISKS = [
  { icon: TrendingDown, title: "Comprar de más", desc: "Tu plata se queda dormida en el almacén." },
  { icon: PackageX, title: "Comprar de menos", desc: "El cliente llega, no hay stock y compra en otro lado." },
];

function SceneWhy() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 text-center">
      <Eyebrow>Decidir a ojo</Eyebrow>
      <h2 className="mt-4 font-display text-[clamp(1.9rem,5vw,3.4rem)] font-semibold leading-[1.1] tracking-[-0.035em]">
        <Words text="Equivocarte en la compra" start={0.12} step={0.11} className="block ps-fg-2" />
        <Words text="siempre te cuesta." start={0.85} step={0.15} className="mt-2 block ps-hi" />
      </h2>
      <div className="mx-auto mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {RISKS.map((r, i) => (
          <div key={r.title} className="ps-rise ps-glass rounded-2xl p-5 text-left" style={d(1.4 + i * 0.16)}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <r.icon className="h-[18px] w-[18px] ps-hi" />
            </div>
            <p className="font-display text-[15px] font-semibold ps-fg">{r.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed ps-fg-2">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 2 · Qué suma ──────────────────────────────────────────────────────────── */

function SceneWhat() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col justify-center px-6">
      <div className="text-center">
        <Eyebrow>Con Premium</Eyebrow>
        <h2 className="mt-4 font-display text-[clamp(1.7rem,4.4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.035em]">
          <Words text="La IA deja de tener límite" start={0.12} step={0.1} className="block ps-fg-2" />
          <Words text="y pasa a todo tu catálogo." start={0.8} step={0.13} className="mt-2 block ps-hi" />
        </h2>
      </div>
      <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PREMIUM_FEATURES.map((f, i) => (
          <div key={f.title} className="ps-rise ps-glass rounded-2xl p-4" style={d(1.3 + i * 0.1)}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <f.icon className="h-[18px] w-[18px] ps-hi" />
            </div>
            <p className="font-display text-[15px] font-semibold ps-fg">{f.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed ps-fg-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
