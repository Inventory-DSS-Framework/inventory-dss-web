"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Clock, Droplets, FileSpreadsheet, Footprints,
  Loader2, MousePointerClick, PackagePlus, PawPrint, Pill, Receipt, Shirt, Smartphone,
  Sparkles, Store, Wrench, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useProfile } from "@/hooks/useProfile";
import { companiesApi, productsApi, salesApi } from "@/lib/api";
import { customFieldsApi, preferencesApi } from "@/lib/apis/custom-fields";
import { ONBOARDING_PREF, completeOnboarding, startGuidedTour } from "@/lib/onboarding";
import { ProductImportWizard } from "@/components/inventory/ProductImportWizard";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { SalesImportWizard } from "@/components/sales/SalesImportWizard";
import { AIJourney } from "@/components/login/AIJourney";
import type { CustomFieldDTO } from "@/types/custom-fields";

type StepId = "intro" | "business" | "inventory" | "sales" | "ia";

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Bienvenida" },
  { id: "business", label: "Tu negocio" },
  { id: "inventory", label: "Tu inventario" },
  { id: "sales", label: "Tus ventas" },
  { id: "ia", label: "Cómo funciona" },
];

/** The retail businesses you actually find in Lima, from Gamarra to la botica de la esquina. */
const LIMA_BUSINESSES: { id: string; label: string; tagline: string; icon: LucideIcon }[] = [
  { id: "bodega", label: "Bodega / Minimarket", tagline: "Abarrotes, bebidas y snacks", icon: Store },
  { id: "ropa", label: "Ropa y moda", tagline: "Polos, jeans, moda de Gamarra", icon: Shirt },
  { id: "calzado", label: "Zapatería", tagline: "Calzado para toda la familia", icon: Footprints },
  { id: "farmacia", label: "Farmacia / Botica", tagline: "Medicinas y cuidado personal", icon: Pill },
  { id: "cosmetica", label: "Perfumería y cosméticos", tagline: "Perfumes, skincare y maquillaje", icon: Droplets },
  { id: "tecnologia", label: "Celulares y tecnología", tagline: "Equipos, accesorios y repuestos", icon: Smartphone },
  { id: "ferreteria", label: "Ferretería", tagline: "Herramientas, gasfitería, eléctricos", icon: Wrench },
  { id: "libreria", label: "Librería y bazar", tagline: "Útiles, regalos y papelería", icon: BookOpen },
  { id: "petshop", label: "Pet shop / Veterinaria", tagline: "Alimento y accesorios de mascotas", icon: PawPrint },
];

const rise = (i: number): React.CSSProperties => ({ animation: `fade-up 0.6s var(--ease-out) ${0.06 + i * 0.07}s both` });

/**
 * Full-screen onboarding for a brand-new account, in 5 short steps:
 * welcome → pick your business → load your inventory → load your sales →
 * how the AI turns those two into predictions. Every step is vertically centered
 * on a light, softly animated stage.
 */
export default function WelcomePage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const { user, company } = useProfile();

  const [step, setStep] = useState<StepId>("intro");
  const [business, setBusiness] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomFieldDTO[]>([]);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [salesCount, setSalesCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);

  const loadFields = useCallback(async () => {
    if (!companyId) return;
    setFields(await customFieldsApi.list(companyId, "product"));
  }, [companyId]);
  const loadProducts = useCallback(async () => {
    if (!companyId) return;
    setProductCount((await productsApi.list(companyId)).length);
  }, [companyId]);
  const loadSales = useCallback(async () => {
    if (!companyId) return;
    setSalesCount((await salesApi.list(companyId, 1, 1, "imported")).length);
  }, [companyId]);

  useEffect(() => {
    loadFields().catch(() => undefined);
    loadProducts().catch(() => undefined);
    loadSales().catch(() => undefined);
  }, [loadFields, loadProducts, loadSales]);

  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (id: StepId) => {
    setError(null);
    setStep(id);
  };
  const back = () => go(STEPS[Math.max(0, idx - 1)].id);

  const finish = (tour: boolean) => {
    completeOnboarding();
    if (companyId) preferencesApi.put(companyId, ONBOARDING_PREF, { completed_at: new Date().toISOString() }).catch(() => undefined);
    if (tour) startGuidedTour();
    router.push("/dashboard");
  };

  const chooseBusiness = (b: (typeof LIMA_BUSINESSES)[number]) => {
    setBusiness(b.id);
    if (companyId) companiesApi.update(companyId, { business_type: b.label }).catch(() => undefined);
    go("inventory");
  };

  const firstName = user?.full_name?.split(" ")[0];

  return (
    <div className="relative h-screen overflow-hidden bg-background text-text-primary">
      {/* Light stage: soft brand blobs + a dotted field, nothing dark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(55% 45% at 85% 0%, rgb(var(--c-primary) / 0.12), transparent 70%)," +
            "radial-gradient(45% 45% at 0% 100%, rgb(var(--c-accent) / 0.12), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgb(var(--c-text) / 0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col overflow-y-auto">
        {/* Header with progress */}
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
            <span className="font-display text-[17px] font-bold tracking-[-0.03em]">
              Inventory<span className="text-primary">DSS</span>
            </span>
            <ol className="hidden flex-1 items-center gap-1.5 md:flex" aria-label="Progreso">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                  <span className="h-1 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-primary transition-all duration-700 [transition-timing-function:var(--ease-out)]"
                      style={{ width: i < idx ? "100%" : i === idx ? "50%" : "0%" }}
                    />
                  </span>
                  <span className={cn("truncate text-[10.5px] font-medium transition-colors", i === idx ? "text-text-primary" : "text-text-muted")}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
            <span className="text-xs text-text-muted md:hidden">{idx + 1} / {STEPS.length}</span>
            <button type="button" onClick={() => finish(false)} className="ml-auto shrink-0 text-sm text-text-muted transition-colors hover:text-text-primary md:ml-0">
              Saltar por ahora
            </button>
          </div>
        </header>

        {/* Each step fills the stage and centers vertically. */}
        <main key={step} className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" style={rise(0)}>
              {error}
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* ── 1 · Bienvenida ────────────────────────────────────── */}
          {step === "intro" && (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary" style={rise(0)}>Bienvenido a InventoryDSS</p>
              <h1 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.04em]" style={rise(1)}>
                Hola{firstName ? `, ${firstName}` : ""}.<br />
                Dejemos <span className="text-gradient-brand">{company?.name ?? "tu negocio"}</span> listo.
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-text-secondary" style={rise(2)}>
                En 4 pasos: nos cuentas de tu negocio, cargas tu inventario, cargas tus ventas
                y te mostramos cómo la IA los convierte en predicciones.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3" style={rise(3)}>
                <button type="button" onClick={() => go("business")} className="btn btn-primary h-12 gap-2 rounded-2xl px-7 text-[15px]">
                  Empezar <ArrowRight className="h-4 w-4" />
                </button>
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="h-3.5 w-3.5" /> Menos de 3 minutos · puedes saltar cualquier paso
                </span>
              </div>
            </div>
          )}

          {/* ── 2 · Tu negocio ────────────────────────────────────── */}
          {step === "business" && (
            <div className="mx-auto w-full max-w-4xl">
              <StepHeading eyebrow="Paso 1 · Tu negocio" title="¿A qué se dedica tu negocio?" text="Elige el rubro que más se parezca al tuyo. Solo lo usamos para adaptar la experiencia." center />
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LIMA_BUSINESSES.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => chooseBusiness(b)}
                    style={rise(Math.min(i, 6) + 1)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-surface p-5 text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg",
                      business === b.id ? "border-primary/50 ring-4 ring-primary/10" : "border-border hover:border-primary/30",
                    )}
                  >
                    <span aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                      <b.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-display text-base font-semibold">{b.label}</p>
                    <p className="text-sm text-text-secondary">{b.tagline}</p>
                    <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
                  </button>
                ))}
              </div>
              <NavRow onBack={back} onNext={() => go("inventory")} nextLabel="Continuar" />
            </div>
          )}

          {/* ── 3 · Carga tu inventario ───────────────────────────── */}
          {step === "inventory" && (
            <div className="mx-auto w-full max-w-2xl">
              <StepHeading eyebrow="Paso 2 · Tu inventario" title="Carga los productos de tu inventario" text="Sube tu Excel tal como lo tienes: solo necesitas nombre, precio y stock. También puedes crearlos a mano o hacerlo después." center />
              {productCount != null && productCount > 0 && (
                <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-xl border border-success/25 bg-success-soft/50 px-4 py-3 text-sm" style={rise(1)}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-success text-white"><Check className="h-4 w-4" /></span>
                  <span><strong>{productCount}</strong> producto(s) ya están en tu inventario.</span>
                </div>
              )}
              <div className="mt-6 space-y-3">
                {[
                  { icon: FileSpreadsheet, t: "Subir mi Excel o CSV", d: "Detectamos las columnas y ves una vista previa editable antes de guardar.", tag: "Recomendado", onClick: () => setImportOpen(true) },
                  { icon: PackagePlus, t: "Crear un producto a mano", d: "Con precio, stock y foto.", onClick: () => setProductOpen(true) },
                  { icon: Clock, t: "Lo haré después", d: "Está siempre en Inventario › Importar mi Excel.", onClick: () => go("sales") },
                ].map((o, i) => (
                  <OptionCard key={o.t} {...o} style={rise(i + 2)} />
                ))}
              </div>
              <NavRow onBack={back} onNext={() => go("sales")} nextLabel="Continuar" />
            </div>
          )}

          {/* ── 4 · Carga tus ventas ──────────────────────────────── */}
          {step === "sales" && (
            <div className="mx-auto w-full max-w-2xl">
              <StepHeading eyebrow="Paso 3 · Tus ventas" title="Carga tus ventas pasadas" text="Si llevabas tus ventas en Excel o en otro sistema, súbelas: son el combustible de las predicciones. No cambian tu stock." center />
              {salesCount != null && salesCount > 0 && (
                <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-xl border border-success/25 bg-success-soft/50 px-4 py-3 text-sm" style={rise(1)}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-success text-white"><Check className="h-4 w-4" /></span>
                  <span>Ya cargaste ventas pasadas. ¡Perfecto!</span>
                </div>
              )}
              <div className="mt-6 space-y-3">
                {[
                  { icon: Receipt, t: "Subir mi Excel de ventas", d: "Una fila por producto vendido, con fecha y cantidad. Mientras más meses, mejor predice la IA.", tag: "Recomendado", onClick: () => setSalesOpen(true) },
                  { icon: Clock, t: "Lo haré después", d: "Está siempre en Ventas › Ventas pasadas (Excel).", onClick: () => go("ia") },
                ].map((o, i) => (
                  <OptionCard key={o.t} {...o} style={rise(i + 2)} />
                ))}
              </div>
              {productCount === 0 && (
                <p className="mt-4 text-center text-xs text-text-muted" style={rise(4)}>
                  Consejo: carga primero tu inventario (paso anterior) para que cada venta encuentre su producto.
                </p>
              )}
              <NavRow onBack={back} onNext={() => go("ia")} nextLabel="Continuar" />
            </div>
          )}

          {/* ── 5 · Cómo funciona (la IA) ─────────────────────────── */}
          {step === "ia" && (
            <div className="mx-auto w-full max-w-5xl">
              <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-violet" style={rise(0)}>
                    <Sparkles className="h-3.5 w-3.5" /> Paso 4 · Cómo funciona
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold leading-tight tracking-[-0.035em]" style={rise(1)}>
                    Obtén predicciones en base a tus ventas, <span className="text-gradient-brand">con IA</span>.
                  </h2>
                  <p className="mt-4 max-w-md text-text-secondary" style={rise(2)}>
                    Con tu inventario y tus ventas cargados, la IA aprende el ritmo de tu negocio y te responde
                    lo que importa: cuánto venderás, qué reponer y qué dejar de comprar.
                  </p>
                  <ul className="mt-6 space-y-2.5" style={rise(3)}>
                    {[
                      "Predice cuánto venderás de cada producto.",
                      "Te dice qué comprar y cuánto, antes de quedarte sin stock.",
                      "Detecta lo que no rota, para no seguir invirtiendo ahí.",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Check className="h-3 w-3" strokeWidth={3} /></span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-3" style={rise(4)}>
                    <button type="button" onClick={() => finish(true)} className="btn btn-primary h-12 gap-2 rounded-2xl px-6 text-[15px]">
                      <MousePointerClick className="h-4 w-4" /> Hacer el recorrido guiado
                    </button>
                    <button type="button" onClick={() => finish(false)} className="btn btn-secondary h-12 gap-2 rounded-2xl px-5 text-[15px]">
                      Ir a mi panel <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div style={rise(2)}>
                  <AIJourney />
                </div>
              </div>
              <div className="mt-8 flex justify-start">
                <button type="button" onClick={back} className="btn btn-ghost h-10 gap-1.5 px-4 text-sm">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ProductImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        companyId={companyId}
        fields={fields}
        onFinished={() => {
          loadProducts().catch(() => undefined);
          loadFields().catch(() => undefined);
        }}
      />
      <ProductFormModal
        open={productOpen}
        onClose={() => setProductOpen(false)}
        companyId={companyId}
        product={null}
        categories={[]}
        fields={fields}
        onSaved={() => loadProducts().catch(() => undefined)}
      />
      <SalesImportWizard
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        companyId={companyId}
        onFinished={() => loadSales().catch(() => undefined)}
      />
    </div>
  );
}

function StepHeading({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary" style={rise(0)}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.035em]" style={rise(1)}>{title}</h2>
      <p className={cn("mt-3 max-w-xl text-text-secondary", center && "mx-auto")} style={rise(2)}>{text}</p>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  t,
  d,
  tag,
  onClick,
  style,
}: {
  icon: LucideIcon;
  t: string;
  d: string;
  tag?: string;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          {t}
          {tag && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">{tag}</span>}
        </span>
        <span className="block text-sm text-text-secondary">{d}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

function NavRow({ onBack, onNext, nextLabel, busy }: { onBack: () => void; onNext?: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3">
      <button type="button" onClick={onBack} disabled={busy} className="btn btn-ghost h-11 gap-1.5 px-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>
      {onNext && (
        <button type="button" onClick={onNext} disabled={busy} className="btn btn-primary h-11 gap-2 rounded-xl px-5 text-sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {nextLabel ?? "Continuar"} {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
