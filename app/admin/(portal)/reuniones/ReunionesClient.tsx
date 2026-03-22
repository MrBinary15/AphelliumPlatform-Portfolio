"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Video, Plus, Calendar, Clock, Users, Copy, Check, Trash2,
  Play, XCircle, UserPlus, Search,
  Lock, Unlock, Globe, Shield, Settings2, Mic, Camera,
  ChevronRight, Phone, MonitorUp, StopCircle,
} from "lucide-react";
import { createMeeting, cancelMeeting, deleteMeeting, endMeeting, inviteToMeeting, respondToInvitation, toggleMeetingPublic } from "./actions";

interface Meeting {
  id: string;
  slug: string;
  title: string;
  description: string;
  host_id: string;
  co_host_id: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  is_public: boolean;
  is_locked: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  meeting_id: string;
  status: string;
  meetings: Meeting;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface Props {
  initialMeetings: Meeting[];
  invitations: Invitation[];
  participatingIn: { meeting_id: string; meetings: Meeting }[];
  teamMembers: TeamMember[];
  currentUserId: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "Programada", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  active: { label: "En curso", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  finished: { label: "Finalizada", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
  cancelled: { label: "Cancelada", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function ScheduleCountdown({ date }: { date: string }) {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return <span className="text-green-400 text-[10px] font-medium">¡Ahora!</span>;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return <span className="text-blue-300 text-[10px]">En {days}d {hours % 24}h</span>;
  }
  return <span className="text-cyan-300 text-[10px]">En {hours}h {mins}min</span>;
}

export default function ReunionesClient({ initialMeetings, invitations, participatingIn, teamMembers, currentUserId }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "active" | "finished">("all");
  const [search, setSearch] = useState("");
  const [showInviteFor, setShowInviteFor] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMeetings = useMemo(() => {
    const participatingMeetings = participatingIn
      .map((p) => p.meetings)
      .filter((m) => !initialMeetings.some((im) => im.id === m.id));
    return [...initialMeetings, ...participatingMeetings];
  }, [initialMeetings, participatingIn]);

  const filteredMeetings = useMemo(() => {
    return allMeetings.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allMeetings, filter, search]);

  // Sort: active first, then planned (by scheduled date), then finished
  const sortedMeetings = useMemo(() => {
    return [...filteredMeetings].sort((a, b) => {
      const order: Record<string, number> = { active: 0, planned: 1, finished: 2, cancelled: 3 };
      const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
      if (diff !== 0) return diff;
      if (a.scheduled_at && b.scheduled_at) return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredMeetings]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const result = await createMeeting(formData);
    setCreating(false);
    if (result.success) {
      setShowCreate(false);
      router.refresh();
    }
  }

  async function handleCopyLink(slug: string, meetingId: string) {
    const url = `${window.location.origin}/admin/reuniones/sala/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(meetingId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCancel(meetingId: string) {
    if (!confirm("¿Cancelar esta reunión?")) return;
    await cancelMeeting(meetingId);
    router.refresh();
  }

  async function handleDelete(meetingId: string) {
    if (!confirm("¿Eliminar esta reunión permanentemente?")) return;
    await deleteMeeting(meetingId);
    router.refresh();
  }

  async function handleEnd(meetingId: string) {
    if (!confirm("¿Finalizar esta reunión?")) return;
    await endMeeting(meetingId);
    router.refresh();
  }

  async function handleCleanupFinished() {
    const finishedOrCancelled = allMeetings.filter(
      (m) => (m.status === "finished" || m.status === "cancelled") && m.host_id === currentUserId,
    );
    if (finishedOrCancelled.length === 0) return;
    if (!confirm(`¿Eliminar ${finishedOrCancelled.length} reuniones finalizadas/canceladas?`)) return;
    await Promise.all(finishedOrCancelled.map((m) => deleteMeeting(m.id)));
    router.refresh();
  }

  async function handleInvite(meetingId: string, userId: string) {
    setInviting(true);
    await inviteToMeeting(meetingId, userId);
    setInviting(false);
    setShowInviteFor(null);
  }

  async function handleRespondInvitation(invId: string, accept: boolean) {
    await respondToInvitation(invId, accept);
    router.refresh();
  }

  async function handleTogglePublic(meetingId: string, currentState: boolean) {
    await toggleMeetingPublic(meetingId, !currentState);
    router.refresh();
  }

  const stats = useMemo(() => ({
    total: allMeetings.length,
    planned: allMeetings.filter((m) => m.status === "planned").length,
    active: allMeetings.filter((m) => m.status === "active").length,
    finished: allMeetings.filter((m) => m.status === "finished").length,
  }), [allMeetings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/20">
              <Video className="text-[var(--accent-cyan)]" size={22} />
            </div>
            Reuniones
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">Gestiona videollamadas, llamadas de audio y reuniones programadas</p>
        </div>
        <div className="flex gap-2">
          {(stats.finished > 0 || allMeetings.some((m) => m.status === "cancelled")) && (
            <button
              onClick={handleCleanupFinished}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm"
              title="Eliminar reuniones finalizadas y canceladas"
            >
              <Trash2 size={16} /> Limpiar
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 transition-all text-sm shadow-lg shadow-cyan-500/20"
          >
            <Plus size={18} /> Nueva Reunión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Video, gradient: "from-cyan-500/10 to-cyan-600/5", iconColor: "text-cyan-400", border: "border-cyan-500/10" },
          { label: "Programadas", value: stats.planned, icon: Calendar, gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-400", border: "border-blue-500/10" },
          { label: "En curso", value: stats.active, icon: Play, gradient: "from-green-500/10 to-green-600/5", iconColor: "text-green-400", border: "border-green-500/10" },
          { label: "Finalizadas", value: stats.finished, icon: Clock, gradient: "from-gray-500/10 to-gray-600/5", iconColor: "text-gray-400", border: "border-gray-500/10" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-xl border ${s.border} p-4 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.iconColor} />
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Phone size={16} /> Llamadas / invitaciones pendientes
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">{inv.meetings?.title}</p>
                  <p className="text-xs text-gray-400">
                    {inv.meetings?.scheduled_at
                      ? new Date(inv.meetings.scheduled_at).toLocaleString("es-ES")
                      : "Llamada directa"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvitation(inv.id, true)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/30 border border-green-500/20 transition-all"
                  >
                    <Phone size={12} /> Aceptar
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.id, false)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar reuniones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "planned", "active", "finished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${filter === f
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "Todas" : STATUS_LABELS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de reuniones */}
      <div className="space-y-3">
        {sortedMeetings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Video size={28} className="opacity-30" />
            </div>
            <p className="text-lg font-medium">No hay reuniones</p>
            <p className="text-sm mt-1 text-gray-500">Crea una nueva reunión para comenzar</p>
          </div>
        ) : (
          sortedMeetings.map((meeting) => {
            const isHost = meeting.host_id === currentUserId;
            const isCoHost = meeting.co_host_id === currentUserId;
            const canManage = isHost || isCoHost;
            const status = STATUS_LABELS[meeting.status] || STATUS_LABELS.planned;
            const canJoin = meeting.status === "planned" || meeting.status === "active";
            const isActive = meeting.status === "active";
            const isExpanded = expandedId === meeting.id;

            return (
              <div
                key={meeting.id}
                className={`rounded-xl border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green-500/5 to-cyan-500/5 border-green-500/20 shadow-lg shadow-green-500/5"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-white truncate">{meeting.title}</h3>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.bg} ${status.color}`}>
                          {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1 align-middle" />}
                          {status.label}
                        </span>
                        {isHost && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                            Anfitrión
                          </span>
                        )}
                        {isCoHost && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20">
                            Co-anfitrión
                          </span>
                        )}
                        {meeting.is_public && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <Globe size={8} className="inline mr-0.5" /> Pública
                          </span>
                        )}
                        {meeting.is_locked && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                            <Lock size={8} className="inline mr-0.5" /> Privada
                          </span>
                        )}
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-gray-400 line-clamp-1 mt-1">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {meeting.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(meeting.scheduled_at).toLocaleString("es-ES", {
                              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        )}
                        {meeting.scheduled_at && meeting.status === "planned" && (
                          <ScheduleCountdown date={meeting.scheduled_at} />
                        )}
                        <span className="text-gray-600">{timeAgo(meeting.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canJoin && (
                        <button
                          onClick={() => router.push(`/admin/reuniones/sala/${meeting.slug}`)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                            isActive
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20 hover:brightness-110"
                              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 hover:brightness-110"
                          }`}
                        >
                          {isActive ? <Phone size={16} /> : <Video size={16} />}
                          {isActive ? "Unirse ahora" : "Iniciar"}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLink(meeting.slug, meeting.id)}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Copiar enlace"
                      >
                        {copiedId === meeting.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>

                      {/* Quick end button for active meetings */}
                      {canManage && isActive && (
                        <button
                          onClick={() => handleEnd(meeting.id)}
                          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                          title="Finalizar reunión"
                        >
                          <StopCircle size={16} />
                        </button>
                      )}

                      {/* Quick delete for finished/cancelled */}
                      {canManage && (meeting.status === "finished" || meeting.status === "cancelled") && (
                        <button
                          onClick={() => handleDelete(meeting.id)}
                          className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                          title="Eliminar reunión"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {canManage && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isExpanded ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                          }`}
                          title="Opciones"
                        >
                          <Settings2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded management panel */}
                {isExpanded && canManage && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-white/5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      <button
                        onClick={() => setShowInviteFor(showInviteFor === meeting.id ? null : meeting.id)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-all"
                      >
                        <UserPlus size={14} /> Invitar
                      </button>
                      <button
                        onClick={() => handleTogglePublic(meeting.id, meeting.is_public)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-all"
                      >
                        {meeting.is_public ? <Shield size={14} className="text-red-400" /> : <Globe size={14} className="text-green-400" />}
                        {meeting.is_public ? "Hacer privada" : "Hacer pública"}
                      </button>
                      {canJoin && (
                        <button
                          onClick={() => handleCancel(meeting.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <XCircle size={14} /> Cancelar
                        </button>
                      )}
                      {(meeting.status === "finished" || meeting.status === "cancelled") && (
                        <button
                          onClick={() => handleDelete(meeting.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      )}
                    </div>

                    {/* Invite dropdown */}
                    {showInviteFor === meeting.id && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-gray-400 mb-2">Invitar miembros del equipo:</p>
                        <div className="flex flex-wrap gap-2">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              disabled={inviting}
                              onClick={() => handleInvite(meeting.id, member.id)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-cyan-500/20 disabled:opacity-50 transition-all"
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  (member.full_name || "?")[0].toUpperCase()
                                )}
                              </div>
                              {member.full_name || "Sin nombre"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Crear Reunión */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 px-6 py-4 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Video className="text-cyan-400" size={18} />
                </div>
                Nueva Reunión
              </h2>
              <p className="text-xs text-gray-400 mt-1">Crea una videollamada o reunión programada</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Título *</label>
                <input
                  name="title"
                  required
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="Ej: Revisión semanal del equipo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder="Opcional: agenda o descripción"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Fecha y hora</label>
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Co-anfitrión</label>
                  <select
                    name="co_host_id"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="">Ninguno</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick feature indicators */}
              <div className="flex items-center gap-3 py-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Mic size={10} /> Audio</span>
                <span className="flex items-center gap-1"><Camera size={10} /> Video</span>
                <span className="flex items-center gap-1"><MonitorUp size={10} /> Pantalla</span>
                <span className="flex items-center gap-1"><Users size={10} /> Chat</span>
                <span className="text-gray-600">— incluido por defecto</span>
              </div>

              {/* Connection type */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2.5">Tipo de conexión</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 transition-all has-[:checked]:border-cyan-500/40 has-[:checked]:bg-cyan-500/5">
                    <input type="radio" name="use_metered" value="" defaultChecked className="mt-1 accent-cyan-500" />
                    <div>
                      <p className="text-sm font-medium text-white">Normal (P2P)</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Conexión directa. Funciona bien en redes abiertas.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:border-blue-500/20 transition-all has-[:checked]:border-blue-500/40 has-[:checked]:bg-blue-500/5">
                    <input type="radio" name="use_metered" value="1" className="mt-1 accent-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Globe size={12} className="text-blue-400" /> Metered
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Usa servidor TURN. Mejor conexión en redes restrictivas.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 disabled:opacity-50 transition-all text-sm shadow-lg shadow-cyan-500/20"
                >
                  {creating ? "Creando..." : "Crear Reunión"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
