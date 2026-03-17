"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, Pause, XCircle, Calendar, Users,
  Paperclip, MessageSquare, Send, Smile, Trash2, Download, FileText, Image as ImageIcon,
  Film, Loader2, UserCheck, X, Check, ChevronDown, ChevronUp,
  Settings, Hash, Reply, Upload, Play, MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  updateTask, deleteTask, confirmAttendance, addComment, addCommentWithFiles, deleteComment,
  toggleReaction, uploadAttachment, deleteAttachment, updateTaskAssignees
} from "../actions";
import type { Role } from "@/utils/roles";

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role?: string | null };
type Assignment = { id: string; user_id: string; confirmed: boolean; confirmed_at?: string | null; user: Profile };
type Reaction = { id: string; emoji: string; user_id: string };
type Comment = {
  id: string; content: string; parent_id: string | null; created_at: string; updated_at: string;
  user: Profile; task_comment_reactions: Reaction[];
};
type Attachment = { id: string; file_url: string; file_name: string; file_type: string | null; file_size: number | null; created_at: string; user: Profile };
type Activity = { id: string; action: string; details: Record<string, unknown> | null; created_at: string; user: Profile };

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

const REACTIONS = ["👍", "❤️", "🔥", "👏", "😊", "🎉", "💡", "✅"];

function Avatar({ src, name, size = 32 }: { src: string | null; name: string | null; size?: number }) {
  if (src) return <Image src={src} alt={name || ""} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400" style={{ width: size, height: size }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return formatDate(d);
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACTION_LABELS: Record<string, string> = {
  created: "creó la tarea",
  updated: "actualizó la tarea",
  assignees_updated: "actualizó los asignados",
  attendance_confirmed: "confirmó asistencia",
  attachment_uploaded: "subió un archivo",
};

// ────────────────────────────────────────────────────
// Main Component — Forum Layout
// ────────────────────────────────────────────────────
export default function TaskDetailClient({
  task, assignments, comments, attachments, activity, profiles,
  currentUserId, currentRole, canManage, mustAcceptBeforeInternalAccess, taskRoom,
}: {
  task: { id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; created_at: string; updated_at: string; started_at: string | null; completed_at: string | null; created_by: string; creator: Profile };
  assignments: Assignment[]; comments: Comment[]; attachments: Attachment[]; activity: Activity[];
  profiles: Profile[]; currentUserId: string; currentRole: Role; canManage: boolean;
  mustAcceptBeforeInternalAccess: boolean;
  taskRoom: { id: string; name: string } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [newComment, setNewComment] = useState("");
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showAssigneeEditor, setShowAssigneeEditor] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState(assignments.map((a) => a.user_id));
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"info" | "members" | "files" | "activity">("info");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newCommentFileRef = useRef<HTMLInputElement>(null);
  const [newCommentFiles, setNewCommentFiles] = useState<File[]>([]);
  const [taskRoomId, setTaskRoomId] = useState<string | null>(taskRoom?.id || null);

  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const StatusIcon = sc.icon;
  const isAssigned = assignments.some((a) => a.user_id === currentUserId);
  const myAssignment = assignments.find((a) => a.user_id === currentUserId);
  const confirmed = assignments.filter((a) => a.confirmed).length;
  const overdue = task.due_date && !["completada", "cancelada"].includes(task.status) && new Date(task.due_date) < new Date();

  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const mediaFiles = useMemo(() => attachments.filter((a) => a.file_type?.startsWith("image/") || a.file_type?.startsWith("video/")), [attachments]);
  const docFiles = useMemo(() => attachments.filter((a) => !a.file_type?.startsWith("image/") && !a.file_type?.startsWith("video/")), [attachments]);

  const currentUser = profiles.find((p) => p.id === currentUserId);

  function openTaskChat() {
    if (!taskRoomId) return;
    window.dispatchEvent(new CustomEvent("aphellium-open-chat-room", { detail: { roomId: taskRoomId } }));
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => { await updateTask(task.id, formData); setShowEditPanel(false); });
  }
  function handleDelete() {
    if (!confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) return;
    startTransition(async () => { await deleteTask(task.id); window.location.href = "/admin/tareas"; });
  }
  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmAttendance(task.id);
      if (result?.roomId) setTaskRoomId(result.roomId);
      if (result?.error) alert(result.error);
    });
  }
  function handleNewComment() {
    if (!newComment.trim() && newCommentFiles.length === 0) return;
    startTransition(async () => {
      if (newCommentFiles.length > 0) {
        const fd = new FormData();
        fd.append("content", newComment);
        for (const f of newCommentFiles) fd.append("files", f);
        const res = await addCommentWithFiles(task.id, fd);
        if (res?.error) alert(res.error);
      } else {
        await addComment(task.id, newComment);
      }
      setNewComment("");
      setNewCommentFiles([]);
    });
  }
  function handleReply(content: string, parentId: string, files: File[] = []) {
    if (!content.trim() && files.length === 0) return;
    startTransition(async () => {
      if (files.length > 0) {
        const fd = new FormData();
        fd.append("content", content);
        fd.append("parentId", parentId);
        for (const f of files) fd.append("files", f);
        const res = await addCommentWithFiles(task.id, fd);
        if (res?.error) alert(res.error);
      } else {
        await addComment(task.id, content, parentId);
      }
    });
  }
  function handleNewCommentFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setNewCommentFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  }
  function handleDeleteComment(commentId: string) {
    startTransition(async () => { await deleteComment(commentId, task.id); });
  }
  function handleReaction(commentId: string, emoji: string) {
    startTransition(async () => { await toggleReaction(commentId, emoji, task.id); });
    setShowReactions(null);
  }
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      startTransition(async () => { await uploadAttachment(task.id, fd); });
    }
    e.target.value = "";
  }
  function handleDeleteAttachment(id: string) {
    startTransition(async () => { await deleteAttachment(id, task.id); });
  }
  function handleSaveAssignees() {
    startTransition(async () => { await updateTaskAssignees(task.id, selectedAssignees); setShowAssigneeEditor(false); });
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/admin/tareas" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Volver a Tareas
        </Link>
        <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs flex items-center gap-1.5">
          <Settings size={14} /> {showSidebar ? "Ocultar panel" : "Ver panel"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* ═══ MAIN SOCIAL FEED ═══ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ─── Original Post Card ─── */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Post header */}
            <div className="px-5 pt-4 pb-3 flex items-start gap-3">
              <Avatar src={task.creator?.avatar_url} name={task.creator?.full_name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{task.creator?.full_name || "?"}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{relativeTime(task.created_at)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 uppercase tracking-wider">Creador</span>
                </div>
                <h1 className="text-lg font-bold text-white mt-1 leading-snug">{task.title}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.bg} ${sc.color}`}>
                    <StatusIcon size={10} className="inline mr-1" />{sc.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pc.color}`}>{pc.label}</span>
                  {overdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-red-400 bg-red-400/10 border border-red-400/20">Vencida</span>}
                  {task.due_date && (
                    <span className={`text-[11px] flex items-center gap-1 ${overdue ? "text-red-400" : "text-gray-500"}`}>
                      <Calendar size={11} /> {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setShowEditPanel(!showEditPanel)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors" title="Editar">
                    <Settings size={15} />
                  </button>
                  <button onClick={handleDelete} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-colors" title="Eliminar">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="px-5 pb-4">
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed
                  [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_img]:my-3
                  [&_video]:rounded-xl [&_video]:my-3 [&_video]:max-w-full
                  [&_a]:text-[var(--accent-cyan)] [&_a]:no-underline [&_a:hover]:underline
                  [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent-cyan)]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400
                  [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              </div>
            )}

            {/* Post stats bar */}
            <div className="mx-5 border-t border-white/[0.06] py-2.5 flex items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><MessageSquare size={13} /> {comments.length} comentarios</span>
              <span className="flex items-center gap-1.5"><Paperclip size={13} /> {attachments.length} archivos</span>
              <span className="flex items-center gap-1.5"><Users size={13} /> {confirmed}/{assignments.length} confirmados</span>
            </div>

            {/* Edit Panel (inline) */}
            {showEditPanel && canManage && (
              <div className="mx-5 mb-4 bg-black/20 rounded-xl p-4 border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Settings size={14} /> Editar Tarea</h3>
                <form action={handleUpdate} className="space-y-3">
                  <input name="title" defaultValue={task.title} required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]" />
                  <textarea name="description" defaultValue={task.description || ""} rows={3} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)] resize-none" />
                  <div className="grid grid-cols-3 gap-3">
                    <select name="status" defaultValue={task.status} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]">
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select name="priority" defaultValue={task.priority} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]">
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input type="datetime-local" name="due_date" defaultValue={task.due_date?.slice(0, 16) || ""} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowEditPanel(false)} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs">Cancelar</button>
                    <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-black font-bold text-xs disabled:opacity-50">
                      {isPending ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Confirm attendance card */}
          {isAssigned && !myAssignment?.confirmed && (
            <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm text-emerald-300 flex items-center gap-2">
                <UserCheck size={16} /> Estás asignado a esta tarea. Confirma tu asistencia.
              </span>
              <button onClick={handleConfirm} disabled={isPending}
                className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                {isPending ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          )}

          {mustAcceptBeforeInternalAccess && (
            <div className="bg-amber-500/[0.08] border border-amber-500/25 rounded-2xl px-5 py-4">
              <p className="text-sm text-amber-200 font-semibold">Acceso interno bloqueado hasta aceptar la tarea</p>
              <p className="text-xs text-amber-100/80 mt-1">
                Puedes revisar la descripción y fecha límite, pero comentarios, archivos y actividad se habilitan solo después de confirmar asistencia.
              </p>
            </div>
          )}

          {!mustAcceptBeforeInternalAccess && taskRoomId && (
            <div className="bg-cyan-500/[0.06] border border-cyan-500/20 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-cyan-200 font-semibold">Chat grupal de la tarea disponible</p>
                <p className="text-xs text-cyan-100/70">Coordina avances con el equipo en tiempo real.</p>
              </div>
              <button
                onClick={openTaskChat}
                className="px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
              >
                Abrir chat
              </button>
            </div>
          )}

          {/* Media Gallery Card */}
          {!mustAcceptBeforeInternalAccess && mediaFiles.length > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ImageIcon size={12} /> Media compartida ({mediaFiles.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {mediaFiles.map((att) => {
                  const isVideo = att.file_type?.startsWith("video/");
                  return (
                    <div key={att.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/30 border border-white/[0.06] cursor-pointer hover:border-[var(--accent-cyan)]/30 transition-colors"
                      onClick={() => setExpandedMedia(expandedMedia === att.id ? null : att.id)}>
                      {isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/60">
                          <Play size={32} className="text-white/60 group-hover:text-white transition-colors" />
                          <span className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/60 px-1.5 py-0.5 rounded">{att.file_name}</span>
                        </div>
                      ) : (
                        <Image src={att.file_url} alt={att.file_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md bg-black/70 text-white/80 hover:text-white"><Download size={12} /></a>
                        {(att.user?.id === currentUserId || canManage) && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                            className="p-1 rounded-md bg-black/70 text-red-400/80 hover:text-red-400"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {expandedMedia && (() => {
                const m = mediaFiles.find((a) => a.id === expandedMedia);
                if (!m) return null;
                return (
                  <div className="mt-3 bg-black/40 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={m.user?.avatar_url} name={m.user?.full_name} size={20} />
                        <span className="text-xs text-gray-400">{m.user?.full_name} · {relativeTime(m.created_at)} · {formatFileSize(m.file_size)}</span>
                      </div>
                      <button onClick={() => setExpandedMedia(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                    </div>
                    {m.file_type?.startsWith("video/") ? (
                      <video src={m.file_url} controls className="w-full max-h-[500px] rounded-lg" />
                    ) : (
                      <Image src={m.file_url} alt={m.file_name} width={1200} height={800} className="w-full max-h-[500px] object-contain rounded-lg" />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── COMMENTS FEED ─── */}
          {!mustAcceptBeforeInternalAccess && comments.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-gray-500 font-medium">{comments.length} {comments.length === 1 ? "comentario" : "comentarios"}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )}

          {!mustAcceptBeforeInternalAccess && rootComments.map((comment) => (
            <SocialPost
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUserId={currentUserId}
              currentUser={currentUser || null}
              canManage={canManage}
              isPending={isPending}
              showReactions={showReactions}
              setShowReactions={setShowReactions}
              onReply={handleReply}
              onDelete={handleDeleteComment}
              onReaction={handleReaction}
            />
          ))}

          {/* ─── New Comment (top-level) ─── */}
          {!mustAcceptBeforeInternalAccess && <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
            <div className="flex gap-3">
              <Avatar src={currentUser?.avatar_url || null} name={currentUser?.full_name || null} size={36} />
              <div className="flex-1 min-w-0">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={1}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[var(--accent-cyan)]/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleNewComment(); }}
                  onFocus={(e) => { e.currentTarget.rows = 3; }}
                  onBlur={(e) => { if (!newComment.trim() && newCommentFiles.length === 0) e.currentTarget.rows = 1; }}
                />
                {/* File previews */}
                {newCommentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newCommentFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.type.startsWith("image/") ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                            <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                          </div>
                        ) : f.type.startsWith("video/") ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                            <Film size={20} className="text-gray-500" />
                            <span className="absolute bottom-1 left-1 text-[8px] text-gray-400 truncate max-w-[70px]">{f.name}</span>
                          </div>
                        ) : (
                          <div className="h-20 rounded-lg border border-white/10 bg-black/30 flex flex-col items-center justify-center px-3 gap-1">
                            <FileText size={18} className="text-gray-500" />
                            <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{f.name}</span>
                          </div>
                        )}
                        <button onClick={() => setNewCommentFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(newComment.trim() || newCommentFiles.length > 0) && (
                  <div className="flex items-center justify-between mt-2">
                    <input ref={newCommentFileRef} type="file" className="hidden" onChange={handleNewCommentFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" multiple />
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => newCommentFileRef.current?.click()} disabled={isPending}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors" title="Adjuntar archivo">
                        <Paperclip size={14} />
                      </button>
                      <span className="text-[10px] text-gray-700 ml-1 hidden sm:inline">Ctrl+Enter</span>
                    </div>
                    <button onClick={handleNewComment} disabled={isPending || (!newComment.trim() && newCommentFiles.length === 0)}
                      className="px-4 py-1.5 rounded-full bg-[var(--accent-cyan)] text-black font-bold text-xs hover:brightness-110 disabled:opacity-30 transition-all flex items-center gap-1.5">
                      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Publicar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>}

          {!mustAcceptBeforeInternalAccess && comments.length === 0 && (
            <div className="py-6 text-center">
              <MessageSquare size={24} className="mx-auto text-gray-700 mb-2" />
              <p className="text-sm text-gray-500">Aún no hay comentarios</p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SIDEBAR
        ═══════════════════════════════════════════ */}
        {showSidebar && (
          <div className="w-[300px] flex-shrink-0 space-y-4">
            {/* Sidebar tabs */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5">
              {([
                { key: "info", icon: Hash },
                { key: "members", icon: Users },
                ...(!mustAcceptBeforeInternalAccess ? [{ key: "files", icon: Paperclip }, { key: "activity", icon: Clock }] : []),
              ] as const).map((t) => (
                <button key={t.key} onClick={() => setSidebarTab(t.key)}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${sidebarTab === t.key ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"}`}>
                  <t.icon size={14} />
                </button>
              ))}
            </div>

            {/* Info */}
            {sidebarTab === "info" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Detalles</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Estado</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Prioridad</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${pc.color}`}>{pc.label}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Fecha límite</span>
                      <span className={`text-xs ${overdue ? "text-red-400" : "text-gray-300"}`}>{formatDate(task.due_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Creada</span>
                    <span className="text-xs text-gray-300">{formatDate(task.created_at)}</span>
                  </div>
                  {task.started_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Iniciada</span>
                      <span className="text-xs text-gray-300">{formatDate(task.started_at)}</span>
                    </div>
                  )}
                  {task.completed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Completada</span>
                      <span className="text-xs text-emerald-400">{formatDate(task.completed_at)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.06]">
                  <span className="text-xs text-gray-500">Progreso asistencia</span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${assignments.length ? (confirmed / assignments.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-emerald-400 font-bold">{confirmed}/{assignments.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Members */}
            {sidebarTab === "members" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Equipo ({assignments.length})</h3>
                  {canManage && (
                    <button onClick={() => setShowAssigneeEditor(!showAssigneeEditor)} className="text-[10px] text-[var(--accent-cyan)] hover:underline">
                      Gestionar
                    </button>
                  )}
                </div>

                {showAssigneeEditor && canManage && (
                  <div className="bg-black/20 rounded-xl p-3 space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {profiles.map((p) => (
                        <button key={p.id} type="button" onClick={() => setSelectedAssignees((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${selectedAssignees.includes(p.id) ? "bg-[var(--accent-cyan)]/10 text-white" : "text-gray-400 hover:bg-white/5"}`}>
                          <Avatar src={p.avatar_url} name={p.full_name} size={18} />
                          <span className="truncate">{p.full_name || "Sin nombre"}</span>
                          {selectedAssignees.includes(p.id) && <Check size={10} className="text-[var(--accent-cyan)] ml-auto" />}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleSaveAssignees} disabled={isPending} className="w-full px-3 py-1.5 rounded-lg bg-[var(--accent-cyan)] text-black font-bold text-xs disabled:opacity-50">
                      {isPending ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <div className={`rounded-full ${a.confirmed ? "ring-2 ring-emerald-500/40" : ""}`}>
                        <Avatar src={a.user?.avatar_url} name={a.user?.full_name} size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{a.user?.full_name || "Sin nombre"}</p>
                        <p className="text-[10px] text-gray-600">{a.confirmed ? "✓ Confirmado" : "Pendiente"}</p>
                      </div>
                    </div>
                  ))}
                  {assignments.length === 0 && <p className="text-xs text-gray-600 text-center py-2">Sin asignados</p>}
                </div>
              </div>
            )}

            {/* Files */}
            {sidebarTab === "files" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Archivos ({attachments.length})</h3>
                  {(isAssigned || canManage) && (
                    <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-[var(--accent-cyan)] hover:underline flex items-center gap-1">
                      <Upload size={10} /> Subir
                    </button>
                  )}
                </div>

                {docFiles.length > 0 && (
                  <>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Documentos</p>
                    <div className="space-y-1.5">
                      {docFiles.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors group">
                          <FileText size={14} className="text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 truncate">{att.file_name}</p>
                            <p className="text-[10px] text-gray-600">{formatFileSize(att.file_size)}</p>
                          </div>
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download size={12} className="text-gray-400" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {mediaFiles.length > 0 && (
                  <>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-2">Media</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {mediaFiles.map((att) => (
                        <div key={att.id} className="aspect-square rounded-lg overflow-hidden bg-black/30 relative group cursor-pointer"
                          onClick={() => setExpandedMedia(att.id)}>
                          {att.file_type?.startsWith("image/") ? (
                            <Image src={att.file_url} alt={att.file_name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film size={16} className="text-gray-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {attachments.length === 0 && <p className="text-xs text-gray-600 text-center py-2">Sin archivos</p>}
              </div>
            )}

            {/* Activity */}
            {sidebarTab === "activity" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-0.5">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Actividad reciente</h3>
                {activity.slice(0, 20).map((a, i) => (
                  <div key={a.id} className="flex gap-2 py-2 relative">
                    {i < Math.min(activity.length, 20) - 1 && <div className="absolute left-[11px] top-[32px] bottom-0 w-px bg-white/[0.06]" />}
                    <Avatar src={a.user?.avatar_url} name={a.user?.full_name} size={22} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-400">
                        <strong className="text-gray-300">{a.user?.full_name?.split(" ")[0] || "?"}</strong>{" "}
                        {ACTION_LABELS[a.action] || a.action}
                      </p>
                      <p className="text-[10px] text-gray-600">{relativeTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-xs text-gray-600 text-center py-2">Sin actividad</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Social Post Component ───
function SocialPost({
  comment, replies, currentUserId, currentUser, canManage, isPending,
  showReactions, setShowReactions, onReply, onDelete, onReaction,
}: {
  comment: Comment; replies: Comment[];
  currentUserId: string; currentUser: Profile | null; canManage: boolean; isPending: boolean;
  showReactions: string | null; setShowReactions: (id: string | null) => void;
  onReply: (content: string, parentId: string, files?: File[]) => void; onDelete: (id: string) => void; onReaction: (commentId: string, emoji: string) => void;
}) {
  const isOwn = comment.user?.id === currentUserId;
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const reactionGroups: Record<string, { count: number; userIds: string[] }> = {};
  for (const r of comment.task_comment_reactions) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, userIds: [] };
    reactionGroups[r.emoji].count++;
    reactionGroups[r.emoji].userIds.push(r.user_id);
  }

  function submitReply() {
    if (!replyContent.trim() && replyFiles.length === 0) return;
    onReply(replyContent, comment.id, replyFiles.length > 0 ? replyFiles : undefined);
    setReplyContent("");
    setReplyFiles([]);
    setShowReplyEditor(false);
  }
  function handleReplyFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setReplyFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  }

  function openReplyEditor() {
    setShowReplyEditor(true);
    setShowReplies(true);
    setTimeout(() => replyRef.current?.focus(), 50);
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-0 flex items-start gap-3">
        <Avatar src={comment.user?.avatar_url} name={comment.user?.full_name} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{comment.user?.full_name || "?"}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{relativeTime(comment.created_at)}</span>
          </div>
        </div>
        {(isOwn || canManage) && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#0d1117] border border-white/10 rounded-xl shadow-xl z-20 py-1 min-w-[120px]">
                <button onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/5 flex items-center gap-2">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-2 pb-3">
        <div className="prose prose-invert prose-sm max-w-none text-gray-300 text-sm leading-relaxed break-words
          [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_img]:my-2 [&_img]:max-w-full
          [&_video]:rounded-xl [&_video]:my-2 [&_video]:max-w-full
          [&_a]:text-[var(--accent-cyan)] [&_a]:no-underline [&_a:hover]:underline
          [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent-cyan)]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400
          [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      </div>

      {/* Reactions row */}
      {Object.keys(reactionGroups).length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
          {Object.entries(reactionGroups).map(([emoji, { count, userIds }]) => (
            <button key={emoji} onClick={() => onReaction(comment.id, emoji)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                userIds.includes(currentUserId)
                  ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]"
                  : "bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10"
              }`}>
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-white/[0.06] px-2 py-1 flex items-center">
        <div className="relative">
          <button onClick={() => setShowReactions(showReactions === comment.id ? null : comment.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Smile size={15} /> Reaccionar
          </button>
          {showReactions === comment.id && (
            <div className="absolute bottom-full left-0 mb-1 bg-[#0a0f1a] border border-white/10 rounded-xl p-2 flex gap-1 shadow-xl z-20">
              {REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => onReaction(comment.id, emoji)} className="hover:scale-125 transition-transform text-lg p-0.5">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={openReplyEditor}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <Reply size={15} /> Responder
        </button>

        {replies.length > 0 && (
          <button onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 rounded-lg transition-colors ml-auto">
            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {replies.length} {replies.length === 1 ? "respuesta" : "respuestas"}
          </button>
        )}
      </div>

      {/* Replies + inline editor */}
      {(showReplies && replies.length > 0 || showReplyEditor) && (
        <div className="border-t border-white/[0.06] bg-white/[0.015]">
          {showReplies && replies.length > 0 && (
            <div className="px-4 pt-3 pb-1 space-y-3">
              {replies.map((reply) => {
                const rg: Record<string, { count: number; userIds: string[] }> = {};
                for (const r of reply.task_comment_reactions) {
                  if (!rg[r.emoji]) rg[r.emoji] = { count: 0, userIds: [] };
                  rg[r.emoji].count++;
                  rg[r.emoji].userIds.push(r.user_id);
                }
                return (
                  <div key={reply.id} className="flex gap-2.5">
                    <Avatar src={reply.user?.avatar_url} name={reply.user?.full_name} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/[0.04] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-white">{reply.user?.full_name || "?"}</span>
                          <span className="text-[10px] text-gray-600">{relativeTime(reply.created_at)}</span>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-gray-400 text-xs leading-relaxed break-words
                          [&_img]:rounded-lg [&_img]:max-w-[200px] [&_a]:text-[var(--accent-cyan)]"
                          dangerouslySetInnerHTML={{ __html: reply.content }}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-1 ml-1">
                        {Object.entries(rg).map(([emoji, { count, userIds }]) => (
                          <button key={emoji} onClick={() => onReaction(reply.id, emoji)}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
                              userIds.includes(currentUserId)
                                ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]"
                                : "bg-white/5 border-white/[0.08] text-gray-500"
                            }`}>
                            {emoji} {count}
                          </button>
                        ))}
                        <div className="relative">
                          <button onClick={() => setShowReactions(showReactions === reply.id ? null : reply.id)}
                            className="p-1 rounded text-gray-700 hover:text-gray-400 transition-colors">
                            <Smile size={12} />
                          </button>
                          {showReactions === reply.id && (
                            <div className="absolute bottom-full left-0 mb-1 bg-[#0a0f1a] border border-white/10 rounded-lg p-1.5 flex gap-0.5 shadow-xl z-20">
                              {REACTIONS.map((emoji) => (
                                <button key={emoji} onClick={() => onReaction(reply.id, emoji)} className="hover:scale-125 transition-transform text-sm p-0.5">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={openReplyEditor} className="text-[10px] text-gray-600 hover:text-[var(--accent-cyan)] px-1.5 py-0.5">
                          Responder
                        </button>
                        {(reply.user?.id === currentUserId || canManage) && (
                          <button onClick={() => onDelete(reply.id)} className="text-[10px] text-gray-600 hover:text-red-400 px-1.5 py-0.5">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline reply editor */}
          {showReplyEditor && (
            <div className="px-4 py-3">
              <div className="flex gap-2.5">
                <Avatar src={currentUser?.avatar_url || null} name={currentUser?.full_name || null} size={28} />
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={replyRef}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Responder a ${comment.user?.full_name || ""} ...`}
                    rows={2}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[var(--accent-cyan)]/40 transition-colors"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply(); }}
                  />
                  {/* Reply file previews */}
                  {replyFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {replyFiles.map((f, i) => (
                        <div key={i} className="relative group">
                          {f.type.startsWith("image/") ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-14 rounded-lg border border-white/10 bg-black/30 flex flex-col items-center justify-center px-2 gap-0.5">
                              <FileText size={14} className="text-gray-500" />
                              <span className="text-[8px] text-gray-400 truncate max-w-[60px]">{f.name}</span>
                            </div>
                          )}
                          <button onClick={() => setReplyFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center">
                      <input ref={replyFileRef} type="file" className="hidden" onChange={handleReplyFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" multiple />
                      <button type="button" onClick={() => replyFileRef.current?.click()} disabled={isPending}
                        className="p-1 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors" title="Adjuntar archivo">
                        <Paperclip size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setShowReplyEditor(false); setReplyContent(""); setReplyFiles([]); }}
                        className="px-3 py-1 rounded-full text-[11px] text-gray-500 hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={submitReply} disabled={isPending || (!replyContent.trim() && replyFiles.length === 0)}
                        className="px-3.5 py-1 rounded-full bg-[var(--accent-cyan)] text-black font-bold text-[11px] hover:brightness-110 disabled:opacity-30 transition-all flex items-center gap-1">
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Responder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
