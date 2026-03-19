"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Shield, User, Pencil, Eye, Trash2, Plus, X, Loader2, AlertCircle, Check, ClipboardList, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { updateUserRole, createUser, deleteUser, saveTeamOrder, updateUserTeamSection } from "../../actions/usuarios";
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole, type Role } from "@/utils/roles";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  team_order?: number | null;
  team_section?: string | null;
};

type TeamSection = "founders" | "coordinator" | "technical";

const TEAM_SECTION_LABELS: Record<TeamSection, string> = {
  founders: "Fundadores",
  coordinator: "Coordinador",
  technical: "Equipo técnico",
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
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragEnabledId, setDragEnabledId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [orderedProfiles, setOrderedProfiles] = useState<Profile[]>(profiles);

  useEffect(() => {
    setOrderedProfiles(profiles);
  }, [profiles]);

  const moveProfile = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setOrderedProfiles((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === fromId);
      const toIndex = prev.findIndex((p) => p.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const moveProfileByStep = (id: string, delta: -1 | 1) => {
    setOrderedProfiles((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === id);
      if (fromIndex < 0) return prev;
      const toIndex = fromIndex + delta;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

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

  async function handleUpdateTeamSection(formData: FormData) {
    const uid = formData.get("userId")?.toString() || "";
    setUpdatingId(uid);
    setActionMsg(null);
    const result = await updateUserTeamSection(formData);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: result?.success || "Sección de equipo actualizada." });
      router.refresh();
    }
    setUpdatingId(null);
  }

  async function handleSaveTeamOrder() {
    setSavingOrder(true);
    setActionMsg(null);
    const fd = new FormData();
    fd.set("orderedIds", orderedProfiles.map((p) => p.id).join(","));
    const result = await saveTeamOrder(fd);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: result?.success || "Orden actualizado." });
      router.refresh();
    }
    setSavingOrder(false);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Usuarios</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestiona cuentas y permisos del equipo.</p>
        </div>
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
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--accent-cyan)]" />
            Crear Nuevo Usuario
          </h2>
          <form action={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="usuario@ejemplo.com"
                className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                name="full_name"
                placeholder="Nombre del usuario"
                className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Rol</label>
              <select
                name="role"
                defaultValue="viewer"
                className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]} – {ROLE_DESCRIPTIONS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sección de equipo</label>
              <select
                name="team_section"
                defaultValue="technical"
                className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
              >
                <option value="founders">{TEAM_SECTION_LABELS.founders}</option>
                <option value="coordinator">{TEAM_SECTION_LABELS.coordinator}</option>
                <option value="technical">{TEAM_SECTION_LABELS.technical}</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 disabled:opacity-50 text-black font-semibold text-sm rounded-xl transition-colors"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role reference cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ALL_ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-xs font-semibold text-gray-200 flex items-center gap-2">
              {r === "admin" && <Shield className="h-3.5 w-3.5 text-cyan-400" />}
              {r === "editor" && <Pencil className="h-3.5 w-3.5 text-emerald-400" />}
              {r === "viewer" && <Eye className="h-3.5 w-3.5 text-amber-400" />}
              {ROLE_LABELS[r]}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Acceso Restringido</h3>
            <p className="text-xs opacity-80 mt-0.5">
              Solo los administradores pueden gestionar usuarios.
            </p>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Cuentas Registradas</h2>
              <p className="text-gray-600 text-xs mt-0.5">
                {orderedProfiles.length} usuario{orderedProfiles.length !== 1 ? "s" : ""}
              </p>
              {isAdmin && (
                <p className="text-[10px] text-[var(--accent-cyan)]/70 mt-1.5">
                  Arrastra o usa las flechas para cambiar el orden del equipo en la página pública.
                </p>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={handleSaveTeamOrder}
                disabled={savingOrder}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-cyan)] text-black text-xs font-semibold hover:bg-[var(--accent-cyan)]/90 transition-colors disabled:opacity-60"
              >
                {savingOrder ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Guardar orden
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-300">
            <thead className="text-[10px] uppercase bg-white/[0.02] text-gray-500 tracking-wider">
              <tr>
                {isAdmin && <th scope="col" className="px-3 py-2.5 w-12">Orden</th>}
                <th scope="col" className="px-4 py-2.5">Usuario</th>
                <th scope="col" className="px-4 py-2.5">Rol</th>
                {isAdmin && <th scope="col" className="px-4 py-2.5">Sección</th>}
                <th scope="col" className="px-4 py-2.5 hidden md:table-cell">Registro</th>
                {isAdmin && <th scope="col" className="px-4 py-2.5 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {orderedProfiles.length > 0 ? (
                orderedProfiles.map((profile, index) => {
                  const role = normalizeRole(profile.role);
                  const isCurrentUser = profile.id === currentUserId;
                  return (
                    <tr
                      key={profile.id}
                      draggable={isAdmin && dragEnabledId === profile.id}
                      onDragStart={() => {
                        setDraggedId(profile.id);
                        setDragOverId(profile.id);
                      }}
                      onDragOver={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                        if (dragOverId !== profile.id) setDragOverId(profile.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverId === profile.id) setDragOverId(null);
                      }}
                      onDrop={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                        if (draggedId) moveProfile(draggedId, profile.id);
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                        setDragEnabledId(null);
                      }}
                      className={`border-b border-white/[0.04] transition-colors ${dragOverId === profile.id ? "bg-[var(--accent-cyan)]/[0.06]" : "hover:bg-white/[0.03]"}`}
                    >
                      {isAdmin && (
                        <td className="px-3 py-4 align-middle">
                          <div className="flex items-center gap-2 text-slate-400">
                            <button
                              type="button"
                              onMouseDown={() => setDragEnabledId(profile.id)}
                              onTouchStart={() => setDragEnabledId(profile.id)}
                              onMouseUp={() => setDragEnabledId(null)}
                              onTouchEnd={() => setDragEnabledId(null)}
                              className="hidden sm:inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/70"
                              title="Arrastrar"
                            >
                              <GripVertical className="h-4 w-4 cursor-grab" />
                            </button>
                            <span className="text-xs">{index + 1}</span>
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => moveProfileByStep(profile.id, -1)}
                                disabled={index === 0}
                                className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 disabled:opacity-40"
                                title="Subir"
                              >
                                <ChevronUp size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveProfileByStep(profile.id, 1)}
                                disabled={index === orderedProfiles.length - 1}
                                className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 disabled:opacity-40"
                                title="Bajar"
                              >
                                <ChevronDown size={12} />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
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
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <form action={handleUpdateTeamSection} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={profile.id} />
                            <select
                              name="team_section"
                              defaultValue={profile.team_section || "technical"}
                              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 p-2 outline-none"
                            >
                              {(["founders", "coordinator", "technical"] as TeamSection[]).map((section) => (
                                <option key={section} value={section}>{TEAM_SECTION_LABELS[section]}</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={updatingId === profile.id}
                              className="px-3 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {updatingId === profile.id ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
                            </button>
                          </form>
                        </td>
                      )}
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
                  <td colSpan={isAdmin ? 6 : 3} className="px-6 py-8 text-center text-slate-500">
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
