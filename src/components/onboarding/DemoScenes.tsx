"use client";

import { Check, CheckCircle2, FileSpreadsheet, Loader2, Lock, QrCode, Sparkles, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Box, Cursor, MockWindow, easeOut, navCenter, pressed, seg, track,
} from "./demo-kit";

const NEON = "52 211 153";
const VIOLET = "167 139 250";
const PINK = "244 114 182";

const money = (v: number) => `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ═══ 1. Map of the app ═══════════════════════════════════════════════════════
const MAP_STOPS = [
  { href: "/sales/new", from: 0.1, to: 0.3, title: "Nueva venta", body: "Cobra con efectivo, tarjeta, Yape o Plin y emite boleta o factura." },
  { href: "/purchases/new", from: 0.34, to: 0.52, title: "Nueva compra", body: "Registra lo que compras: sube tu stock y actualiza tu costo." },
  { href: "/inventory", from: 0.56, to: 0.74, title: "Inventario", body: "Stock en vivo, columnas por tipo de producto e importación Excel." },
  { href: "/forecasting", from: 0.78, to: 0.96, title: "Motor FTGM", body: "Predice cuánto venderás y te dice qué comprar y cuándo." },
];

export function MapScene({ t }: { t: number }) {
  const cur = track(t, [
    [0, 640, 400],
    [0.1, 84, navCenter("/sales/new").y],
    [0.3, 84, navCenter("/sales/new").y],
    [0.34, 84, navCenter("/purchases/new").y],
    [0.52, 84, navCenter("/purchases/new").y],
    [0.56, 84, navCenter("/inventory").y],
    [0.74, 84, navCenter("/inventory").y],
    [0.78, 84, navCenter("/forecasting").y],
    [0.96, 84, navCenter("/forecasting").y],
    [1, 360, 320],
  ]);
  const stop = MAP_STOPS.find((s) => t >= s.from && t < s.to);
  const grow = easeOut(seg(t, 0, 0.35));
  const bars = [38, 52, 44, 61, 58, 72, 66, 80, 74, 88, 83, 96];

  return (
    <>
      <MockWindow path="/dashboard" crumb="Inicio › Panel" active="/dashboard" highlight={stop?.href}>
        <div className="absolute left-4 top-3 text-[15px] font-semibold tracking-tight">Tu panel</div>
        <div className="absolute left-4 top-8 text-[10px] text-text-muted">Resumen de hoy</div>
        {[
          { l: "Ventas de hoy", v: money(1284 * grow) },
          { l: "Tickets", v: String(Math.round(37 * grow)) },
          { l: "Stock crítico", v: String(Math.round(4 * grow)) },
          { l: "Margen", v: `${(31.4 * grow).toFixed(1)}%` },
        ].map((k, i) => (
          <Box key={k.l} className="px-3 py-2" style={{ left: 16 + i * 150, top: 54, width: 140, height: 58 }}>
            <p className="text-[9.5px] text-text-muted">{k.l}</p>
            <p className="mt-1 font-display text-[16px] font-semibold tabular-nums text-text-primary">{k.v}</p>
          </Box>
        ))}
        <Box className="px-3 py-2" style={{ left: 16, top: 124, width: 390, height: 190 }}>
          <p className="text-[10.5px] font-semibold text-text-primary">Ventas por mes</p>
          <div className="absolute bottom-3 left-3 right-3 flex h-[130px] items-end gap-2">
            {bars.map((b, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-[4px]"
                style={{ height: `${b * easeOut(seg(t, 0.02 + i * 0.02, 0.2 + i * 0.02))}%`, background: i === bars.length - 1 ? "rgb(var(--c-primary))" : "rgb(var(--c-primary) / 0.3)" }}
              />
            ))}
          </div>
        </Box>
        <Box className="px-3 py-2" style={{ left: 416, top: 124, width: 200, height: 190 }}>
          <p className="text-[10.5px] font-semibold text-text-primary">Primeros pasos</p>
          {["Catálogo cargado", "Primera venta", "Primer pronóstico"].map((s, i) => {
            const done = t > 0.3 + i * 0.25;
            return (
              <div key={s} className="mt-3 flex items-center gap-2 text-[10.5px]">
                <span className={cn("grid h-4 w-4 place-items-center rounded-full transition-colors duration-300", done ? "bg-success text-white" : "bg-surface-muted")}>
                  {done && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className={done ? "text-text-secondary line-through" : "text-text-primary"}>{s}</span>
              </div>
            );
          })}
        </Box>
        <Box className="px-3 py-2" style={{ left: 16, top: 326, width: 600, height: 96 }}>
          <p className="text-[10.5px] font-semibold text-text-primary">Productos por reponer</p>
          {["Arena gato 10 kg", "Alimento perro 15 kg", "Snack dental"].map((p, i) => (
            <div key={p} className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-text-secondary">{p}</span>
              <span className="h-1.5 rounded-full bg-warning/60" style={{ width: `${(30 + i * 18) * grow}%` }} />
            </div>
          ))}
        </Box>
      </MockWindow>

      {stop && (
        <div
          key={stop.href}
          className="absolute z-40 w-[230px] rounded-xl border border-primary/25 bg-surface p-3 shadow-soft-lg"
          style={{ left: 176, top: navCenter(stop.href).y - 22, animation: "fade-up 0.35s var(--ease-out) both" }}
        >
          <span className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-primary/25 bg-surface" />
          <p className="text-[12px] font-semibold text-text-primary">{stop.title}</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-text-secondary">{stop.body}</p>
        </div>
      )}
      <Cursor x={cur.x} y={cur.y} down={pressed(t, [0.11, 0.35, 0.57, 0.79])} />
    </>
  );
}

// ═══ 2. Import an Excel ══════════════════════════════════════════════════════
const IMPORT_COLS = [
  { h: "#", w: 20 },
  { h: "Código", w: 70 },
  { h: "Producto", w: 150 },
  { h: "Categoría", w: 90 },
  { h: "Precio", w: 62 },
  { h: "Stock", w: 50 },
  { h: "Talla", w: 70, isNew: true },
];
const IMPORT_ROWS = [
  ["PH-001", "Alimento perro 15 kg", "Mascotas", "239.90", "12", ""],
  ["RP-014", "Polo algodón", "Ropa", "39.90", "48", "M"],
  ["RP-015", "Polo cuello V", "Ropa", "12,5x", "30", "L"],
  ["EL-002", "Foco LED 9W", "Electro", "8.50", "120", ""],
  ["AB-120", "Arroz 5 kg", "Abarrotes", "24.90", "64", ""],
  ["RP-021", "Jean clásico", "Ropa", "89.00", "22", "32"],
];
const GRID_X = 236;
const GRID_Y = 190;
const ROW_H = 28;
const HEAD_H = 32;

export function ImportScene({ t }: { t: number }) {
  const cellX = GRID_X + 20 + 70 + 150 + 90 + 31;
  const cellY = GRID_Y + HEAD_H + 2 * ROW_H + 14;
  const btn = { x: 684, y: 452 };
  const cur = track(t, [
    [0, 770, 480],
    [0.2, 650, 440],
    [0.5, 650, 430],
    [0.6, cellX, cellY],
    [0.78, cellX, cellY],
    [0.85, btn.x, btn.y],
    [1, btn.x, btn.y],
  ]);

  const fileP = easeOut(seg(t, 0.02, 0.18));
  const file = { x: 790 + (440 - 790) * fileP, y: 470 + (250 - 470) * fileP };
  const reading = t >= 0.2 && t < 0.32;
  const showGrid = t >= 0.32;
  const typing = seg(t, 0.64, 0.74);
  const fixed = t >= 0.74;
  const editing = t >= 0.62 && t < 0.76;
  const done = t >= 0.88;

  return (
    <>
      <MockWindow path="/inventory" crumb="Inventario › Inventario" active="/inventory">
        <div className="absolute left-4 top-3 text-[15px] font-semibold">Inventario</div>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="absolute left-4 right-4 h-6 rounded-md bg-surface-soft" style={{ top: 40 + i * 32, opacity: 0.6 }} />
        ))}
      </MockWindow>
      <div className="absolute inset-0 bg-[rgb(var(--shadow-color)/0.28)]" style={{ opacity: seg(t, 0, 0.05) }} />

      {/* Modal */}
      <Box className="overflow-hidden rounded-2xl" style={{ left: 212, top: 74, width: 560, height: 410, opacity: seg(t, 0, 0.05) }}>
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
          <p className="text-[14px] font-semibold text-text-primary">Importar inventario</p>
          <div className="flex items-center gap-1.5 text-[9.5px] text-text-muted">
            {["Archivo", "Vista previa y ajustes", "Resultado"].map((s, i) => {
              const cur2 = i === (done ? 2 : showGrid ? 1 : 0);
              const past = i < (done ? 2 : showGrid ? 1 : 0);
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold", past ? "bg-primary text-on-primary" : cur2 ? "bg-primary-soft text-primary" : "bg-surface-muted")}>
                    {past ? <Check className="h-2.5 w-2.5" /> : i + 1}
                  </span>
                  <span className={cur2 ? "text-text-primary" : ""}>{s}</span>
                </span>
              );
            })}
          </div>
        </div>
      </Box>

      {!showGrid && (
        <div
          className="absolute grid place-items-center rounded-2xl border-2 border-dashed text-center transition-colors duration-300"
          style={{
            left: GRID_X,
            top: 132,
            width: 512,
            height: 270,
            borderColor: t > 0.14 ? "rgb(var(--c-primary))" : "rgb(var(--c-border))",
            background: t > 0.14 ? "rgb(var(--c-primary-softer))" : "rgb(var(--c-surface-soft))",
          }}
        >
          <div>
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              {reading ? <Loader2 className="h-5 w-5" style={{ transform: `rotate(${t * 2400}deg)` }} /> : <UploadCloud className="h-5 w-5" />}
            </div>
            <p className="mt-2.5 text-[12.5px] font-semibold text-text-primary">{reading ? "Leyendo inventario.xlsx…" : "Arrastra tu Excel o CSV aquí"}</p>
            <p className="mt-0.5 text-[10px] text-text-muted">Da igual el orden o el nombre de tus columnas</p>
          </div>
        </div>
      )}

      {t < 0.22 && (
        <div
          className="absolute z-30 flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-soft-lg"
          style={{ left: file.x, top: file.y, transform: `rotate(${(1 - fileP) * 8}deg) scale(${1 - seg(t, 0.17, 0.21) * 0.4})`, opacity: 1 - seg(t, 0.18, 0.22) }}
        >
          <FileSpreadsheet className="h-4 w-4 text-success" />
          <span className="text-[10.5px] font-semibold text-text-primary">inventario.xlsx</span>
        </div>
      )}

      {showGrid && (
        <>
          <div className="absolute flex items-center gap-1.5" style={{ left: GRID_X, top: 132, opacity: seg(t, 0.32, 0.38) }}>
            <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-[3px] text-[9.5px] font-semibold">
              <CheckCircle2 className="h-3 w-3 text-success" /> Listas <span className="tabular-nums text-success">{fixed ? 124 : 123}</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-[3px] text-[9.5px] font-semibold">
              Con errores <span className={cn("tabular-nums", fixed ? "text-text-muted" : "text-danger")}>{fixed ? 0 : 1}</span>
            </span>
            <span className="rounded-full border border-accent-violet/25 bg-accent-violet-soft px-2 py-[3px] text-[9.5px] font-semibold text-accent-violet">1 columna nueva</span>
          </div>
          <div className="absolute overflow-hidden rounded-xl border border-border" style={{ left: GRID_X, top: GRID_Y - 30, width: 512, height: HEAD_H + ROW_H * 6 + 30 }}>
            <p className="flex h-[30px] items-center px-2.5 text-[9.5px] text-text-muted">Haz clic en una celda para editarla</p>
          </div>
          {/* Header */}
          <div className="absolute flex" style={{ left: GRID_X, top: GRID_Y, height: HEAD_H }}>
            {IMPORT_COLS.map((c, i) => {
              const badgeP = seg(t, 0.34 + i * 0.025, 0.4 + i * 0.025);
              return (
                <div
                  key={c.h}
                  className={cn("flex flex-col justify-center border-b border-r border-border px-1.5", c.isNew ? "bg-accent-violet-soft/70" : "bg-surface-soft")}
                  style={{ width: c.w }}
                >
                  <span className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-text-muted">{c.h}</span>
                  {i > 0 && (
                    <span
                      className={cn("mt-0.5 w-fit rounded-full px-1 text-[7.5px] font-bold", c.isNew ? "bg-accent-violet text-white" : "bg-success-soft text-success")}
                      style={{ opacity: badgeP, transform: `scale(${0.6 + badgeP * 0.4})`, transformOrigin: "left" }}
                    >
                      {c.isNew ? "Nueva · Ropa" : "Detectado"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Rows */}
          {IMPORT_ROWS.map((row, r) => (
            <div key={r} className="absolute flex bg-surface" style={{ left: GRID_X, top: GRID_Y + HEAD_H + r * ROW_H, height: ROW_H, opacity: seg(t, 0.36 + r * 0.02, 0.42 + r * 0.02) }}>
              <div className="grid place-items-center border-b border-r border-border-soft text-[9px] text-text-muted" style={{ width: 20 }}>
                {r === 2 && !fixed ? <span className="h-1.5 w-1.5 rounded-full bg-danger" /> : r + 1}
              </div>
              {row.map((v, c) => {
                const col = IMPORT_COLS[c + 1];
                const isErr = r === 2 && c === 3;
                const notApplicable = c === 5 && row[2] !== "Ropa";
                let value: React.ReactNode = v;
                if (isErr) value = editing ? "12.50".slice(0, Math.ceil(typing * 5)) : fixed ? "12.50" : v;
                if (notApplicable) value = <span className="text-text-muted/40">·</span>;
                return (
                  <div
                    key={c}
                    className={cn(
                      "flex items-center truncate border-b border-r border-border-soft px-1.5 text-[10px]",
                      isErr && !fixed && !editing && "bg-danger-soft/60 font-semibold text-danger",
                      isErr && fixed && "bg-primary-softer",
                      col.isNew && !notApplicable && "text-accent-violet",
                    )}
                    style={{ width: col.w, boxShadow: isErr && editing ? "inset 0 0 0 2px rgb(var(--c-primary))" : undefined }}
                  >
                    {value}
                    {isErr && editing && <span className="ml-px h-3 w-px bg-text-primary" style={{ opacity: Math.round(t * 60) % 2 }} />}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Import button */}
          <div
            className="absolute grid place-items-center rounded-lg text-[10.5px] font-semibold text-on-primary transition-transform"
            style={{ left: 604, top: 438, width: 160, height: 28, background: "rgb(var(--c-primary))", transform: pressed(t, [0.85]) ? "scale(0.96)" : "scale(1)" }}
          >
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Importar {fixed ? 124 : 123} productos</span>
          </div>
        </>
      )}

      {done && (
        <div className="absolute z-40 grid place-items-center rounded-2xl bg-surface" style={{ left: 213, top: 118, width: 558, height: 365, opacity: seg(t, 0.88, 0.92) }}>
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success" style={{ transform: `scale(${0.6 + easeOut(seg(t, 0.88, 0.95)) * 0.4})` }}>
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-3 font-display text-[17px] font-semibold text-text-primary">124 productos importados</p>
            <p className="mt-1 text-[11px] text-text-secondary">Se creó la columna “Talla” solo para productos de Ropa</p>
          </div>
        </div>
      )}
      <Cursor x={cur.x} y={cur.y} down={pressed(t, [0.62, 0.85])} />
    </>
  );
}

// ═══ 3. Sell at the till ═════════════════════════════════════════════════════
const POS_PRODUCTS = [
  { name: "Arena gato 10 kg", price: 45.9, hue: "var(--c-primary)" },
  { name: "Snack dental", price: 12.9, hue: "var(--c-accent)" },
  { name: "Shampoo 500 ml", price: 28.5, hue: "var(--c-warning)" },
];
const PAY = ["Efectivo", "Tarjeta", "Yape", "Plin", "Transf."];

export function SaleScene({ t }: { t: number }) {
  const cards = [255, 383, 511];
  const cur = track(t, [
    [0, 520, 440],
    [0.1, cards[0], 190],
    [0.17, cards[0], 190],
    [0.23, cards[1], 190],
    [0.3, cards[1], 190],
    [0.36, cards[2], 190],
    [0.43, cards[2], 190],
    [0.54, 695, 353],
    [0.64, 695, 353],
    [0.74, 687, 468],
    [0.82, 687, 468],
    [1, 580, 330],
  ]);
  const added = [0.14, 0.27, 0.4].filter((a) => t >= a).length;
  const total = POS_PRODUCTS.slice(0, added).reduce((a, p) => a + p.price, 0);
  const yape = t >= 0.58;
  const receipt = seg(t, 0.82, 0.9);

  return (
    <>
      <MockWindow path="/sales/new" crumb="Ventas › Nueva venta" active="/sales/new">
        <div className="absolute left-4 top-3 text-[15px] font-semibold">Nueva venta</div>
        <div className="absolute flex h-7 items-center rounded-lg border border-border bg-surface-soft px-2.5 text-[10px] text-text-muted" style={{ left: 28, top: 38, width: 374 }}>
          Busca por nombre, código o escanea…
        </div>
        {POS_PRODUCTS.map((p, i) => (
          <Box
            key={p.name}
            className="p-2 transition-transform"
            style={{ left: 28 + i * 128, top: 80, width: 118, height: 108, transform: pressed(t, [0.14 + i * 0.13]) ? "scale(0.95)" : "scale(1)" }}
          >
            <div className="h-[52px] rounded-lg" style={{ background: `linear-gradient(135deg, rgb(${p.hue} / 0.25), rgb(${p.hue} / 0.08))` }} />
            <p className="mt-1.5 truncate text-[10px] font-medium text-text-primary">{p.name}</p>
            <p className="text-[10px] font-semibold tabular-nums text-text-secondary">{money(p.price)}</p>
          </Box>
        ))}
      </MockWindow>

      {/* Cart */}
      <Box className="rounded-2xl" style={{ left: 590, top: 72, width: 196, height: 420 }}>
        <p className="border-b border-border-soft px-3 py-2 text-[11px] font-semibold text-text-primary">Carrito · {added} ítems</p>
        {POS_PRODUCTS.slice(0, added).map((p, i) => (
          <div key={p.name} className="flex items-center justify-between px-3 py-2 text-[10px]" style={{ animation: "fade-up 0.35s var(--ease-out) both" }}>
            <span className="truncate text-text-primary">1 × {p.name}</span>
            <span className="tabular-nums text-text-secondary">{money(p.price)}</span>
            {i === added - 1 && t < POS_PRODUCTS.length * 0.14 + 0.1 && <span className="sr-only">nuevo</span>}
          </div>
        ))}
        <p className="absolute left-3 top-[234px] text-[8.5px] font-semibold uppercase tracking-wider text-text-muted">¿Cómo paga?</p>
        <div className="absolute left-3 top-[260px] flex gap-1">
          {PAY.map((m, i) => {
            const on = yape ? i === 2 : i === 0;
            return (
              <div
                key={m}
                className={cn("grid h-[42px] w-[33px] place-items-center rounded-lg border text-[7.5px] font-semibold transition-all duration-300", on ? "border-primary/50 bg-primary-soft text-primary" : "border-border text-text-muted")}
              >
                {i === 2 ? <QrCode className="h-3 w-3" /> : <span className="h-3 w-3 rounded-sm bg-current opacity-40" />}
                {m}
              </div>
            );
          })}
        </div>
        <div className="absolute left-3 right-3 top-[310px] rounded-lg bg-surface-soft px-2 py-1.5 text-[8.5px] leading-snug text-text-secondary" style={{ opacity: yape ? 1 : 0.5 }}>
          {yape ? "1. Muestra tu QR  2. Cobra el monto exacto  3. Confirma la notificación" : "Recibo S/ 100.00 · Vuelto S/ 12.70"}
        </div>
        <div className="absolute left-3 right-3 top-[350px] flex items-baseline justify-between">
          <span className="text-[10px] font-semibold text-text-primary">Total</span>
          <span className="font-display text-[16px] font-bold tabular-nums text-text-primary">{money(total)}</span>
        </div>
        <div
          className="absolute left-3 right-3 top-[380px] grid h-8 place-items-center rounded-xl text-[11px] font-semibold text-on-primary transition-transform"
          style={{ background: "rgb(var(--c-primary))", transform: pressed(t, [0.78]) ? "scale(0.95)" : "scale(1)" }}
        >
          Cobrar {money(total)}
        </div>
      </Box>

      {receipt > 0 && (
        <>
          <div className="absolute inset-0 z-30 bg-[rgb(var(--shadow-color)/0.3)]" style={{ opacity: receipt }} />
          <Box className="z-40 rounded-2xl p-4" style={{ left: 280, top: 110, width: 260, height: 290, opacity: receipt, transform: `translateY(${(1 - easeOut(receipt)) * 30}px)` }}>
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="mt-2 text-center text-[13px] font-semibold text-text-primary">Venta registrada</p>
            <p className="text-center font-mono text-[10px] text-text-muted">BOLETA B001-00000124</p>
            <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-[10px]">
              {POS_PRODUCTS.map((p) => (
                <div key={p.name} className="flex justify-between text-text-secondary"><span>{p.name}</span><span className="tabular-nums">{money(p.price)}</span></div>
              ))}
              <div className="flex justify-between border-t border-border-soft pt-1.5 font-semibold text-text-primary"><span>Total · Yape</span><span className="tabular-nums">{money(87.3)}</span></div>
            </div>
            <p className="mt-3 rounded-lg bg-primary-softer px-2 py-1.5 text-center text-[9.5px] text-primary">El stock se descontó automáticamente</p>
          </Box>
        </>
      )}
      <Cursor x={cur.x} y={cur.y} down={pressed(t, [0.14, 0.27, 0.4, 0.58, 0.78])} />
    </>
  );
}

// ═══ 4. Motor FTGM ═══════════════════════════════════════════════════════════
const CH_W = 600;
const CH_H = 220;
const TODAY_X = 390;
const HIST = Array.from({ length: 25 }, (_, i) => {
  const x = 24 + (i / 24) * (TODAY_X - 24);
  const y = 140 - 34 * Math.sin((i / 12) * Math.PI * 2 + 0.6) - i * 1.6 + Math.sin(i * 7.3) * 7;
  return [x, y] as const;
});
const FC = Array.from({ length: 9 }, (_, k) => {
  const i = 24 + k;
  const x = TODAY_X + (k / 8) * (CH_W - 30 - TODAY_X);
  const y = 140 - 34 * Math.sin((i / 12) * Math.PI * 2 + 0.6) - i * 1.6;
  return [x, y, 6 + k * 3.2] as const;
});
const line = (pts: readonly (readonly number[])[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
const HIST_PATH = line(HIST);
const HIST_AREA = `${HIST_PATH} L${TODAY_X} ${CH_H - 20} L24 ${CH_H - 20} Z`;
const FC_PATH = line([[HIST[24][0], HIST[24][1]], ...FC]);
const BAND_PATH = `${line([[HIST[24][0], HIST[24][1]], ...FC.map((p) => [p[0], p[1] - p[2]])])} ${FC.slice().reverse().map((p) => `L${p[0].toFixed(1)} ${(p[1] + p[2]).toFixed(1)}`).join(" ")} L${HIST[24][0]} ${HIST[24][1]} Z`;

/** Progress at which the free plan hits the Premium wall (right before the forecast). */
export const FTGM_LOCK_AT = 0.53;

export function FtgmScene({ t }: { t: number }) {
  const hist = easeOut(seg(t, 0.02, 0.32));
  const analysis = seg(t, 0.3, 0.52);
  const fc = easeOut(seg(t, 0.54, 0.8));
  const scanX = 24 + seg(t, 0.3, 0.52) * (TODAY_X - 24);
  const frozen = t >= FTGM_LOCK_AT - 0.001 && t < 0.54;

  return (
    <MockWindow path="/forecasting" crumb="Motor FTGM › Pronóstico" active="/forecasting" dark>
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 70% 10%, rgb(${NEON} / 0.08), transparent 70%), radial-gradient(40% 40% at 10% 90%, rgb(${VIOLET} / 0.08), transparent 70%)` }} />
      <div className="absolute left-4 top-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${NEON})`, boxShadow: `0 0 10px rgb(${NEON})` }} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.3em]" style={{ color: `rgb(${NEON})` }}>Motor FTGM</span>
      </div>
      <div className="absolute left-4 top-7 font-display text-[16px] font-semibold text-white">Pronóstico de demanda</div>

      {/* Analysis chips */}
      <div className="absolute left-4 top-[56px] flex items-center gap-1.5">
        {["Fourier", "Tendencia", "Estacionalidad"].map((c, i) => {
          const ok = t >= 0.36 + i * 0.06;
          const on = t >= 0.3;
          return (
            <span
              key={c}
              className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-semibold transition-all duration-300"
              style={{
                opacity: on ? 1 : 0.25,
                color: ok ? `rgb(${NEON})` : "rgb(255 255 255 / 0.6)",
                background: ok ? `rgb(${NEON} / 0.12)` : "rgb(255 255 255 / 0.05)",
                border: `1px solid ${ok ? `rgb(${NEON} / 0.35)` : "rgb(255 255 255 / 0.08)"}`,
              }}
            >
              {ok ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/30" />}
              {c}
            </span>
          );
        })}
        <span className="ml-2 text-[9px] text-white/50">Analizando 124 productos</span>
        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${analysis * 100}%`, background: `linear-gradient(90deg, rgb(${VIOLET}), rgb(${NEON}))` }} />
        </span>
      </div>

      {/* Chart */}
      <div className="absolute rounded-xl" style={{ left: 16, top: 82, width: CH_W, height: CH_H, background: "rgb(255 255 255 / 0.02)", border: "1px solid rgb(255 255 255 / 0.07)" }}>
        <svg width={CH_W} height={CH_H} className="absolute inset-0">
          <defs>
            <linearGradient id="demo-hist-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={`rgb(${NEON})`} stopOpacity="0.22" />
              <stop offset="1" stopColor={`rgb(${NEON})`} stopOpacity="0" />
            </linearGradient>
            <clipPath id="demo-fc-clip">
              <rect x={TODAY_X - 1} y="0" width={(CH_W - TODAY_X) * fc + 1} height={CH_H} />
            </clipPath>
            <filter id="demo-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {[40, 90, 140, 190].map((y) => (
            <line key={y} x1="24" x2={CH_W - 16} y1={y} y2={y} stroke="rgb(255 255 255 / 0.05)" />
          ))}
          <path d={HIST_AREA} fill="url(#demo-hist-area)" opacity={hist} />
          <path d={HIST_PATH} fill="none" stroke={`rgb(${NEON})`} strokeWidth="2" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - hist} filter="url(#demo-glow)" />
          {t >= 0.3 && t < 0.54 && (
            <line x1={scanX} x2={scanX} y1="14" y2={CH_H - 20} stroke={`rgb(${VIOLET})`} strokeOpacity="0.7" strokeWidth="1.5" />
          )}
          <g opacity={seg(t, 0.3, 0.36)}>
            <line x1={TODAY_X} x2={TODAY_X} y1="12" y2={CH_H - 20} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="3 4" />
            <text x={TODAY_X + 5} y="22" fontSize="9" fill="rgb(255 255 255 / 0.55)" fontFamily="monospace">HOY</text>
          </g>
          <g clipPath="url(#demo-fc-clip)">
            <path d={BAND_PATH} fill={`rgb(${PINK})`} fillOpacity="0.12" />
            <path d={FC_PATH} fill="none" stroke={`rgb(${PINK})`} strokeWidth="2" strokeDasharray="6 5" filter="url(#demo-glow)" />
          </g>
          {fc > 0.98 && (
            <g style={{ animation: "fade-in 0.4s ease-out both" }}>
              <circle cx={FC[4][0]} cy={FC[4][1]} r="4" fill={`rgb(${PINK})`} />
              <rect x={FC[4][0] - 58} y={FC[4][1] - 34} width="116" height="22" rx="6" fill="#0b0f14" stroke={`rgb(${PINK} / 0.5)`} />
              <text x={FC[4][0]} y={FC[4][1] - 19} fontSize="9.5" textAnchor="middle" fill="#fff">Pronóstico · 142 u ±11</text>
            </g>
          )}
        </svg>
        {frozen && (
          <div className="absolute right-4 top-3 flex items-center gap-1.5 text-[9.5px] text-white/60">
            <Loader2 className="h-3 w-3 animate-spin" /> Generando pronóstico…
          </div>
        )}
      </div>

      {/* Recommendations */}
      {[
        { p: "Arena gato 10 kg", a: "Compra 36 u. antes del 24", c: NEON },
        { p: "Alimento perro 15 kg", a: "Demanda +18% en diciembre", c: VIOLET },
        { p: "Snack dental", a: "Stock cubre 41 días", c: PINK },
      ].map((r, i) => {
        const p = easeOut(seg(t, 0.8 + i * 0.05, 0.9 + i * 0.05));
        return (
          <div
            key={r.p}
            className="absolute rounded-xl px-3 py-2.5"
            style={{
              left: 16 + i * 204,
              top: 314,
              width: 192,
              height: 104,
              opacity: 0.18 + p * 0.82,
              transform: `translateY(${(1 - p) * 12}px)`,
              background: "rgb(255 255 255 / 0.03)",
              border: `1px solid ${p > 0.5 ? `rgb(${r.c} / 0.35)` : "rgb(255 255 255 / 0.07)"}`,
            }}
          >
            {p > 0.05 ? (
              <>
                <p className="text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: `rgb(${r.c})` }}>Recomendación</p>
                <p className="mt-1.5 text-[11.5px] font-semibold text-white">{r.p}</p>
                <p className="mt-0.5 text-[10px] text-white/60">{r.a}</p>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <span className="block h-2 w-16 rounded bg-white/10" />
                <span className="block h-2.5 w-28 rounded bg-white/10" />
                <span className="block h-2 w-20 rounded bg-white/5" />
              </div>
            )}
          </div>
        );
      })}
    </MockWindow>
  );
}

/** Frozen FTGM frame decoration: a padlock stamped into the stage (the real CTA lives in the player). */
export function StageLockMark() {
  return (
    <div className="pointer-events-none absolute right-5 top-12 z-40 flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold text-white" style={{ background: `rgb(${VIOLET} / 0.85)` }}>
      <Lock className="h-2.5 w-2.5" /> PREMIUM
    </div>
  );
}
