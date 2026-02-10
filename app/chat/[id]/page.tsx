"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessage } from "@/actions/send-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  content: string | null;
  user_id: string | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const beaconId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!beaconId) return;
    const supabase = createClient() as unknown as SupabaseClient<Database>;

    const loadChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: members } = await supabase
        .from("party_members" as any)
        .select("user_id")
        .eq("beacon_id", beaconId);

      const otherIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== user?.id);
      if (otherIds.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", otherIds[0])
          .single();
        setOtherUser(profile ?? null);
      }

      const { data: initialMessages, error: msgError } = await supabase
        .from("messages" as any)
        .select("id, content, user_id, created_at")
        .eq("beacon_id", beaconId)
        .order("created_at", { ascending: true });

      if (!msgError) {
        setMessages((initialMessages ?? []) as Message[]);
      }
      setLoading(false);
    };

    loadChat();
  }, [beaconId]);

  useEffect(() => {
    if (!beaconId) return;
    const supabase = createClient() as unknown as SupabaseClient<Database>;

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `beacon_id=eq.${beaconId}`,
        },
        (payload) => {
          const newRow = payload.new as Message;
          setMessages((prev) => [...prev, newRow]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [beaconId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setInputValue("");
    const result = await sendMessage(beaconId, text);
    setSending(false);

    if (result.success) {
      // Realtime will add the message; optionally refetch to ensure order
      const supabase = createClient() as unknown as SupabaseClient<Database>;
      const { data } = await supabase
        .from("messages" as any)
        .select("id, content, user_id, created_at")
        .eq("beacon_id", beaconId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    } else {
      toast.error(result.error);
      setInputValue(text);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-slate-900 to-black">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-slate-900 to-black">
      <header className="flex min-h-[56px] shrink-0 items-center gap-3 backdrop-blur-md bg-black/40 border-b border-white/10 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-white hover:bg-white/10"
          onClick={() => router.push("/")}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {otherUser && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={otherUser.avatar_url ?? undefined} />
              <AvatarFallback>
                {otherUser.username?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-medium text-white">
              {otherUser.username ?? "Anonymous"}
            </span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-zinc-400 text-base">
            No messages yet. Say hi!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = currentUserId !== null && msg.user_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]"
                    : "bg-zinc-800/80 border border-white/10 text-white shadow-[0_0_8px_rgba(255,255,255,0.05)]"
                }`}
              >
                <p className="break-words text-base">{msg.content ?? ""}</p>
              </div>
            </div>
          );
        })}
        <div ref={listEndRef} />
      </div>

      <div className="shrink-0 p-3">
        <form
          className="flex gap-2 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Message..."
            className="min-h-[44px] flex-1 bg-transparent border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-400/50 rounded-xl"
            disabled={sending}
          />
          <Button
            type="submit"
            size="lg"
            className="min-h-[44px] shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 border border-cyan-400/30 rounded-xl"
            disabled={sending || !inputValue.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
