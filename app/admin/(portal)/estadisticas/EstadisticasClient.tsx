"use client";

import { useState, useMemo } from "react";
import {
  BarChart3, Users, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Award, Paperclip, MessageSquare, UserCheck, XCircle, ChevronDown
} from "lucide-react";
import Image from "next/image";

type Task = { id: string; title: string; status: string; priority: string; created_at: string; completed_at: string | null; due_date: string | null; created_by: string };
type Assignment = { id: string; task_id: string; user_id: string; confirmed: boolean; confirmed_at: string | null };
type Attachment = { id: string; task_id: string; user_id: string };
type Comment = { id: string; task_id: string; user_id: string };
type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string | null };

function Avatar({ src, name, size = 36 }: { src: string | null; name: string | null; size?: number }) {
  if (src) return <Image src={src} alt={name || ""} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400" style={{ width: size, height: size }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function EstadisticasClient({
  tasks, assignments, attachments, comments, profiles, currentUserId, canViewAll,
}: {
  tasks: Task[]; assignments: Assignment[]; attachments: Attachment[];
  comments: Comment[]; profiles: Profile[]; currentUserId: string; canViewAll: boolean;
}) {
  const [selectedUser, setSelectedUser] = useState<string>(canViewAll ? "all" : currentUserId);

  // Compute stats per user
  const userStats = useMemo(() => {
    const stats: Record<string, {
      assigned: number; confirmed: number; completed: number;
      overdue: number; comments: number; attachments: number; tasksCreated: number;
    }> = {};

    for (const p of profiles) {
      stats[p.id] = { assigned: 0, confirmed: 0, completed: 0, overdue: 0, comments: 0, attachments: 0, tasksCreated: 0 };
    }

    for (const a of assignments) {
      if (!stats[a.user_id]) continue;
      stats[a.user_id].assigned++;
      if (a.confirmed) stats[a.user_id].confirmed++;
      const task = tasks.find((t) => t.id === a.task_id);
      if (task?.status === "completada") stats[a.user_id].completed++;
      if (task?.due_date && task.status !== "completada" && task.status !== "cancelada" && new Date(task.due_date) < new Date()) {
        stats[a.user_id].overdue++;
      }
    }

    for (const c of comments) {
      if (stats[c.user_id]) stats[c.user_id].comments++;
    }

    for (const att of attachments) {
      if (stats[att.user_id]) stats[att.user_id].attachments++;
    }

    for (const t of tasks) {
      if (stats[t.created_by]) stats[t.created_by].tasksCreated++;
    }

    return stats;
  }, [tasks, assignments, comments, attachments, profiles]);

  // Global stats
  const globalStats = useMemo(() => ({
    total: tasks.length,
    pendiente: tasks.filter((t) => t.status === "pendiente").length,
    en_progreso: tasks.filter((t) => t.status === "en_progreso").length,
    completada: tasks.filter((t) => t.status === "completada").length,
    cancelada: tasks.filter((t) => t.status === "cancelada").length,
    overdue: tasks.filter((t) => t.due_date && t.status !== "completada" && t.status !== "cancelada" && new Date(t.due_date) < new Date()).length,
    totalAssignments: assignments.length,
    totalConfirmed: assignments.filter((a) => a.confirmed).length,
    totalComments: comments.length,
    totalAttachments: attachments.length,
  }), [tasks, assignments, comments, attachments]);

  const completionRate = globalStats.total > 0 ? Math.round((globalStats.completada / globalStats.total) * 100) : 0;
  const confirmationRate = globalStats.totalAssignments > 0 ? Math.round((globalStats.totalConfirmed / globalStats.totalAssignments) * 100) : 0;

  // Filtered view
  const viewingUser = selectedUser === "all" ? null : profiles.find((p) => p.id === selectedUser);
  const viewStats = selectedUser === "all" ? null : userStats[selectedUser];

  // Rank users by score (completed * 3 + confirmed * 2 + comments + attachments)
  const rankedUsers = useMemo(() => {
    return profiles
      .filter((p) => userStats[p.id]?.assigned > 0)
      .map((p) => ({
        ...p,
        stats: userStats[p.id],
        score: (userStats[p.id].completed * 3) + (userStats[p.id].confirmed * 2) + userStats[p.id].comments + userStats[p.id].attachments,
      }))
      .sort((a, b) => b.score - a.score);
  }, [profiles, userStats]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-[var(--accent-cyan)]" /> Estadísticas y Colaboración
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {canViewAll ? "Rendimiento y participación de todo el equipo" : "Tu rendimiento y participación"}
          </p>
        </div>

        {canViewAll && (
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]">
            <option value="all">Vista global</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</option>)}
          </select>
        )}
      </div>

      {/* Global Stats Cards */}
      {(selectedUser === "all") && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Tareas", value: globalStats.total, icon: BarChart3, color: "text-white", border: "border-white/10" },
              { label: "Completadas", value: globalStats.completada, icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-400/20" },
              { label: "En Progreso", value: globalStats.en_progreso, icon: AlertTriangle, color: "text-blue-400", border: "border-blue-400/20" },
              { label: "Pendientes", value: globalStats.pendiente, icon: Clock, color: "text-amber-400", border: "border-amber-400/20" },
              { label: "Vencidas", value: globalStats.overdue, icon: XCircle, color: "text-red-400", border: "border-red-400/20" },
            ].map((s) => (
              <div key={s.label} className={`bg-white/5 border ${s.border} rounded-2xl p-4`}>
                <div className="flex items-center gap-2">
                  <s.icon size={16} className={s.color} />
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Tasa de Completitud</span>
                <span className="text-2xl font-bold text-emerald-400">{completionRate}%</span>
              </div>
              <ProgressBar value={globalStats.completada} max={globalStats.total} color="bg-emerald-400" />
              <p className="text-xs text-gray-600 mt-2">{globalStats.completada} de {globalStats.total} tareas completadas</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Tasa de Asistencia</span>
                <span className="text-2xl font-bold text-blue-400">{confirmationRate}%</span>
              </div>
              <ProgressBar value={globalStats.totalConfirmed} max={globalStats.totalAssignments} color="bg-blue-400" />
              <p className="text-xs text-gray-600 mt-2">{globalStats.totalConfirmed} de {globalStats.totalAssignments} asistencias confirmadas</p>
            </div>
          </div>

          {/* Team Ranking */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Award size={16} className="text-amber-400" /> Ranking del Equipo
            </h3>
            <div className="space-y-2">
              {rankedUsers.map((u, i) => {
                const s = u.stats;
                const attendanceRate = s.assigned > 0 ? Math.round((s.confirmed / s.assigned) * 100) : 0;
                return (
                  <div key={u.id} className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors">
                    <span className={`w-6 text-center font-bold text-sm ${i === 0 ? "text-amber-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                      {i + 1}
                    </span>
                    <Avatar src={u.avatar_url} name={u.full_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{u.full_name || "Sin nombre"}</p>
                      <p className="text-xs text-gray-500">{u.role}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1" title="Tareas completadas">
                        <CheckCircle2 size={12} className="text-emerald-400" /> {s.completed}
                      </span>
                      <span className="flex items-center gap-1" title="Asistencia">
                        <UserCheck size={12} className="text-blue-400" /> {attendanceRate}%
                      </span>
                      <span className="flex items-center gap-1" title="Comentarios">
                        <MessageSquare size={12} /> {s.comments}
                      </span>
                      <span className="flex items-center gap-1" title="Archivos">
                        <Paperclip size={12} /> {s.attachments}
                      </span>
                    </div>
                    <div className="w-20">
                      <ProgressBar value={s.confirmed} max={s.assigned} color="bg-[var(--accent-cyan)]" />
                    </div>
                  </div>
                );
              })}
              {rankedUsers.length === 0 && <p className="text-center text-gray-500 py-4">No hay datos de participación</p>}
            </div>
          </div>
        </>
      )}

      {/* Individual User View */}
      {viewingUser && viewStats && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
            <Avatar src={viewingUser.avatar_url} name={viewingUser.full_name} size={56} />
            <div>
              <h2 className="text-xl font-bold text-white">{viewingUser.full_name || "Sin nombre"}</h2>
              <p className="text-sm text-gray-400">{viewingUser.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Asignadas", value: viewStats.assigned, color: "text-white", icon: BarChart3 },
              { label: "Completadas", value: viewStats.completed, color: "text-emerald-400", icon: CheckCircle2 },
              { label: "Confirmadas", value: viewStats.confirmed, color: "text-blue-400", icon: UserCheck },
              { label: "Vencidas", value: viewStats.overdue, color: "text-red-400", icon: XCircle },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <s.icon size={14} className={s.color} />
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Tasa de Asistencia</span>
                <span className="text-2xl font-bold text-blue-400">
                  {viewStats.assigned > 0 ? Math.round((viewStats.confirmed / viewStats.assigned) * 100) : 0}%
                </span>
              </div>
              <ProgressBar value={viewStats.confirmed} max={viewStats.assigned} color="bg-blue-400" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Tasa de Completitud</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {viewStats.assigned > 0 ? Math.round((viewStats.completed / viewStats.assigned) * 100) : 0}%
                </span>
              </div>
              <ProgressBar value={viewStats.completed} max={viewStats.assigned} color="bg-emerald-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <MessageSquare size={24} className="text-gray-400 mx-auto" />
              <p className="text-2xl font-bold text-white mt-2">{viewStats.comments}</p>
              <p className="text-xs text-gray-500 mt-1">Comentarios</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <Paperclip size={24} className="text-gray-400 mx-auto" />
              <p className="text-2xl font-bold text-white mt-2">{viewStats.attachments}</p>
              <p className="text-xs text-gray-500 mt-1">Archivos Subidos</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <TrendingUp size={24} className="text-gray-400 mx-auto" />
              <p className="text-2xl font-bold text-white mt-2">{viewStats.tasksCreated}</p>
              <p className="text-xs text-gray-500 mt-1">Tareas Creadas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
