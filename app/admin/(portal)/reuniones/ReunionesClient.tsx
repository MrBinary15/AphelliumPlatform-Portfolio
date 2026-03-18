"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Video, Plus, Calendar, Clock, Users, Copy, Check, Trash2,
  Play, XCircle, Link2, UserPlus, ChevronDown, Search, Filter
} from "lucide-react";
import { createMeeting, cancelMeeting, deleteMeeting, inviteToMeeting, respondToInvitation } from "./actions";

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Programada", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  active: { label: "En curso", color: "text-green-400 bg-green-500/10 border-green-500/20" },
  finished: { label: "Finalizada", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  cancelled: { label: "Cancelada", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function ReunionesClient({ initialMeetings, invitations, participatingIn, teamMembers, currentUserId }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "active" | "finished">("all");
  const [search, setSearch] = useState("");
  const [showInviteFor, setShowInviteFor] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

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
            <Video className="text-[var(--accent-cyan)]" size={28} />
            Reuniones
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Gestiona y participa en videollamadas con tu equipo</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-black font-semibold hover:brightness-110 transition-all text-sm"
        >
          <Plus size={18} /> Nueva Reunión
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Video, color: "cyan" },
          { label: "Programadas", value: stats.planned, icon: Calendar, color: "blue" },
          { label: "En curso", value: stats.active, icon: Play, color: "green" },
          { label: "Finalizadas", value: stats.finished, icon: Clock, color: "gray" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={16} className={`text-${s.color}-400`} />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <UserPlus size={16} /> Invitaciones pendientes
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-white">{inv.meetings?.title}</p>
                  <p className="text-xs text-gray-400">
                    {inv.meetings?.scheduled_at
                      ? new Date(inv.meetings.scheduled_at).toLocaleString("es-ES")
                      : "Sin fecha programada"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondInvitation(inv.id, true)} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30">
                    Aceptar
                  </button>
                  <button onClick={() => handleRespondInvitation(inv.id, false)} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30">
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]/50"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "planned", "active", "finished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${filter === f
                ? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30"
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
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Video size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No hay reuniones</p>
            <p className="text-sm mt-1">Crea una nueva reunión para comenzar</p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const isHost = meeting.host_id === currentUserId;
            const isCoHost = meeting.co_host_id === currentUserId;
            const status = STATUS_LABELS[meeting.status] || STATUS_LABELS.planned;
            const canJoin = meeting.status === "planned" || meeting.status === "active";

            return (
              <div key={meeting.id} className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-5 hover:border-white/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">{meeting.title}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
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
                    </div>
                    {meeting.description && (
                      <p className="text-sm text-gray-400 line-clamp-1 mt-1">{meeting.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {meeting.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(meeting.scheduled_at).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(meeting.created_at).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canJoin && (
                      <button
                        onClick={() => router.push(`/admin/reuniones/sala/${meeting.slug}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-black text-sm font-semibold hover:brightness-110 transition-all"
                      >
                        <Video size={16} /> Unirse
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyLink(meeting.slug, meeting.id)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copiar enlace"
                    >
                      {copiedId === meeting.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                    {isHost && (
                      <>
                        <button
                          onClick={() => setShowInviteFor(showInviteFor === meeting.id ? null : meeting.id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Invitar"
                        >
                          <UserPlus size={16} />
                        </button>
                        {canJoin && (
                          <button onClick={() => handleCancel(meeting.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Cancelar">
                            <XCircle size={16} />
                          </button>
                        )}
                        {(meeting.status === "finished" || meeting.status === "cancelled") && (
                          <button onClick={() => handleDelete(meeting.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Invite dropdown */}
                {showInviteFor === meeting.id && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Invitar miembros del equipo:</p>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map((member) => (
                        <button
                          key={member.id}
                          disabled={inviting}
                          onClick={() => handleInvite(meeting.id, member.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">
                            {(member.full_name || "?")[0].toUpperCase()}
                          </div>
                          {member.full_name || "Sin nombre"}
                        </button>
                      ))}
                    </div>
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
          <div className="w-full max-w-lg bg-[#0a0f1a] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Video className="text-[var(--accent-cyan)]" size={22} /> Nueva Reunión
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
                <input
                  name="title"
                  required
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]/50"
                  placeholder="Ej: Revisión semanal del equipo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]/50 resize-none"
                  placeholder="Opcional: descripción de la reunión"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fecha y hora (opcional)</label>
                <input
                  name="scheduled_at"
                  type="datetime-local"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Co-anfitrión (opcional)</label>
                <select
                  name="co_host_id"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]/50"
                >
                  <option value="">Sin co-anfitrión</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || "Sin nombre"} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-black font-semibold hover:brightness-110 disabled:opacity-50 transition-all text-sm"
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
