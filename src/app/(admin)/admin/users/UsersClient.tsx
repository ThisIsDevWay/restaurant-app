"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  removeUserPasswordAction,
} from "@/actions/users";
import type { UserRow } from "@/db/queries/users";

type Role = "admin" | "kitchen" | "waiter";

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  admin: {
    label: "Admin",
    color: "bg-red-50 text-red-700 ring-red-200",
    icon: ShieldCheck,
  },
  kitchen: {
    label: "Cocina",
    color: "bg-green-50 text-green-700 ring-green-200",
    icon: ChefHat,
  },
  waiter: {
    label: "Mesero",
    color: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: UtensilsCrossed,
  },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function Avatar({ user }: { user: Pick<UserRow, "name" | "email" | "image"> }) {
  const initials = (user.name ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.name ?? user.email}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-border">
      {initials || "?"}
    </div>
  );
}

type FormState = {
  name: string;
  email: string;
  role: Role;
  password: string;
  showPassword: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "",
  email: "",
  role: "waiter",
  password: "",
  showPassword: false,
};

type ModalMode = "create" | "edit";

export function UsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [userList, setUserList] = useState(initialUsers);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      password: "",
      showPassword: false,
    });
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);

    if (modalMode === "create") {
      const result = await createUserAction({
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password || undefined,
      });
      if (result?.data?.success && result.data.user) {
        setUserList((prev) => [
          ...prev,
          {
            ...result.data!.user!,
            image: null,
            hasPassword: !!form.password,
          },
        ]);
        closeModal();
      } else {
        setFormError(result?.data?.error ?? "Error al crear usuario");
      }
    } else if (modalMode === "edit" && editingUser) {
      const result = await updateUserAction({
        id: editingUser.id,
        name: form.name,
        role: form.role,
        password: form.password || undefined,
      });
      if (result?.data?.success) {
        setUserList((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: form.name,
                  role: form.role,
                  hasPassword: form.password ? true : u.hasPassword,
                }
              : u
          )
        );
        closeModal();
      } else {
        setFormError("Error al actualizar usuario");
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteUserAction({ id: deleteTarget.id });
    if (result?.data?.success) {
      setUserList((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      alert(result?.data?.error ?? "Error al eliminar usuario");
    }
    setDeleting(false);
  };

  const handleRemovePassword = async (user: UserRow) => {
    if (
      !confirm(
        `¿Quitar contraseña de "${user.name ?? user.email}"? Solo podrá entrar con Google.`
      )
    )
      return;
    await removeUserPasswordAction({ id: user.id });
    setUserList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, hasPassword: false } : u))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-main">
            Usuarios
          </h1>
          <p className="text-sm text-text-muted">
            {userList.length} usuario{userList.length !== 1 ? "s" : ""}{" "}
            registrado{userList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-border">
        {userList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
              <Users className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm font-semibold text-text-main">
              Sin usuarios
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Crea el primer usuario del sistema
            </p>
            <button
              onClick={openCreate}
              className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Crear usuario
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {userList.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-bg-app/50 sm:flex-row sm:items-center sm:gap-4"
              >
                {/* Avatar + info */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-main">
                      {user.name ?? "(Sin nombre)"}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  <RoleBadge role={user.role} />
                </div>

                {/* Auth method */}
                <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
                  {user.image && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-200">
                      Google
                    </span>
                  )}
                  {user.hasPassword && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
                      <Key className="h-3 w-3" />
                      Contraseña
                    </span>
                  )}
                  {!user.image && !user.hasPassword && (
                    <span className="text-[11px] text-text-muted">Sin método</span>
                  )}
                </div>

                {/* Created */}
                <div className="hidden pl-0 text-right sm:block">
                  <p className="text-xs text-text-muted">
                    {new Date(user.createdAt).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pl-12 sm:pl-0">
                  {user.hasPassword && (
                    <button
                      onClick={() => handleRemovePassword(user)}
                      title="Quitar contraseña"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-amber-50 hover:text-amber-600"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(user)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-error/5 hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-main">
                {modalMode === "create" ? "Nuevo usuario" : "Editar usuario"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg-app hover:text-text-main"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-bg-app px-4 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="Nombre completo"
                />
              </div>

              {/* Email (only on create) */}
              {modalMode === "create" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-bg-app px-4 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    placeholder="usuario@email.com"
                  />
                </div>
              )}

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Rol
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["admin", "kitchen", "waiter"] as Role[]).map((role) => {
                    const cfg = ROLE_CONFIG[role];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role }))}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all ${
                          form.role === role
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border bg-bg-app text-text-muted hover:border-border/80 hover:bg-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {modalMode === "edit"
                    ? "Nueva contraseña (dejar vacío para no cambiar)"
                    : "Contraseña (opcional — si no se pone, solo puede entrar con Google)"}
                </label>
                <div className="relative">
                  <input
                    type={form.showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-bg-app py-2.5 pl-4 pr-11 text-sm text-text-main outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    placeholder={
                      modalMode === "edit"
                        ? "••••••••"
                        : "Mínimo 8 caracteres"
                    }
                    minLength={form.password ? 8 : undefined}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, showPassword: !f.showPassword }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                    tabIndex={-1}
                  >
                    {form.showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-error/8 px-4 py-3 text-sm font-medium text-error ring-1 ring-error/20">
                  {formError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-border bg-white py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-bg-app"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name || (modalMode === "create" && !form.email)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : modalMode === "create" ? (
                  "Crear usuario"
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10">
              <Trash2 className="h-6 w-6 text-error" />
            </div>
            <h3 className="mb-1 text-base font-bold text-text-main">
              Eliminar usuario
            </h3>
            <p className="mb-5 text-sm text-text-muted">
              ¿Eliminar a{" "}
              <strong className="text-text-main">
                {deleteTarget.name ?? deleteTarget.email}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-main hover:bg-bg-app"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-error py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
