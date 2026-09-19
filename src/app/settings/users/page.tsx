"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Eye, EyeOff, KeyRound, Power, RefreshCw, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { generatePassword, suggestUsername, usersApi } from "@/lib/apis/users";
import type { UserDTO } from "@/types/api";

const ROLE: Record<string, { label: string; variant: "primary" | "violet" | "default" | "success" }> = {
  owner: { label: "Propietario", variant: "violet" },
  admin: { label: "Administrador", variant: "primary" },
  seller: { label: "Vendedor", variant: "success" },
  analyst: { label: "Analista", variant: "default" },
  viewer: { label: "Lector", variant: "default" },
};

const USERNAME_RE = /^[a-z0-9._-]{3,60}$/;

function lastLogin(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });
}

export default function UsersPage() {
  const companyId = useCompanyId();
  const { isAdmin } = useRole();
  const { user: me } = useProfile();
  const users = useApi(() => (companyId ? usersApi.list(companyId) : Promise.resolve([])), [companyId]);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetting, setResetting] = useState<UserDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (u: UserDTO) => {
    if (!companyId) return;
    setBusyId(u.id);
    setError(null);
    try {
      await usersApi.update(companyId, u.id, { status: u.status === "disabled" ? "active" : "disabled" });
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    } finally {
      setBusyId(null);
    }
  };

  const list = users.data ?? [];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Configuración
      </Link>
      <PageHeader
        title="Usuarios"
        description="Crea usuarios para tus vendedores: ingresan con usuario y contraseña y solo acceden al punto de venta."
        action={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)} disabled={!companyId}>
              <UserPlus className="h-4 w-4" /> Nuevo vendedor
            </Button>
          )
        }
      />

      {error && <div className="rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

      <DataState loading={users.loading && !users.data} error={users.error} empty={false} onRetry={users.reload}>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Nombre", "Usuario / correo", "Rol", "Estado", "Último ingreso", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {list.map((u) => {
                  const role = ROLE[u.role] ?? { label: u.role, variant: "default" as const };
                  const editable = isAdmin && u.role !== "owner" && u.id !== me?.id;
                  const disabled = u.status === "disabled";
                  return (
                    <tr key={u.id} className={cn("transition-colors hover:bg-surface-soft/70", disabled && "opacity-60")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                            {u.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                          </span>
                          <span className="text-sm font-medium text-text-primary">
                            {u.full_name}
                            {u.id === me?.id && <span className="ml-1.5 text-xs text-text-muted">(tú)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-text-secondary">{u.username ?? u.email ?? "—"}</td>
                      <td className="px-6 py-4"><Badge variant={role.variant}>{role.label}</Badge></td>
                      <td className="px-6 py-4">
                        <Badge variant={disabled ? "danger" : u.status === "invited" ? "warning" : "success"} dot>
                          {disabled ? "Desactivado" : u.status === "invited" ? "Invitado" : "Activo"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">{lastLogin(u.last_login_at)}</td>
                      <td className="px-6 py-4">
                        {editable && (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setResetting(u)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-soft hover:text-primary"
                            >
                              <KeyRound className="h-3.5 w-3.5" /> Contraseña
                            </button>
                            <button
                              type="button"
                              onClick={() => toggle(u)}
                              disabled={busyId === u.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50",
                                disabled ? "text-success hover:bg-success-soft" : "text-danger hover:bg-danger-soft",
                              )}
                            >
                              <Power className="h-3.5 w-3.5" /> {disabled ? "Activar" : "Desactivar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {list.length > 0 && !list.some((u) => u.role === "seller") && (
            <div className="flex items-center gap-3 border-t border-border bg-surface-soft/50 px-6 py-4 text-sm text-text-secondary">
              <Users className="h-4 w-4 text-primary" /> Aún no tienes vendedores. Crea uno para que atienda el punto de venta.
            </div>
          )}
        </Card>
      </DataState>

      {companyId && (
        <>
          <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} companyId={companyId} onCreated={users.reload} />
          <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} companyId={companyId} />
        </>
      )}
    </div>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(true);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass(value.length > 0 && value.length < 6, "pr-10 font-mono")}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary" aria-label={show ? "Ocultar" : "Mostrar"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <Button type="button" variant="secondary" onClick={() => onChange(generatePassword())} title="Generar contraseña">
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button type="button" variant="secondary" onClick={copy} disabled={!value} title="Copiar">
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function CreateUserModal({ open, onClose, companyId, onCreated }: { open: boolean; onClose: () => void; companyId: string; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [touchedUsername, setTouchedUsername] = useState(false);
  const [role, setRole] = useState<"seller" | "admin">("seller");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; password: string; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      setFullName("");
      setUsername("");
      setTouchedUsername(false);
      setRole("seller");
      setPassword(generatePassword());
      setError(null);
      setCreated(null);
    }
  }, [open]);

  useEffect(() => {
    if (!touchedUsername) setUsername(suggestUsername(fullName));
  }, [fullName, touchedUsername]);

  const valid = fullName.trim().length > 1 && USERNAME_RE.test(username) && password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await usersApi.create(companyId, { full_name: fullName.trim(), username, password, role });
      setCreated({ username, password, name: fullName.trim() });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const copyAll = () => created && navigator.clipboard.writeText(`Usuario: ${created.username}\nContraseña: ${created.password}`).catch(() => undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? "Usuario creado" : "Nuevo vendedor"}
      description={created ? "Entrega estas credenciales al vendedor. La contraseña no se volverá a mostrar." : "Ingresará con este usuario y contraseña."}
      size="sm"
      footer={
        created ? (
          <>
            <Button variant="secondary" onClick={copyAll}><Copy className="h-4 w-4" /> Copiar credenciales</Button>
            <Button onClick={onClose}>Listo</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="create-user-form" disabled={!valid || saving}>{saving ? "Creando…" : "Crear usuario"}</Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-3 rounded-2xl bg-surface-soft p-4 text-sm">
          <p className="font-medium text-text-primary">{created.name}</p>
          <div className="flex justify-between"><span className="text-text-muted">Usuario</span><span className="font-mono font-semibold text-text-primary">{created.username}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Contraseña</span><span className="font-mono font-semibold text-text-primary">{created.password}</span></div>
        </div>
      ) : (
        <form id="create-user-form" onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
          <Field label="Nombre completo">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Lucía Ramos Torres" className={inputClass()} autoFocus />
          </Field>
          <Field label="Usuario" hint="Minúsculas, números, punto, guion o guion bajo (3 a 60).">
            <input
              value={username}
              onChange={(e) => {
                setTouchedUsername(true);
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""));
              }}
              placeholder="lramos"
              className={inputClass(username.length > 0 && !USERNAME_RE.test(username), "font-mono")}
            />
          </Field>
          <Field label="Rol">
            <Select
              value={role}
              onChange={(v) => setRole(v as "seller" | "admin")}
              options={[
                { value: "seller", label: "Vendedor", description: "Solo punto de venta, sus ventas y consulta de stock" },
                { value: "admin", label: "Administrador", description: "Puede ver y cambiar todo" },
              ]}
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres. Usa el botón para generar una segura.">
            <PasswordField value={password} onChange={setPassword} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, companyId }: { user: UserDTO | null; onClose: () => void; companyId: string }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPassword(generatePassword());
      setDone(false);
      setError(null);
    }
  }, [user]);

  const save = async () => {
    if (!user || password.length < 6) return;
    setSaving(true);
    setError(null);
    try {
      await usersApi.update(companyId, user.id, { password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Restablecer contraseña"
      description={user ? `${user.full_name} · ${user.username ?? user.email ?? ""}` : undefined}
      size="sm"
      footer={
        done ? (
          <Button onClick={onClose}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={saving || password.length < 6}>{saving ? "Guardando…" : "Guardar contraseña"}</Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        {error && <div className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        {done && <div className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">Contraseña actualizada. Compártela con el usuario.</div>}
        <Field label="Nueva contraseña">
          <PasswordField value={password} onChange={setPassword} />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-text-primary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
    </div>
  );
}
