import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth, type Profile } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/community")({ component: Community });

function Community() {
  const auth = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);

  useEffect(() => { loadUsers(); }, []);
  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  };
  const filtered = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade"><h1 className="font-display text-3xl font-extrabold tracking-tighter">Community</h1><p className="text-zinc-500 text-sm mt-1">See who else is ascending.</p></header>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by username…" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors mb-6" />
      {loading ? (
        <div className="text-center text-zinc-500 text-sm py-12">Loading adventurers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-12">{search ? "No matching users found." : "No other users yet. Be the first!"}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="bg-card border border-white/5 rounded-2xl p-4 flex items-center justify-between animate-rise-fade">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-12 rounded-full bg-gradient-to-tr from-ascend-violet/40 to-ascend-fuchsia/40 p-[2px] shrink-0">
                  <div className="size-full rounded-full bg-nebula grid place-items-center font-display font-bold text-sm overflow-hidden">
                    {u.avatar_moderated && u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="size-full object-cover" /> : u.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{u.display_name || u.username}</p>
                  <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                </div>
              </div>
              {u.id !== auth.user?.id && <button onClick={() => setReportTarget(u)} className="shrink-0 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg active:scale-95 transition-transform">Report</button>}
            </div>
          ))}
        </div>
      )}
      {reportTarget && <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />}
    </AppShell>
  );
}
