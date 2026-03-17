"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Shield, User, Pencil, Eye, Trash2, Plus, X, Loader2, AlertCircle, Check, ClipboardList } from "lucide-react";
import Image from "next/image";
import { updateUserRole, createUser, deleteUser } from "../../actions/usuarios";
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole, type Role } from "@/utils/roles";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
};

function RoleBadge({ role }: { role: Role }) {
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
        <Shield className="h-3 w-3" /> {ROLE_LABELS.admin}
      </span>
    );
  if (role === "coordinador")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 text-orange-400 border border-orange-400/20">
        <ClipboardList className="h-3 w-3" /> {ROLE_LABELS.coordinador}
      </span>
    );
  if (role === "editor")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
        <Pencil className="h-3 w-3" /> {ROLE_LABELS.editor}
      </span>
    );
  if (role === "visitante")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-400/10 text-purple-300 border border-purple-400/20">
        <Eye className="h-3 w-3" /> {ROLE_LABELS.visitante}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
      <Eye className="h-3 w-3" /> {ROLE_LABELS.viewer}
    </span>
  );
}

export default function UsuariosClient({
  profiles,
  currentUserId,
  isAdmin,
}: {
  profiles: Profile[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleCreate(formData: FormData) {
    setCreating(true);
    setCreateMsg(null);
    const result = await createUser(formData);
    if (result?.error) {
      setCreateMsg({ type: "error", text: result.error });
    } else {
      setCreateMsg({ type: "success", text: result?.success || "Usuario creado." });
      setShowCreateForm(false);
    }
    setCreating(false);
  }

  async function handleDelete(userId: string, name: string) {
    if (!window.confirm(`¿Eliminar al usuario "${name || userId}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(userId);
    setActionMsg(null);
    const fd = new FormData();
    fd.set("userId", userId);
    const result = await deleteUser(fd);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: result?.success || "Eliminado." });
    }
    setDeletingId(null);
  }

  async function handleUpdateRole(formData: FormData) {
    const uid = formData.get("userId")?.toString() || "";
    setUpdatingId(uid);
    setActionMsg(null);
    const result = await updateUserRole(formData);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: result?.success || "Rol actualizado." });
      router.refresh();
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="h-8 w-8 text-cyan-400" />
          Gestión de Usuarios
        </h1>
        {isAdmin && (
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setCreateMsg(null); }}
            className="flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-4 py-2 rounded-xl hover:bg-[var(--accent-cyan)]/90 transition-colors"
          >
            {showCreateForm ? <X size={20} /> : <Plus size={20} />}
            {showCreateForm ? "Cancelar" : "Nuevo Usuario"}
          </button>
        )}
      </div>

      {/* Messages */}
      {(createMsg || actionMsg) && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          (createMsg || actionMsg)!.type === "success"
            ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
            : "bg-red-500/10 border-red-400/30 text-red-300"
        }`}>
          {(createMsg || actionMsg)!.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{(createMsg || actionMsg)!.text}</span>
          <button onClick={() => { setCreateMsg(null); setActionMsg(null); }} className="ml-auto opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && isAdmin && (
        <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-cyan-400" />
            Crear Nuevo Usuario
          </h2>
          <form action={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="usuario@ejemplo.com"
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                name="full_name"
                placeholder="Nombre del usuario"
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Rol</label>
              <select
                name="role"
                defaultValue="viewer"
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]} – {ROLE_DESCRIPTIONS[r]}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role reference cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ALL_ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              {r === "admin" && <Shield className="h-4 w-4 text-cyan-400" />}
              {r === "editor" && <Pencil className="h-4 w-4 text-emerald-400" />}
              {r === "viewer" && <Eye className="h-4 w-4 text-amber-400" />}
              {ROLE_LABELS[r]}
            </p>
            <p className="text-xs text-slate-400 mt-1">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/50 text-amber-200 p-4 rounded-lg flex items-start gap-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium">Acceso Restringido</h3>
            <p className="text-sm opacity-90">
              Solo los administradores pueden gestionar usuarios.
            </p>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white">Cuentas Registradas</h2>
          <p className="text-slate-400 text-sm mt-1">
            {profiles.length} usuario{profiles.length !== 1 ? "s" : ""} registrado{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3">Usuario</th>
                <th scope="col" className="px-6 py-3">Rol</th>
                <th scope="col" className="px-6 py-3">Fecha Registro</th>
                {isAdmin && <th scope="col" className="px-6 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {profiles.length > 0 ? (
                profiles.map((profile) => {
                  const role = normalizeRole(profile.role);
                  const isCurrentUser = profile.id === currentUserId;
                  return (
                    <tr key={profile.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          {profile.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt="Avatar"
                              width={36}
                              height={36}
                              unoptimized
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="flex items-center gap-2">
                              {profile.full_name || "Sin Nombre"}
                              {isCurrentUser && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">TÚ</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 font-normal">{profile.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={role} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <form action={handleUpdateRole} className="flex items-center gap-2">
                              <input type="hidden" name="userId" value={profile.id} />
                              <select
                                name="role"
                                disabled={isCurrentUser}
                                defaultValue={role}
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 p-2 outline-none disabled:opacity-50"
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                disabled={isCurrentUser || updatingId === profile.id}
                                className="px-3 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {updatingId === profile.id ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
                              </button>
                            </form>
                            <button
                              onClick={() => handleDelete(profile.id, profile.full_name || "")}
                              disabled={isCurrentUser || deletingId === profile.id}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isCurrentUser ? "No puedes eliminarte" : "Eliminar usuario"}
                            >
                              {deletingId === profile.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                          {isCurrentUser && (
                            <p className="text-xs text-amber-500/70 mt-1 text-right">Tu cuenta</p>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
