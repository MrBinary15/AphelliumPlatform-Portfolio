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

  return { floating, handRaisedUsers, myHandRaised, sendReaction, toggleHandRaise, REACTION_EMOJIS };
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
            <span className="text-3xl drop-shadow-lg">{r.emoji}</span>
            {r.userName && (
              <span className="text-[9px] text-white/60 bg-black/40 rounded-full px-1.5 mt-0.5">{r.userName}</span>
            )}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          70% { opacity: 0.8; transform: translateY(-200px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-350px) scale(0.8); }
        }
        .animate-float-up {
          animation: floatUp 3s ease-out forwards;
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
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm animate-pulse">
      <span className="text-lg">✋</span>
      <span className="text-xs text-amber-300 font-medium">
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
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0a0f1a]/95 backdrop-blur-sm border border-white/10 rounded-2xl p-2 shadow-xl z-50">
      <div className="flex gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-xl transition-all hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
