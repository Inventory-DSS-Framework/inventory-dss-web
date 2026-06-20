"use client";

import { useState } from "react";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { Card } from "@/components/ui/Card";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DateRangePill } from "@/components/ui/DateRangePill";
import { Badge } from "@/components/ui/Table";
import {
  dashboardMetrics,
  demandVsForecastData,
  ticketMedioData,
  assistantTasks,
  nextAction,
} from "@/mocks/data/dashboard";
import {
  Users, Package, ArrowUpRight, Bot, Send,
  MapPin, FileText, AlertCircle, Maximize2, Clock,
} from "lucide-react";

const soles = (v: number) => `S/ ${v.toFixed(0)}`;

export default function DashboardPage() {
  const [tab, setTab] = useState("ventas");

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { label: "Ventas", value: "ventas" },
            { label: "Inventario", value: "inventario" },
          ]}
        />
        <DateRangePill />
      </div>

      {/* Row 1 — hero + mini stats + next action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hero sales card */}
        <Card className="lg:col-span-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              Ventas del mes <span className="text-text-muted">· Junio</span>
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-semibold text-text-secondary">S/</span>
              <span className="text-4xl font-bold tracking-tight text-text-primary">20.845</span>
              <span className="text-lg font-semibold text-text-secondary">mil</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="success" dot>+32%</Badge>
              <span className="text-xs text-text-muted">vs Junio del año anterior</span>
            </div>
          </div>
          <CircularGauge value={83} caption="de la meta" />
        </Card>

        {/* Mini stat stack */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          <Card interactive className="flex items-center justify-between gap-3 py-5">
            <div>
              <p className="text-sm font-medium text-text-secondary">Clientes atendidos</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">58</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary-soft text-primary">
              <Users className="w-5 h-5" />
            </div>
          </Card>
          <Card interactive className="flex items-center justify-between gap-3 py-5">
            <div>
              <p className="text-sm font-medium text-text-secondary">Productos activos</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-3xl font-bold tracking-tight text-text-primary">214</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success">
                  <ArrowUpRight className="w-3 h-3" />6%
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-violet-soft text-accent-violet">
              <Package className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* Next recommended action */}
        <Card className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Próxima acción</h3>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <Clock className="w-4 h-4" /> {nextAction.time}
            </span>
          </div>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
              <p className="text-text-secondary">
                <span className="font-medium text-text-primary">{nextAction.title}</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
              <p className="text-text-secondary">{nextAction.location}</p>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
              <p className="text-text-secondary">{nextAction.description}</p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-text-muted text-xs">Estado</span>
              <Badge variant="warning">{nextAction.status}</Badge>
            </div>
          </div>
          <div className="mt-5">
            <button className="btn btn-primary w-full py-2.5 text-sm">
              Revisar recomendación
            </button>
          </div>
        </Card>
      </div>

      {/* Row 2 — charts + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LineChartCard
            title="Total en ventas"
            data={demandVsForecastData}
            valueFormatter={soles}
            lines={[
              { dataKey: "actual", name: "Mes actual", stroke: "#3358F4", value: "S/ 20.845" },
              { dataKey: "forecast", name: "Mes anterior", stroke: "#7C5CFC", value: "S/ 17.431" },
            ]}
          />
          <LineChartCard
            title="Ticket medio"
            data={ticketMedioData}
            valueFormatter={soles}
            lines={[
              { dataKey: "actual", name: "Mes actual", stroke: "#10B981", value: "S/ 50.00" },
              { dataKey: "forecast", name: "Mes anterior", stroke: "#7C5CFC", value: "S/ 38.45" },
            ]}
          />
        </div>

        <div className="space-y-6">
          {/* Ticket medio highlight */}
          <Card className="bg-gradient-lavender border-accent-lavender/40">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Ticket medio</h3>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-success">
                <ArrowUpRight className="w-3 h-3" />4%
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">vs año anterior</p>
            <p className="mt-4 text-4xl font-bold tracking-tight text-primary">S/ 50.00</p>
            <div className="mt-4 flex items-end gap-1 h-10">
              {[40, 55, 45, 65, 50, 70, 60, 80, 72, 88, 75, 92].map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-full bg-primary/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </Card>

          {/* DSS Assistant */}
          <Card className="flex flex-col h-[360px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary leading-tight">Asistente DSS</h3>
                  <p className="text-[11px] text-text-muted">Sugerencias inteligentes</p>
                </div>
              </div>
              <button className="p-1.5 rounded-lg text-text-muted hover:bg-surface-soft transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 -mr-2 pr-2">
              {assistantTasks.map((task) => (
                <button
                  key={task.id}
                  className="w-full text-left bg-surface-soft hover:bg-primary-softer border border-border hover:border-primary/20 p-3 rounded-2xl text-sm text-text-secondary flex items-start gap-2.5 transition-colors"
                >
                  {task.type === "task" ? (
                    <FileText className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-accent-violet shrink-0" />
                  )}
                  {task.text}
                </button>
              ))}
            </div>

            <div className="relative mt-3">
              <input
                type="text"
                placeholder="Pregunta al asistente…"
                className="w-full bg-surface-soft border border-border rounded-full py-2.5 pl-4 pr-12 text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
              />
              <button className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center transition-[filter] hover:brightness-105">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
