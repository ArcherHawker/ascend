import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useAscend, levelFromXp } from "@/lib/ascend-store";
import { getGlobalLeaderboard, getFriendsLeaderboard, getAcceptedFriendIds, type FriendRow } from "@/lib/friends";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/leaderboard")({ component: Leaderboard });

type Scope = "global" | "friends";
type SortBy = "xp" | "quests" | "level";

function Leaderboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const state = useAscend();
  const [scope, setScope] = useState<Scope>("global");
  const [sortBy, setSortBy] = useState<SortBy>("xp");
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!auth.session) { navigate({ to: "/auth", replace: true }); } }, [auth.session, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (scope === "global") {
          const r = await getGlobalLeaderboard(100);
          if (!cancelled) setRows(r);
        } else {
          const ids = await getAcceptedFriendIds();
          const r = await getFriendsLeaderboard(ids);
          if (!cancelled) setRows(r);
        }
      } catch {
        if (!cancelled) setError("Could not load leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scope]);

  const myId = auth.user?.id;
  const myLevel = levelFromXp(state.xp).level;

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "xp") return b.xp - a.xp;
    if (sortBy === "quests") return b.completed_count - a.completed_count;
    return levelFromXp(b.xp).level - levelFromXp(a.xp).level;
  });

  const myRank = sorted.findIndex((r) => r.user_id === myId) + 1;

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <h1 className="font-display text-3xl font-extrabold tracking-tighter">Leaderboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Rise through the ranks.</p>
      </header>

      <div className="flex gap-2 mb-4 bg-black/20 rounded-xl p-1">
        {(["global", "friends"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setScope(s); sounds.tap(); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${scope === s ? "bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white" : "text-zinc-500"}`}
          >
            {s === "global" ? "🌍 Global" : "👥 Friends"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(["xp", "quests", "level"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSortBy(s); sounds.tap(); }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${sortBy === s ? "bg-white/10 text-white border border-white/15" : "text-zinc-500 border border-transparent"}`}
          >
            {s === "xp" ? "⚡ XP" : s === "quests" ? "⚔️ Quests" : "🏆 Level"}
          </button>
        ))}
      </div>

      {/* Your rank card */}
      {myId && (
        <div className="bg-gradient-to-r from-ascend-violet/20 to-ascend-gold/20 border border-ascend-violet/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-ascend-violet/30 grid place-items-center font-display font-black text-lg">
            {myRank > 0 ? `#${myRank}` : "—"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">You</p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
              {sortBy === "xp" ? `${state.xp} XP` : sortBy === "quests" ? `${state.completedCount} quests` : `Level ${myLevel}`}
            </p>
          </div>
          <span className="text-[10px] font-bold text-ascend-gold uppercase tracking-widest">Your Rank</span>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-zinc-600 text-sm py-12">Loading rankings...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-12">
          <p>{scope === "friends" ? "No friends to rank yet. Add some friends first!" : "No players yet — be the first!"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((row, i) => {
            const rank = i + 1;
            const isMe = row.user_id === myId;
            const level = levelFromXp(row.xp).level;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            return (
              <div
                key={row.user_id}
                className={`rounded-2xl p-3 flex items-center gap-3 border transition-all ${isMe ? "bg-ascend-violet/10 border-ascend-violet/30" : "bg-card border-white/5"}`}
              >
                <div className="w-8 text-center font-display font-black text-lg">
                  {medal ?? <span className="text-zinc-500 text-sm">{rank}</span>}
                </div>
                <Avatar url={row.avatar_moderated ? row.avatar_url : null} name={row.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {isMe ? "You" : `@${row.username}`}
                    {row.tier && <span className="ml-2 text-[9px] font-bold text-ascend-gold uppercase tracking-wider">{row.tier}</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {sortBy === "xp" ? `${row.xp.toLocaleString()} XP` : sortBy === "quests" ? `${row.completed_count} quests` : `Level ${level}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Week</p>
                  <p className="text-xs font-bold text-ascend-gold tabular-nums">{row.xp_this_week}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="size-10 rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia p-[2px] shrink-0">
      <div className="size-full rounded-full bg-nebula grid place-items-center font-display font-bold text-sm overflow-hidden">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : (name?.charAt(0) ?? "?").toUpperCase()}
      </div>
    </div>
  );
}
