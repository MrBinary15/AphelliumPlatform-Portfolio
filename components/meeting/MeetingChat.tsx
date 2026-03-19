"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, Paperclip, X, FileText, Image, Film, Download, Smile } from "lucide-react";
import { playMessageSound } from "@/hooks/useMeetingSounds";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  message_type: string;
  created_at: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

interface Props {
  meetingId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  visible: boolean;
}

const EMOJI_QUICK = ["👍", "❤️", "😂", "👏", "🎉", "😮", "🔥", "💯"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image size={16} className="text-blue-400" />;
  if (type.startsWith("video/")) return <Film size={16} className="text-purple-400" />;
  return <FileText size={16} className="text-gray-400" />;
}

export default function MeetingChat({ meetingId, currentUserId, currentUserName, onClose, visible }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFetchDone = useRef(false);

  // Fetch existing messages
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("meeting_messages")
        .select("id, sender_id, content, message_type, created_at")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!data?.length) return;

      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map<string, { name: string; avatar: string | null }>();
      profiles?.forEach((p) => profileMap.set(p.id, { name: p.full_name || "Usuario", avatar: p.avatar_url }));

      setMessages(
        data.map((m) => ({
          ...m,
          sender_name: profileMap.get(m.sender_id)?.name || "Usuario",
          sender_avatar: profileMap.get(m.sender_id)?.avatar || null,
        })),
      );
    };
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meeting_messages", filter: `meeting_id=eq.${meetingId}` },
        async (payload) => {
          const msg = payload.new as { id: string; sender_id: string; content: string; message_type: string; created_at: string };
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", msg.sender_id)
            .single();

          const newMsg: Message = {
            ...msg,
            sender_name: profile?.full_name || "Usuario",
            sender_avatar: profile?.avatar_url || null,
          };

          // Parse file info from content if type=file
          if (msg.message_type === "file") {
            try {
              const fileInfo = JSON.parse(msg.content);
              newMsg.file_name = fileInfo.file_name;
              newMsg.file_url = fileInfo.file_url;
              newMsg.file_type = fileInfo.file_type;
              newMsg.file_size = fileInfo.file_size;
            } catch { /* not file json */ }
          }

          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, newMsg];
          });

          if (msg.sender_id !== currentUserId) playMessageSound();
        },
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await supabase.from("meeting_messages").insert({
      meeting_id: meetingId,
      sender_id: currentUserId,
      content: text,
      message_type: "text",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, meetingId, currentUserId]);

  const sendEmoji = useCallback(async (emoji: string) => {
    setShowEmoji(false);
    await supabase.from("meeting_messages").insert({
      meeting_id: meetingId,
      sender_id: currentUserId,
      content: emoji,
      message_type: "text",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máx 50MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${meetingId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("meeting-files").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("meeting-files").getPublicUrl(path);

      // Insert file record
      await supabase.from("meeting_files").insert({
        meeting_id: meetingId,
        uploaded_by: currentUserId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: path,
      });

      // Send chat message with file info
      await supabase.from("meeting_messages").insert({
        meeting_id: meetingId,
        sender_id: currentUserId,
        content: JSON.stringify({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        }),
        message_type: "file",
      });
    } catch {
      alert("Error al subir archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId]);

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a]/95 backdrop-blur-sm border-l border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Chat de reunión</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-xs mt-8">No hay mensajes aún. ¡Escribe algo!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          const isSystem = msg.message_type === "system";
          const isFile = msg.message_type === "file";
          const isHandRaise = msg.message_type === "hand_raise";

          if (isSystem || isHandRaise) {
            return (
              <div key={msg.id} className="text-center py-1">
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {isHandRaise ? `✋ ${msg.sender_name} levantó la mano` : msg.content}
                </span>
              </div>
            );
          }

          let fileInfo: { file_name?: string; file_url?: string; file_type?: string; file_size?: number } | null = null;
          if (isFile) {
            try { fileInfo = JSON.parse(msg.content); } catch { /* fallback */ }
          }

          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
              {!isMine && (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-1">
                  {msg.sender_avatar ? (
                    <img src={msg.sender_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    msg.sender_name[0]?.toUpperCase()
                  )}
                </div>
              )}
              <div className={`max-w-[80%] ${isMine ? "items-end" : ""}`}>
                {!isMine && <p className="text-[10px] text-gray-500 mb-0.5 px-1">{msg.sender_name}</p>}
                {isFile && fileInfo ? (
                  <a
                    href={fileInfo.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                      isMine ? "bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30" : "bg-white/10 text-gray-200 hover:bg-white/15"
                    }`}
                  >
                    <FileIcon type={fileInfo.file_type || ""} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{fileInfo.file_name}</p>
                      <p className="text-[10px] text-gray-400">{formatSize(fileInfo.file_size || 0)}</p>
                    </div>
                    <Download size={14} className="shrink-0 opacity-60" />
                  </a>
                ) : (
                  <p className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
                    isMine ? "bg-cyan-600/20 text-cyan-100 rounded-tr-sm" : "bg-white/10 text-gray-200 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </p>
                )}
                <p className={`text-[9px] text-gray-600 mt-0.5 px-1 ${isMine ? "text-right" : ""}`}>
                  {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emoji quick picker */}
      {showEmoji && (
        <div className="px-3 py-2 border-t border-white/10 flex gap-1 flex-wrap">
          {EMOJI_QUICK.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmoji(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Emojis"
          >
            <Smile size={18} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={uploading ? "Subiendo archivo..." : "Escribe un mensaje..."}
            disabled={uploading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || uploading}
            className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-30 transition-colors"
            title="Enviar"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
