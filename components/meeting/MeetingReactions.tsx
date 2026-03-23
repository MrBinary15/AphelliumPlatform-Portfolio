"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { playReactionSound, playHandRaiseSound } from "@/hooks/useMeetingSounds";

interface FloatingEmoji {
  id: string;
  emoji: string;
  left: number;
  userName?: string;
}

interface Props {
  meetingId: string;
  currentUserId: string;
  currentUserName: string;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "👏", "🎉", "😮", "🔥", "💯", "🤔", "😢"];

export function useReactions({ meetingId, currentUserId, currentUserName }: Props) {
  const supabase = createClient();
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [handRaisedUsers, setHandRaisedUsers] = useState<Map<string, string>>(new Map());
  const [myHandRaised, setMyHandRaised] = useState(false);
  const cleanupTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Subscribe to reactions via Supabase Broadcast (lightweight, no DB)
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-reactions-${meetingId}`)
      .on("broadcast", { event: "reaction" }, (payload) => {
        const { emoji, userId, userName } = payload.payload as { emoji: string; userId: string; userName: string };
        const id = `${userId}-${Date.now()}-${Math.random()}`;
        const left = 10 + Math.random() * 80;
        setFloating((prev) => [...prev.slice(-20), { id, emoji, left, userName }]);

        const timer = setTimeout(() => {
          setFloating((prev) => prev.filter((f) => f.id !== id));
          cleanupTimers.current.delete(id);
        }, 3000);
        cleanupTimers.current.set(id, timer);

        if (userId !== currentUserId) playReactionSound();
      })
      .on("broadcast", { event: "hand_raise" }, (payload) => {
        const { userId, userName, raised } = payload.payload as { userId: string; userName: string; raised: boolean };
        setHandRaisedUsers((prev) => {
          const next = new Map(prev);
          if (raised) next.set(userId, userName);
          else next.delete(userId);
          return next;
        });
        if (userId !== currentUserId && raised) playHandRaiseSound();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      cleanupTimers.current.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId]);

  const sendReaction = useCallback(
    async (emoji: string) => {
      const channel = supabase.channel(`meeting-reactions-${meetingId}`);
      await channel.send({
        type: "broadcast",
        event: "reaction",
        payload: { emoji, userId: currentUserId, userName: currentUserName },
      });
      // Also insert into DB for persistence
      await supabase.from("meeting_messages").insert({
        meeting_id: meetingId,
        sender_id: currentUserId,
        content: emoji,
        message_type: "reaction",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetingId, currentUserId, currentUserName],
  );

  const toggleHandRaise = useCallback(async () => {
    const next = !myHandRaised;
    setMyHandRaised(next);

    const channel = supabase.channel(`meeting-reactions-${meetingId}`);
    await channel.send({
      type: "broadcast",
      event: "hand_raise",
      payload: { userId: currentUserId, userName: currentUserName, raised: next },
    });

    if (next) {
      await supabase.from("meeting_messages").insert({
        meeting_id: meetingId,
        sender_id: currentUserId,
        content: "✋",
        message_type: "hand_raise",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId, currentUserName, myHandRaised]);

  const clearUserHandRaise = useCallback((userId: string) => {
    setHandRaisedUsers((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  return { floating, handRaisedUsers, myHandRaised, sendReaction, toggleHandRaise, clearUserHandRaise, REACTION_EMOJIS };
}

/* Floating reactions overlay — renders the rising emoji bubbles */
export function FloatingReactions({ reactions }: { reactions: FloatingEmoji[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-24 animate-float-up"
          style={{ left: `${r.left}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{r.emoji}</span>
            {r.userName && (
              <span className="text-[9px] text-white/70 bg-black/50 backdrop-blur-sm rounded-xl px-2 py-0.5 mt-1 font-medium border border-white/[0.06]">{r.userName}</span>
            )}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(0.6); }
          15% { opacity: 1; transform: translateY(-30px) scale(1.3); }
          70% { opacity: 0.7; transform: translateY(-220px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-380px) scale(0.7); }
        }
        .animate-float-up {
          animation: floatUp 3s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}

/* Hand-raised users banner */
export function HandRaiseBanner({ users }: { users: Map<string, string> }) {
  if (users.size === 0) return null;
  const names = Array.from(users.values());
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/25 backdrop-blur-md shadow-lg shadow-amber-500/[0.08] animate-fade-in-down">
      <span className="text-xl animate-bounce">✋</span>
      <span className="text-xs text-amber-300 font-bold">
        {names.length === 1 ? `${names[0]} levantó la mano` : `${names.length} personas levantaron la mano`}
      </span>
    </div>
  );
}

/* Reaction picker popup */
export function ReactionPicker({
  emojis,
  onSelect,
  onClose,
}: {
  emojis: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#0c1220]/98 to-[#080d18]/98 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-2.5 shadow-2xl shadow-black/40 z-50 animate-fade-in-up">
      <div className="flex gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-white/[0.08] text-xl transition-all duration-200 hover:scale-125 active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
