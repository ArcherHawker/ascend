import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import {
  searchUsers,
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendProfile,
  getConversations,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  type Friendship,
  type FriendProfile,
  type Conversation,
  type ChatMessage,
} from "@/lib/friends";
import { sounds } from "@/lib/sounds";
import { levelFromXp, STAT_META, ACHIEVEMENTS, type StatKey } from "@/lib/ascend-store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/friends")({ component: Friends });

function Friends() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; username: string; avatar_url: string | null; avatar_moderated: boolean }[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendships, setFriendships] = useState<{ incoming: Friendship[]; outgoing: Friendship[]; accepted: Friendship[] }>({ incoming: [], outgoing: [], accepted: [] });
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"search" | "requests" | "friends" | "chat">("search");
  const [viewingProfile, setViewingProfile] = useState<FriendProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fs, ids] = await Promise.all([getFriendships(), getFriendProfileIds()]);
    setFriendships(fs);
    setFriendIds(new Set(ids));
    setLoading(false);
  }, []);

  const loadConversations = useCallback(async () => {
    const convs = await getConversations();
    setConversations(convs);
  }, []);

  useEffect(() => { if (!auth.session) { navigate({ to: "/auth", replace: true }); return; } load(); loadConversations(); }, [auth.session, navigate, load, loadConversations]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchUsers(query);
      setResults(r);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleSend = async (id: string) => {
    sounds.buttonPress();
    const ok = await sendFriendRequest(id);
    if (ok) { await load(); setError(null); } else setError("Could not send request.");
  };

  const handleAccept = async (id: string) => {
    sounds.questComplete();
    await acceptFriendRequest(id);
    await load();
  };

  const handleDecline = async (id: string) => {
    sounds.buttonPress();
    await declineFriendRequest(id);
    await load();
  };

  const handleRemove = async (id: string) => {
    await removeFriend(id);
    await load();
  };

  const handleViewProfile = async (userId: string) => {
    setProfileLoading(true);
    const profile = await getFriendProfile(userId);
    setViewingProfile(profile);
    setProfileLoading(false);
  };

  const incomingCount = friendships.incoming.length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <h1 className="font-display text-3xl font-extrabold tracking-tighter">Friends</h1>
        <p className="text-zinc-500 text-sm mt-1">Connect and rise together.</p>
      </header>

      <div className="flex gap-2 mb-6 bg-black/20 rounded-xl p-1">
        {(["search", "requests", "friends", "chat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); sounds.buttonPress(); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${tab === t ? "bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white" : "text-zinc-500"}`}
          >
            {t === "requests" && incomingCount > 0 ? `Requests (${incomingCount})` : t === "chat" && totalUnread > 0 ? `Chat (${totalUnread})` : t}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <section className="animate-rise-fade">
          <div className="relative mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-card border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-ascend-violet transition-colors"
            />
            {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 animate-pulse">...</span>}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}

          <div className="space-y-2">
            {results.length === 0 && !searching && query.trim() && (
              <div className="text-center text-zinc-600 text-sm py-8">No users found for &ldquo;{query}&rdquo;</div>
            )}
            {results.map((u) => {
              const isFriend = friendIds.has(u.id);
              const hasOutgoing = friendships.outgoing.some((f) => f.partner_id === u.id);
              return (
                <div key={u.id} className="bg-card border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar url={u.avatar_moderated ? u.avatar_url : null} name={u.username} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">@{u.username}</p>
                  </div>
                  {isFriend ? (
                    <button onClick={() => handleViewProfile(u.id)} className="text-[10px] font-bold text-ascend-violet uppercase tracking-wider active:scale-90 transition-transform">View</button>
                  ) : hasOutgoing ? (
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending</span>
                  ) : (
                    <button onClick={() => handleSend(u.id)} className="text-xs font-bold bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white px-4 py-2 rounded-lg active:scale-90 transition-transform">
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "requests" && (
        <section className="animate-rise-fade">
          {friendships.incoming.length === 0 && friendships.outgoing.length === 0 && (
            <div className="text-center text-zinc-600 text-sm py-12">No friend requests yet.</div>
          )}
          {friendships.incoming.length > 0 && (
            <>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Incoming</h3>
              <div className="space-y-2 mb-6">
                {friendships.incoming.map((f) => (
                  <div key={f.id} className="bg-card border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                    <Avatar url={f.partner_avatar_moderated ? f.partner_avatar : null} name={f.partner_username ?? "?"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">@{f.partner_username ?? "User"}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(f.id)} className="size-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 grid place-items-center text-xs active:scale-90 transition-transform">✓</button>
                      <button onClick={() => handleDecline(f.id)} className="size-8 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 grid place-items-center text-xs active:scale-90 transition-transform">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {friendships.outgoing.length > 0 && (
            <>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Outgoing</h3>
              <div className="space-y-2">
                {friendships.outgoing.map((f) => (
                  <div key={f.id} className="bg-card border border-white/5 rounded-2xl p-3 flex items-center gap-3 opacity-60">
                    <Avatar url={f.partner_avatar_moderated ? f.partner_avatar : null} name={f.partner_username ?? "?"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">@{f.partner_username ?? "User"}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === "friends" && (
        <section className="animate-rise-fade">
          {loading ? (
            <div className="text-center text-zinc-600 text-sm py-12">Loading...</div>
          ) : friendships.accepted.length === 0 ? (
            <div className="text-center text-zinc-600 text-sm py-12">
              <p className="mb-3">No friends yet.</p>
              <button onClick={() => setTab("search")} className="text-ascend-violet font-bold text-sm active:scale-95 transition-transform">Find friends →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {friendships.accepted.map((f) => (
                <div key={f.id} className="bg-card border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar url={f.partner_avatar_moderated ? f.partner_avatar : null} name={f.partner_username ?? "?"} />
                  <button onClick={() => handleViewProfile(f.partner_id ?? "")} className="flex-1 min-w-0 text-left active:scale-[0.98] transition-transform">
                    <p className="text-sm font-semibold truncate">@{f.partner_username ?? "User"}</p>
                    <p className="text-[10px] text-ascend-violet/60">Tap to view profile</p>
                  </button>
                  <button onClick={() => handleRemove(f.id)} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider active:scale-90 transition-transform">Remove</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "chat" && (
        <section className="animate-rise-fade">
          {conversations.length === 0 ? (
            <div className="text-center text-zinc-600 text-sm py-12">
              <p className="mb-3">No conversations yet.</p>
              <button onClick={() => setTab("friends")} className="text-ascend-violet font-bold text-sm active:scale-95 transition-transform">Start chatting with a friend →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.friend_id}
                  onClick={() => { sounds.buttonPress(); setActiveChat(c); }}
                  className="w-full bg-card border border-white/5 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                >
                  <Avatar url={c.friend_avatar_moderated ? c.friend_avatar : null} name={c.friend_username} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">@{c.friend_username}</p>
                      <span className="text-[10px] text-zinc-500 shrink-0">{formatTimeShort(c.last_message_at)}</span>
                    </div>
                    <p className={`text-xs truncate ${c.unread_count > 0 ? "text-zinc-200 font-medium" : "text-zinc-500"}`}>{c.last_message}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="size-5 rounded-full bg-ascend-violet text-white text-[10px] font-bold grid place-items-center shrink-0">{c.unread_count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Profile viewer modal */}
      {(viewingProfile || profileLoading) && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { if (!profileLoading) setViewingProfile(null); }}>
          <div className="w-full max-w-md bg-nebula border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto animate-rise-fade" onClick={(e) => e.stopPropagation()}>
            {profileLoading ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading profile...</div>
            ) : viewingProfile ? (
              <FriendProfileView profile={viewingProfile} onClose={() => setViewingProfile(null)} onMessage={() => {
                const conv: Conversation = {
                  friend_id: viewingProfile.id,
                  friend_username: viewingProfile.username,
                  friend_avatar: viewingProfile.avatar_url,
                  friend_avatar_moderated: viewingProfile.avatar_moderated,
                  last_message: "",
                  last_message_at: new Date().toISOString(),
                  unread_count: 0,
                };
                setActiveChat(conv);
                setViewingProfile(null);
                setTab("chat");
              }} />
            ) : null}
          </div>
        </div>
      )}

      {/* Chat modal */}
      {activeChat && (
        <ChatView
          conversation={activeChat}
          onClose={() => { setActiveChat(null); loadConversations(); }}
        />
      )}
    </AppShell>
  );
}

function ChatView({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) myIdRef.current = session.user.id;
      const msgs = await fetchMessages(conversation.friend_id);
      if (cancelled) return;
      setMessages(msgs);
      setLoadingMsgs(false);
      await markMessagesRead(conversation.friend_id);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    })();
    return () => { cancelled = true; };
  }, [conversation.friend_id]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm-${conversation.friend_id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as ChatMessage;
          const myId = myIdRef.current;
          const involvesMe = (m.sender_id === myId && m.recipient_id === conversation.friend_id) ||
                             (m.sender_id === conversation.friend_id && m.recipient_id === myId);
          if (!involvesMe) return;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id === conversation.friend_id) markMessagesRead(conversation.friend_id);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation.friend_id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    sounds.buttonPress();
    const ok = await sendMessage(conversation.friend_id, text);
    if (!ok) setInput(text);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-nebula shrink-0">
        <button onClick={onClose} className="size-9 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 active:scale-90 transition-transform">
          ←
        </button>
        <Avatar url={conversation.friend_avatar_moderated ? conversation.friend_avatar : null} name={conversation.friend_username} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">@{conversation.friend_username}</p>
          <p className="text-[10px] text-emerald-400/70">Online now</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loadingMsgs ? (
          <div className="text-center text-zinc-600 text-sm py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-8">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Send the first motivational message!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.sender_id === myIdRef.current;
            const prevSameSender = i > 0 && messages[i - 1].sender_id === m.sender_id;
            const showTime = i === 0 || new Date(messages[i - 1].created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60 * 1000;
            return (
              <div key={m.id}>
                {showTime && (
                  <div className="text-center text-[10px] text-zinc-600 my-3">{formatDayDivider(m.created_at)}</div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${prevSameSender ? "mt-0.5" : "mt-2"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${isMe ? "bg-gradient-to-br from-ascend-violet to-ascend-fuchsia text-white rounded-br-md" : "bg-white/[0.06] border border-white/[0.08] text-zinc-200 rounded-bl-md"}`}>
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[9px] mt-0.5 ${isMe ? "text-white/50" : "text-zinc-500"}`}>{formatTimeShort(m.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-nebula shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Send a message..."
            maxLength={1000}
            className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-ascend-violet transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="size-10 rounded-full bg-gradient-to-br from-ascend-violet to-ascend-fuchsia text-white grid place-items-center active:scale-90 transition-transform disabled:opacity-40 disabled:active:scale-100 shrink-0"
          >
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendProfileView({ profile, onClose, onMessage }: { profile: FriendProfile; onClose: () => void; onMessage: () => void }) {
  const { level } = levelFromXp(profile.xp);
  const stats = profile.share_stats_with_friends ? profile.stats : {};
  const achievements = profile.share_stats_with_friends ? profile.achievements : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-black">Profile</h2>
        <button onClick={onClose} className="size-8 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 text-xs active:scale-90 transition-transform">✕</button>
      </div>

      <div className="flex flex-col items-center text-center mb-5">
        <Avatar url={profile.avatar_moderated ? profile.avatar_url : null} name={profile.username} size="lg" />
        <p className="font-display text-xl font-extrabold mt-3">{profile.display_name ?? `@${profile.username}`}</p>
        <p className="text-xs text-zinc-500">@{profile.username}</p>
        {profile.bio && <p className="text-sm text-zinc-400 italic mt-2 max-w-xs">&ldquo;{profile.bio}&rdquo;</p>}
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="font-display text-xl font-black text-ascend-gold">{level}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Level</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-black text-ascend-violet">{profile.streak}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Streak</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-black text-ascend-fuchsia">{Math.round(profile.stride_score)}</p>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Stride</p>
          </div>
        </div>
      </div>

      {profile.share_stats_with_friends ? (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Stats</h3>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(Object.keys(STAT_META) as StatKey[]).map((k) => (
              <div key={k} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
                <div className="text-lg">{STAT_META[k].icon}</div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">{STAT_META[k].label}</div>
                <div className="text-sm font-bold mt-0.5">{Math.round(stats[k] ?? 0)}</div>
              </div>
            ))}
          </div>

          {achievements.length > 0 && (
            <>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Achievements ({achievements.length})</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {achievements.slice(0, 12).map((a) => {
                  const ach = ACHIEVEMENTS.find((x) => x.id === a);
                  return ach ? (
                    <div key={a} className="bg-ascend-gold/10 border border-ascend-gold/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <span className="text-sm">{ach.icon}</span>
                      <span className="text-[10px] font-bold text-ascend-gold">{ach.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
          <p className="text-xs text-zinc-500">This user has chosen to keep their stats private.</p>
        </div>
      )}

      <button
        onClick={onMessage}
        className="w-full mt-5 bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
      >
        Send Message
      </button>
    </div>
  );
}

function Avatar({ url, name, size = "md" }: { url: string | null; name: string; size?: "md" | "lg" }) {
  const sz = size === "lg" ? "size-20" : "size-10";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia p-[2px] shrink-0`}>
      <div className="size-full rounded-full bg-nebula grid place-items-center font-display font-bold text-sm overflow-hidden">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : name.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 86400000 * 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDayDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

async function getFriendProfileIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const myId = session.user.id;
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error || !data) return [];
  return data.map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
}
