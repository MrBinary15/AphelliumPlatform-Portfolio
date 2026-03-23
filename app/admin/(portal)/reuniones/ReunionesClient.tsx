"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Video, Plus, Calendar, Clock, Users, Copy, Check, Trash2,
  Play, XCircle, UserPlus, Search,
  Lock, Unlock, Globe, Shield, Settings2, Mic, Camera,
  ChevronRight, Phone, MonitorUp, StopCircle, Shuffle, KeyRound, Eye, EyeOff,
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
  access_code: string | null;
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
  userRole: string;
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

export default function ReunionesClient({ initialMeetings, invitations, participatingIn, teamMembers, currentUserId, userRole }: Props) {
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "active" | "finished">("all");
  const [search, setSearch] = useState("");
  const [createPublic, setCreatePublic] = useState(false);
  const [requireCode, setRequireCode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [codeMode, setCodeMode] = useState<"random" | "custom">("random");
  const [generatedCodePreview, setGeneratedCodePreview] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [showInviteFor, setShowInviteFor] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function generateAccessCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

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
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createMeeting(formData);
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    if (result.success) {
      setShowCreate(false);
      setCreateError(null);
      setCreatePublic(false);
      setRequireCode(false);
      setCustomCode("");
      setCodeMode("random");
      setGeneratedCodePreview("");
      setRequireApproval(false);
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
    const result = await cancelMeeting(meetingId);
    if (result.error) { alert(result.error); return; }
    router.refresh();
  }

  async function handleDelete(meetingId: string) {
    if (!confirm("¿Eliminar esta reunión permanentemente?")) return;
    const result = await deleteMeeting(meetingId);
    if (result.error) { alert(result.error); return; }
    router.refresh();
  }

  async function handleEnd(meetingId: string) {
    if (!confirm("¿Finalizar esta reunión?")) return;
    const result = await endMeeting(meetingId);
    if (result.error) { alert(result.error); return; }
    router.refresh();
  }

  async function handleCleanupFinished() {
    const finishedOrCancelled = allMeetings.filter(
      (m) => (m.status === "finished" || m.status === "cancelled") && (isAdmin || m.host_id === currentUserId),
    );
    if (finishedOrCancelled.length === 0) return;
    if (!confirm(`¿Eliminar ${finishedOrCancelled.length} reuniones finalizadas/canceladas?`)) return;
    const results = await Promise.all(finishedOrCancelled.map((m) => deleteMeeting(m.id)));
    const failed = results.filter((r) => r.error);
    if (failed.length > 0) alert(`${failed.length} no se pudieron eliminar`);
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
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/15 shadow-lg shadow-cyan-500/5">
              <Video className="text-[var(--accent-cyan)]" size={22} />
            </div>
            Reuniones
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">Gestiona videollamadas, llamadas de audio y reuniones programadas</p>
        </div>
        <div className="flex gap-2.5">
          {(stats.finished > 0 || allMeetings.some((m) => m.status === "cancelled")) && (
            <button
              onClick={handleCleanupFinished}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all text-sm active:scale-95"
              title="Eliminar reuniones finalizadas y canceladas"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="btn-premium flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 transition-all text-sm shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Plus size={18} /> Nueva Reunión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        {[
          { label: "Total", value: stats.total, icon: Video, gradient: "from-cyan-500/8 to-cyan-600/3", iconColor: "text-cyan-400", border: "border-cyan-500/8", glow: "shadow-cyan-500/5" },
          { label: "Programadas", value: stats.planned, icon: Calendar, gradient: "from-blue-500/8 to-blue-600/3", iconColor: "text-blue-400", border: "border-blue-500/8", glow: "shadow-blue-500/5" },
          { label: "En curso", value: stats.active, icon: Play, gradient: "from-green-500/8 to-green-600/3", iconColor: "text-green-400", border: "border-green-500/8", glow: "shadow-green-500/5" },
          { label: "Finalizadas", value: stats.finished, icon: Clock, gradient: "from-gray-500/8 to-gray-600/3", iconColor: "text-gray-400", border: "border-gray-500/8", glow: "shadow-gray-500/5" },
        ].map((s) => (
          <div key={s.label} className={`animate-fade-in-up bg-gradient-to-br ${s.gradient} rounded-2xl border ${s.border} p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${s.glow}`}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`w-8 h-8 rounded-xl ${s.gradient.replace('from-', 'bg-gradient-to-br from-').replace('/8', '/15').replace('/3', '/8')} flex items-center justify-center`}>
                <s.icon size={15} className={s.iconColor} />
              </div>
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border-amber-500/15 animate-fade-in-up">
          <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Phone size={13} className="text-amber-400" />
            </div>
            Llamadas / invitaciones pendientes
            <span className="ml-auto text-[10px] text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded-full">{invitations.length}</span>
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                <div>
                  <p className="text-sm font-medium text-white">{inv.meetings?.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inv.meetings?.scheduled_at
                      ? new Date(inv.meetings.scheduled_at).toLocaleString("es-ES")
                      : "Llamada directa"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvitation(inv.id, true)}
                    className="btn-premium flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 border border-green-500/15 transition-all active:scale-95"
                  >
                    <Phone size={12} /> Aceptar
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.id, false)}
                    className="px-3.5 py-2 rounded-xl bg-red-500/8 text-red-400 text-xs font-medium hover:bg-red-500/15 border border-red-500/10 transition-all active:scale-95"
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
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="relative flex-1 group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Buscar reuniones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/30 focus:shadow-[0_0_20px_rgba(6,182,212,0.05)] transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "planned", "active", "finished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-medium border transition-all duration-200 active:scale-95 ${filter === f
                ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20 shadow-sm shadow-cyan-500/10"
                : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.05] hover:text-gray-300"
              }`}
            >
              {f === "all" ? "Todas" : STATUS_LABELS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de reuniones */}
      <div className="space-y-3 stagger-children">
        {sortedMeetings.length === 0 ? (
          <div className="text-center py-20 text-gray-400 animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <Video size={32} className="opacity-20" />
            </div>
            <p className="text-lg font-semibold text-gray-300">No hay reuniones</p>
            <p className="text-sm mt-1.5 text-gray-500">Crea una nueva reunión para comenzar</p>
          </div>
        ) : (
          sortedMeetings.map((meeting) => {
            const isHost = meeting.host_id === currentUserId;
            const isCoHost = meeting.co_host_id === currentUserId;
            const canManage = isHost || isCoHost || isAdmin;
            const status = STATUS_LABELS[meeting.status] || STATUS_LABELS.planned;
            const canJoin = meeting.status === "planned" || meeting.status === "active";
            const isActive = meeting.status === "active";
            const isExpanded = expandedId === meeting.id;
            const hostMember = teamMembers.find((m) => m.id === meeting.host_id);
            const hostName = isHost ? "Tú" : (hostMember?.full_name || "Usuario");
            const shortId = meeting.slug.slice(0, 8);

            return (
              <div
                key={meeting.id}
                className={`group/card rounded-2xl border transition-all duration-300 animate-fade-in-up ${
                  isActive
                    ? "bg-gradient-to-br from-green-500/[0.06] via-emerald-500/[0.03] to-cyan-500/[0.06] border-green-500/25 shadow-lg shadow-green-500/[0.08] hover:shadow-xl hover:shadow-green-500/[0.12]"
                    : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.14] hover:shadow-lg hover:shadow-black/20"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <h3 className="text-lg font-bold text-white truncate group-hover/card:text-cyan-50 transition-colors">{meeting.title}</h3>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${status.bg} ${status.color}`}>
                          {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1 align-middle" />}
                          {status.label}
                        </span>
                        {isHost && (
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                            Anfitrión
                          </span>
                        )}
                        {isCoHost && (
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20">
                            Co-anfitrión
                          </span>
                        )}
                        {meeting.is_public && (
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <Globe size={8} className="inline mr-0.5" /> Pública
                          </span>
                        )}
                        {meeting.is_locked && (
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                            <Lock size={8} className="inline mr-0.5" /> Privada
                          </span>
                        )}
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-gray-400 line-clamp-1 mt-1">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]" title={`ID: ${meeting.slug}`}>
                          #{shortId}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={11} className="text-gray-600" /> {hostName}
                        </span>
                        {meeting.scheduled_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-600" />
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
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 shadow-lg active:scale-95 ${
                            isActive
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
                              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110"
                          }`}
                        >
                          {isActive ? <Phone size={16} /> : <Video size={16} />}
                          {isActive ? "Unirse ahora" : "Iniciar"}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLink(meeting.slug, meeting.id)}
                        className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 active:scale-90"
                        title="Copiar enlace"
                      >
                        {copiedId === meeting.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>

                      {/* Quick end button for active meetings */}
                      {canManage && isActive && (
                        <button
                          onClick={() => handleEnd(meeting.id)}
                          className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all duration-200 active:scale-90"
                          title="Finalizar reunión"
                        >
                          <StopCircle size={16} />
                        </button>
                      )}

                      {/* Quick delete for finished/cancelled — or any status for admin */}
                      {canManage && (isAdmin || meeting.status === "finished" || meeting.status === "cancelled") && (
                        <button
                          onClick={() => handleDelete(meeting.id)}
                          className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 active:scale-90"
                          title="Eliminar reunión"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {canManage && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                          className={`p-2.5 rounded-2xl border transition-all duration-200 active:scale-90 ${
                            isExpanded ? "bg-white/10 border-white/20 text-white shadow-inner" : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08]"
                          }`}
                          title="Opciones"
                        >
                          <Settings2 size={16} className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded management panel */}
                {isExpanded && canManage && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-white/[0.05] animate-fade-in-up">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      <button
                        onClick={() => setShowInviteFor(showInviteFor === meeting.id ? null : meeting.id)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-gray-300 hover:bg-white/[0.07] hover:border-cyan-500/20 transition-all duration-200 active:scale-95"
                      >
                        <UserPlus size={14} className="text-cyan-400" /> Invitar
                      </button>
                      <button
                        onClick={() => handleTogglePublic(meeting.id, meeting.is_public)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-gray-300 hover:bg-white/[0.07] transition-all duration-200 active:scale-95"
                      >
                        {meeting.is_public ? <Shield size={14} className="text-red-400" /> : <Globe size={14} className="text-green-400" />}
                        {meeting.is_public ? "Hacer privada" : "Hacer pública"}
                      </button>
                      {canJoin && (
                        <button
                          onClick={() => handleCancel(meeting.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.12] text-xs font-medium text-red-400 hover:bg-red-500/[0.12] transition-all duration-200 active:scale-95"
                        >
                          <XCircle size={14} /> Cancelar
                        </button>
                      )}
                      {(isAdmin || meeting.status === "finished" || meeting.status === "cancelled") && (
                        <button
                          onClick={() => handleDelete(meeting.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.12] text-xs font-medium text-red-400 hover:bg-red-500/[0.12] transition-all duration-200 active:scale-95"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      )}
                    </div>

                    {/* Invite dropdown */}
                    {showInviteFor === meeting.id && (
                      <div className="mt-3 pt-3 border-t border-white/[0.05] animate-fade-in-up">
                        <p className="text-xs text-gray-400 mb-2.5 font-medium">Invitar miembros del equipo:</p>
                        <div className="flex flex-wrap gap-2">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              disabled={inviting}
                              onClick={() => handleInvite(meeting.id, member.id)}
                              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-300 hover:bg-white/[0.07] hover:border-cyan-500/25 disabled:opacity-40 transition-all duration-200 active:scale-95"
                            >
                              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-[10px] font-bold text-white border border-white/10 overflow-hidden">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in-up">
          <div className="w-full max-w-lg my-4 sm:my-6 bg-gradient-to-b from-[#0c1220] to-[#080d18] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col max-h-[calc(100dvh-2rem)]">
            <div className="bg-gradient-to-r from-cyan-500/[0.08] to-blue-600/[0.08] px-6 py-5 border-b border-white/[0.05]">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
                  <Video className="text-cyan-400" size={20} />
                </div>
                Nueva Reunión
              </h2>
              <p className="text-xs text-gray-400 mt-1.5 ml-[52px]">Crea una videollamada o reunión programada</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-scroll pr-2 flex-1 min-h-0 meeting-scrollbar" style={{ scrollbarGutter: "stable" }}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Título *</label>
                <input
                  name="title"
                  required
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.08)] transition-all duration-200"
                  placeholder="Ej: Revisión semanal del equipo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.08)] resize-none transition-all duration-200"
                  placeholder="Opcional: agenda o descripción"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Fecha y hora</label>
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.08)] transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Co-anfitrión</label>
                  <select
                    name="co_host_id"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.08)] transition-all duration-200"
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

              {/* Visibility: Public / Private */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2.5">Visibilidad</label>
                <input type="hidden" name="is_public" value={createPublic ? "1" : ""} />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreatePublic(true)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 text-left ${
                      createPublic
                        ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-lg shadow-emerald-500/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    }`}
                  >
                    <Eye size={16} className={createPublic ? "text-emerald-400 mt-0.5" : "text-gray-500 mt-0.5"} />
                    <div>
                      <p className="text-sm font-semibold text-white">Pública</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Cualquier miembro del equipo puede ver y unirse.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePublic(false)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 text-left ${
                      !createPublic
                        ? "border-amber-500/40 bg-amber-500/[0.06] shadow-lg shadow-amber-500/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    }`}
                  >
                    <EyeOff size={16} className={!createPublic ? "text-amber-400 mt-0.5" : "text-gray-500 mt-0.5"} />
                    <div>
                      <p className="text-sm font-semibold text-white">Privada</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Solo invitados y el anfitrión pueden acceder.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Access code */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <KeyRound size={14} className="text-gray-400" /> Código de acceso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !requireCode;
                      setRequireCode(next);
                      if (next && codeMode === "random") {
                        setGeneratedCodePreview((prev) => prev || generateAccessCode());
                      }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${requireCode ? "bg-cyan-500" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${requireCode ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <input type="hidden" name="require_code" value={requireCode ? "1" : ""} />
                {requireCode && codeMode === "random" && (
                  <input type="hidden" name="access_code" value={generatedCodePreview} />
                )}
                {requireCode && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-white/[0.05]">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeMode("random");
                          setCustomCode("");
                          setGeneratedCodePreview((prev) => prev || generateAccessCode());
                        }}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                          codeMode === "random"
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                            : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15]"
                        }`}
                      >
                        <Shuffle size={12} /> Aleatorio
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeMode("custom")}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                          codeMode === "custom"
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                            : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15]"
                        }`}
                      >
                        <KeyRound size={12} /> Personalizado
                      </button>
                    </div>
                    {codeMode === "random" ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5">
                        <p className="text-[11px] text-gray-400 mb-1">Código que se usará al crear:</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono tracking-widest text-amber-300 text-sm font-bold">{generatedCodePreview || "------"}</p>
                          <button
                            type="button"
                            onClick={() => setGeneratedCodePreview(generateAccessCode())}
                            className="text-[10px] text-amber-300/90 hover:text-amber-200 transition-colors"
                          >
                            Regenerar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        name="access_code"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                        maxLength={20}
                        minLength={4}
                        placeholder="Escribe el código (4-20 caracteres)"
                        className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-mono tracking-widest placeholder:text-gray-500 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.08)] transition-all duration-200"
                      />
                    )}
                  </div>
                )}
                {!requireCode && (
                  <p className="text-[11px] text-gray-500">Actívalo para exigir un código antes de unirse a la reunión.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Shield size={14} className="text-gray-400" /> Aprobación de ingreso
                  </label>
                  <button
                    type="button"
                    onClick={() => setRequireApproval(!requireApproval)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${requireApproval ? "bg-cyan-500" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${requireApproval ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <input type="hidden" name="require_approval" value={requireApproval ? "1" : ""} />
                <p className="text-[11px] text-gray-500">
                  {requireApproval
                    ? "Los participantes deberán solicitar acceso y el anfitrión/co-anfitrión deberá aprobar su ingreso."
                    : "Si está desactivado, cualquiera con acceso permitido entra directamente."}
                </p>
              </div>

              {/* Quick feature indicators */}
              <div className="flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Mic size={10} className="text-gray-600" /> Audio</span>
                <span className="flex items-center gap-1"><Camera size={10} className="text-gray-600" /> Video</span>
                <span className="flex items-center gap-1"><MonitorUp size={10} className="text-gray-600" /> Pantalla</span>
                <span className="flex items-center gap-1"><Users size={10} className="text-gray-600" /> Chat</span>
                <span className="text-gray-600 ml-auto">incluido por defecto</span>
              </div>

              {/* Connection type */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2.5">Tipo de conexión</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] cursor-pointer hover:border-white/[0.15] transition-all duration-200 has-[:checked]:border-cyan-500/40 has-[:checked]:bg-cyan-500/[0.06] has-[:checked]:shadow-lg has-[:checked]:shadow-cyan-500/[0.06]">
                    <input type="radio" name="use_metered" value="" defaultChecked className="mt-1 accent-cyan-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">Normal (P2P)</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Conexión directa. Funciona bien en redes abiertas.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] cursor-pointer hover:border-blue-500/20 transition-all duration-200 has-[:checked]:border-blue-500/40 has-[:checked]:bg-blue-500/[0.06] has-[:checked]:shadow-lg has-[:checked]:shadow-blue-500/[0.06]">
                    <input type="radio" name="use_metered" value="1" className="mt-1 accent-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Globe size={12} className="text-blue-400" /> Metered
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Usa servidor TURN. Mejor conexión en redes restrictivas.</p>
                    </div>
                  </label>
                </div>
              </div>

              {createError && (
                <div className="px-4 py-3 rounded-2xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-xs font-medium">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:brightness-110 disabled:opacity-50 transition-all duration-200 text-sm shadow-lg shadow-cyan-500/25 active:scale-[0.98]"
                >
                  {creating ? "Creando..." : "Crear Reunión"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setCreatePublic(false);
                    setRequireCode(false);
                    setCustomCode("");
                    setCodeMode("random");
                    setGeneratedCodePreview("");
                    setRequireApproval(false);
                  }}
                  className="px-6 py-3 rounded-2xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.05] transition-all duration-200 text-sm font-medium"
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
