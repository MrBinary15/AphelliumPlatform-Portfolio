"use client";

import { useState, useTransition } from "react";
import {
  Plus, Search, Filter, Clock, CheckCircle2, AlertTriangle, Pause, XCircle,
  Calendar, Users, Paperclip, MessageSquare, ChevronRight, Loader2, X
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createTask } from "./actions";
import type { Role } from "@/utils/roles";

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string | null };
type Assignment = { id: string; user_id: string; confirmed: boolean; user: Profile };
type Task = {
  id: string; title: string; description: string | null;
  status: string; priority: string; due_date: string | null;
  created_at: string; updated_at: string; started_at: string | null; completed_at: string | null;
  created_by: string;
  creator: Profile;
  task_assignments: Assignment[];
  task_comments: { id: string }[];
  task_attachments: { id: string }[];
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pendiente: { label: "Pendiente", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  en_progreso: { label: "En Progreso", icon: AlertTriangle, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  completada: { label: "Completada", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  postergada: { label: "Postergada", icon: Pause, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  cancelada: { label: "Cancelada", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: "Baja", color: "text-gray-400 bg-gray-400/10" },
  media: { label: "Media", color: "text-blue-400 bg-blue-400/10" },
  alta: { label: "Alta", color: "text-orange-400 bg-orange-400/10" },
  urgente: { label: "Urgente", color: "text-red-400 bg-red-400/10" },
};

function Avatar({ src, name, size = 28 }: { src: string | null; name: string | null; size?: number }) {
  if (src) {
    return <Image src={src} alt={name || ""} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400" style={{ width: size, height: size }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completada" || status === "cancelada") return false;
  return new Date(dueDate) < new Date();
}

export default function TareasClient({
  tasks, profiles, currentUserId, currentRole, canManage,
}: {
  tasks: Task[]; profiles: Profile[]; currentUserId: string; currentRole: Role; canManage: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Filter tasks
  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    }
    // Non-managers only see tasks they're assigned to or created
    if (!canManage) {
      const isAssigned = t.task_assignments.some((a) => a.user_id === currentUserId);
      const isCreator = t.created_by === currentUserId;
      if (!isAssigned && !isCreator) return false;
    }
    return true;
  });

  const counts = {
    total: filtered.length,
    pendiente: filtered.filter((t) => t.status === "pendiente").length,
    en_progreso: filtered.filter((t) => t.status === "en_progreso").length,
    completada: filtered.filter((t) => t.status === "completada").length,
  };

  async function handleCreate(formData: FormData) {
    for (const uid of selectedAssignees) {
      formData.append("assignees", uid);
    }
    startTransition(async () => {
      const result = await createTask(formData);
      if (result && "error" in result) {
        setCreateError(result.error);
      } else {
        setShowCreate(false);
        setSelectedAssignees([]);
        setCreateError(null);
      }
    });
  }

  function toggleAssignee(id: string) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tareas y Planificación</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de tareas, asignaciones y seguimiento del equipo</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-5 py-2.5 rounded-xl hover:brightness-110 transition-all">
            <Plus size={18} /> Nueva Tarea
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, color: "text-white" },
          { label: "Pendientes", value: counts.pendiente, color: "text-amber-400" },
          { label: "En Progreso", value: counts.en_progreso, color: "text-blue-400" },
          { label: "Completadas", value: counts.completada, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tareas..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]">
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]">
          <option value="all">Todas las prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No hay tareas que mostrar</p>
            <p className="text-sm mt-1">Crea una nueva tarea para empezar</p>
          </div>
        ) : (
          filtered.map((task) => {
            const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
            const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
            const Icon = sc.icon;
            const overdue = isOverdue(task.due_date, task.status);

            return (
              <Link key={task.id} href={`/admin/tareas/${task.id}`} className="block group">
                <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-white/20 transition-all ${overdue ? "ring-1 ring-red-500/30" : ""}`}>
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`p-2 rounded-lg border ${sc.bg}`}>
                      <Icon size={18} className={sc.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold group-hover:text-[var(--accent-cyan)] transition-colors truncate">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${pc.color}`}>
                          {pc.label}
                        </span>
                        {overdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-red-400 bg-red-400/10">
                            Vencida
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: task.description }} />
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-400" : ""}`}>
                            <Calendar size={12} />
                            {new Date(task.due_date).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {task.task_assignments.length} asignados
                        </span>
                        {task.task_comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {task.task_comments.length}
                          </span>
                        )}
                        {task.task_attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip size={12} />
                            {task.task_attachments.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignees Avatars */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {task.task_assignments.slice(0, 4).map((a) => (
                        <div key={a.id} className={`ring-2 ring-[var(--bg-darker)] rounded-full ${a.confirmed ? "ring-emerald-500/50" : ""}`}>
                          <Avatar src={a.user?.avatar_url} name={a.user?.full_name} size={28} />
                        </div>
                      ))}
                      {task.task_assignments.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-white/10 ring-2 ring-[var(--bg-darker)] flex items-center justify-center text-[10px] text-gray-400">
                          +{task.task_assignments.length - 4}
                        </div>
                      )}
                    </div>

                    <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#0a0f1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nueva Tarea</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <form action={handleCreate} className="p-6 space-y-5">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{createError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Título *</label>
                <input name="title" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]" placeholder="Ej: Revisión de documentos Q1" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Descripción</label>
                <textarea name="description" rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)] resize-none" placeholder="Describe la tarea en detalle..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Prioridad</label>
                  <select name="priority" defaultValue="media" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-cyan)]">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Fecha límite</label>
                  <input type="datetime-local" name="due_date" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-cyan)]" />
                </div>
              </div>

              {/* Assignees Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Asignar Usuarios ({selectedAssignees.length} seleccionados)
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleAssignee(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        selectedAssignees.includes(p.id)
                          ? "bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <Avatar src={p.avatar_url} name={p.full_name} size={24} />
                      <span className="text-sm text-white flex-1">{p.full_name || "Sin nombre"}</span>
                      {selectedAssignees.includes(p.id) && (
                        <CheckCircle2 size={16} className="text-[var(--accent-cyan)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="flex-1 bg-[var(--accent-cyan)] text-black font-bold px-4 py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPending ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : "Crear Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
