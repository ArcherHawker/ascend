import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth, type Profile } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { checkUsername, checkUsernameAI, USERNAME_GUIDELINE_MESSAGE } from "@/lib/moderation";

export const Route = createFileRoute("/admin")({ component: AdminGuard });

type Report = {
  id: string; reported_user_id: string; reporter_user_id: string; reason: string;
  description: string | null; status: string; created_at: string; resolved_at: string | null;
  admin_notes: string | null; reported_username?: string;
};

type LogEntry = {
  id: string; admin_id: string; target_user_id: string; action: string;
  details: string | null; created_at: string; target_username?: string;
};

function AdminGuard() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.loading) {
      if (!auth.session) navigate({ to: "/auth", replace: true });
      else if (!auth.isAdmin) navigate({ to: "/home", replace: true });
    }
  }, [auth.loading, auth.session, auth.isAdmin, navigate]);
  if (auth.loading || !auth.isAdmin) {
    return <div className="min-h-[100dvh] bg-nebula grid place-items-center"><div className="text-center"><div className="size-12 mx-auto mb-3 border-2 border-ascend-violet border-t-transparent rounded-full animate-spin" /><p className="text-sm text-zinc-500">Checking access…</p></div></div>;
  }
  return <AdminDashboard />;
}

type Tab = "reports" | "users" | "log";

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const loadReports = useCallback(async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const userIds = [...new Set(data.map((r) => r.reported_user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
    setReports(data.map((r) => ({ ...r, reported_username: nameMap.get(r.reported_user_id) ?? "Unknown" })) as Report[]);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as Profile[]) ?? []);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(50);
    if (!data) return;
    const userIds = [...new Set(data.map((l) => l.target_user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
    setLogs(data.map((l) => ({ ...l, target_username: nameMap.get(l.target_user_id) ?? "Unknown" })) as LogEntry[]);
  }, []);

  useEffect(() => { Promise.all([loadReports(), loadUsers(), loadLogs()]).finally(() => setLoading(false)); }, [loadReports, loadUsers, loadLogs]);

  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()));
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-[100dvh] bg-nebula text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-8 pb-20">
        <header className="mb-8 flex items-center justify-between animate-rise-fade">
          <div><h1 className="font-display text-3xl font-black tracking-tighter">Admin</h1><p className="text-xs text-zinc-500 mt-1">Moderation dashboard · {pendingCount} pending reports</p></div>
          <button onClick={() => window.history.back()} className="text-xs font-bold bg-white/5 border border-white/10 text-zinc-400 px-4 py-2 rounded-lg active:scale-95">← Back</button>
        </header>
        <div className="grid grid-cols-3 gap-1 mb-6 bg-zinc-900/60 p-1 rounded-2xl border border-white/5">
          {(["reports", "users", "log"] as Tab[]).map((t) => <button key={t} onClick={() => setTab(t)} className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? "bg-ascend-violet text-white" : "text-zinc-500"}`}>{t === "reports" ? `Reports${pendingCount ? ` (${pendingCount})` : ""}` : t}</button>)}
        </div>
        {loading ? <div className="text-center text-zinc-500 text-sm py-12">Loading…</div> : tab === "reports" ? <ReportsTab reports={reports} onResolve={loadReports} /> : tab === "users" ? (
          <div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by username or display name…" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet mb-4" />
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.id} className={`bg-card border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${u.status === "banned" ? "border-red-500/20" : u.status === "suspended" ? "border-amber-500/20" : u.status === "warned" ? "border-yellow-500/20" : "border-white/5"}`} onClick={() => setSelectedUser(u)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-full bg-gradient-to-tr from-ascend-violet/40 to-ascend-fuchsia/40 p-[2px] shrink-0">
                      <div className="size-full rounded-full bg-nebula grid place-items-center font-bold text-xs overflow-hidden">{u.avatar_moderated && u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="size-full object-cover" /> : u.username.charAt(0).toUpperCase()}</div>
                    </div>
                    <div className="min-w-0"><p className="font-semibold text-sm truncate">{u.display_name || u.username}</p><p className="text-xs text-zinc-500 truncate">@{u.username} · {u.role === "admin" ? "Admin" : "User"} · {u.status}</p></div>
                  </div>
                  <span className="text-zinc-600 text-xs">→</span>
                </div>
              ))}
              {filteredUsers.length === 0 && <div className="text-center text-zinc-600 text-sm py-8">No users found.</div>}
            </div>
          </div>
        ) : <LogTab logs={logs} />}
        {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onAction={() => { loadUsers(); loadReports(); loadLogs(); }} />}
      </div>
    </div>
  );
}

function ReportsTab({ reports, onResolve }: { reports: Report[]; onResolve: () => void }) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [resolving, setResolving] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const filtered = reports.filter((r) => filter === "all" ? true : filter === "pending" ? r.status === "pending" : r.status === "resolved");
  const resolve = async (id: string, status: "reviewed" | "resolved") => {
    setResolving(null);
    const { error } = await supabase.from("reports").update({ status, resolved_at: new Date().toISOString(), admin_notes: notes || null }).eq("id", id);
    if (!error) { setNotes(""); onResolve(); }
  };
  const reasonLabel = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["pending", "resolved", "all"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all capitalize ${filter === f ? "bg-ascend-violet/20 text-ascend-violet" : "bg-white/5 text-zinc-500"}`}>{f}</button>)}
      </div>
      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-card border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${r.status === "pending" ? "bg-amber-500/20 text-amber-400" : r.status === "reviewed" ? "bg-sky-500/20 text-sky-400" : "bg-emerald-500/20 text-emerald-400"}`}>{r.status}</span>
                <span className="text-xs text-zinc-500">{reasonLabel(r.reason)}</span>
              </div>
              <span className="text-[10px] text-zinc-600">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-semibold">Reported: {r.reported_username ?? "Unknown"}</p>
            {r.description && <p className="text-xs text-zinc-400 mt-1 italic">&ldquo;{r.description}&rdquo;</p>}
            {r.admin_notes && <p className="text-xs text-zinc-500 mt-2 border-t border-white/5 pt-2">Admin notes: {r.admin_notes}</p>}
            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {resolving === r.id ? (
                  <>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes…" className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-ascend-violet" />
                    <button onClick={() => resolve(r.id, "resolved")} className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg">Resolve</button>
                    <button onClick={() => resolve(r.id, "reviewed")} className="text-xs font-bold bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg">Mark reviewed</button>
                    <button onClick={() => setResolving(null)} className="text-xs font-bold bg-white/5 text-zinc-500 px-3 py-1.5 rounded-lg">Cancel</button>
                  </>
                ) : <button onClick={() => setResolving(r.id)} className="text-xs font-bold bg-white/5 text-zinc-300 px-3 py-1.5 rounded-lg active:scale-95">Take action</button>}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-zinc-600 text-sm py-8">No {filter} reports.</div>}
      </div>
    </div>
  );
}

function LogTab({ logs }: { logs: LogEntry[] }) {
  const actionLabel = (a: string) => a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="space-y-2">
      {logs.map((l) => (
        <div key={l.id} className="bg-card border border-white/5 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between mb-1"><span className="font-bold text-ascend-violet">{actionLabel(l.action)}</span><span className="text-zinc-600">{new Date(l.created_at).toLocaleString()}</span></div>
          <p className="text-zinc-400">Target: {l.target_username ?? "Unknown"}</p>
          {l.details && <p className="text-zinc-500 mt-1">{l.details}</p>}
        </div>
      ))}
      {logs.length === 0 && <div className="text-center text-zinc-600 text-sm py-8">No moderation actions yet.</div>}
    </div>
  );
}

function UserDetailModal({ user, onClose, onAction }: { user: Profile; onClose: () => void; onAction: () => void }) {
  const [newUsername, setNewUsername] = useState("");
  const [warningText, setWarningText] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logAction = async (action: string, details?: string) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    await supabase.from("moderation_log").insert({ admin_id: authData.user.id, target_user_id: user.id, action, details: details ?? null });
  };
  const removeAvatar = async () => {
    const { error } = await supabase.from("profiles").update({ avatar_url: null, avatar_moderated: true }).eq("id", user.id);
    if (error) { setError("Failed to remove avatar."); return; }
    await logAction("remove_avatar", `Removed avatar from ${user.username}`);
    setMsg("Avatar removed."); onAction();
  };
  const changeUsername = async () => {
    const localCheck = checkUsername(newUsername);
    if (!localCheck.ok) { setError(localCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); return; }
    const aiCheck = await checkUsernameAI(newUsername);
    if (!aiCheck.approved) { setError(aiCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); return; }
    const { error } = await supabase.from("profiles").update({ username: newUsername.trim() }).eq("id", user.id);
    if (error) { if (error.message.includes("duplicate")) setError("That username is already taken."); else setError("Failed to change username."); return; }
    await logAction("change_username", `Changed ${user.username} → ${newUsername.trim()}`);
    setMsg(`Username changed to ${newUsername.trim()}.`); setError(null); setNewUsername(""); onAction();
  };
  const warnUser = async () => {
    if (!warningText.trim()) { setError("Warning message is required."); return; }
    const { error } = await supabase.from("profiles").update({ status: "warned", warning_message: warningText.trim() }).eq("id", user.id);
    if (error) { setError("Failed to warn user."); return; }
    await logAction("warn", `Warned ${user.username}: ${warningText.trim()}`);
    setMsg("Warning issued."); setError(null); setWarningText(""); onAction();
  };
  const suspendUser = async () => {
    const days = parseInt(suspendDays) || 7;
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase.from("profiles").update({ status: "suspended", suspended_until: until }).eq("id", user.id);
    if (error) { setError("Failed to suspend user."); return; }
    await logAction("suspend", `Suspended ${user.username} for ${days} days`);
    setMsg(`Suspended for ${days} days.`); onAction();
  };
  const banUser = async () => {
    if (!confirm(`Ban ${user.username}? This is permanent.`)) return;
    const { error } = await supabase.from("profiles").update({ status: "banned", suspended_until: null }).eq("id", user.id);
    if (error) { setError("Failed to ban user."); return; }
    await logAction("ban", `Banned ${user.username}`);
    setMsg("User banned."); onAction();
  };
  const unbanUser = async () => {
    const { error } = await supabase.from("profiles").update({ status: "active", suspended_until: null }).eq("id", user.id);
    if (error) { setError("Failed to unban user."); return; }
    await logAction("unban", `Unbanned ${user.username}`);
    setMsg("User unbanned."); onAction();
  };
  const unsuspendUser = async () => {
    const { error } = await supabase.from("profiles").update({ status: "active", suspended_until: null }).eq("id", user.id);
    if (error) { setError("Failed to unsuspend user."); return; }
    await logAction("unsuspend", `Unsuspended ${user.username}`);
    setMsg("User unsuspended."); onAction();
  };

  const statusColor = user.status === "banned" ? "text-red-400" : user.status === "suspended" ? "text-amber-400" : user.status === "warned" ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-nebula border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90dvh] overflow-y-auto animate-rise-fade" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><h2 className="font-display text-xl font-extrabold">User Details</h2><button onClick={onClose} className="size-8 rounded-full bg-white/5 grid place-items-center text-zinc-400 text-sm active:scale-90">✕</button></div>
        <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-xl">
          <div className="size-14 rounded-full bg-gradient-to-tr from-ascend-violet/40 to-ascend-fuchsia/40 p-[2px] shrink-0">
            <div className="size-full rounded-full bg-nebula grid place-items-center font-bold text-base overflow-hidden">{user.avatar_moderated && user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="size-full object-cover" /> : user.username.charAt(0).toUpperCase()}</div>
          </div>
          <div>
            <p className="font-bold">{user.display_name || user.username}</p>
            <p className="text-xs text-zinc-500">@{user.username}</p>
            <p className="text-xs text-zinc-500">{user.role} · <span className={statusColor}>{user.status}</span></p>
            <p className="text-[10px] text-zinc-600 mt-0.5">DOB: {user.date_of_birth ?? "Not set"}</p>
          </div>
        </div>
        {msg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-sm text-emerald-400 mb-4">{msg}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400 mb-4">{error}</div>}
        <div className="space-y-4">
          <div className="border-t border-white/5 pt-4"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Profile Picture</p><button onClick={removeAvatar} disabled={!user.avatar_url} className="w-full text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl active:scale-95 disabled:opacity-40">Remove Profile Picture</button></div>
          <div className="border-t border-white/5 pt-4"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Change Username</p><div className="flex gap-2"><input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New username" maxLength={20} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ascend-violet" /><button onClick={changeUsername} disabled={!newUsername.trim()} className="text-xs font-bold bg-ascend-violet text-white px-4 py-2 rounded-lg disabled:opacity-40">Apply</button></div></div>
          <div className="border-t border-white/5 pt-4"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Warn User</p><div className="flex flex-col gap-2"><input value={warningText} onChange={(e) => setWarningText(e.target.value)} placeholder="Warning message…" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ascend-violet" /><button onClick={warnUser} disabled={!warningText.trim()} className="text-sm font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 py-2.5 rounded-xl active:scale-95 disabled:opacity-40">Issue Warning</button></div></div>
          <div className="border-t border-white/5 pt-4"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Suspend Account</p><div className="flex gap-2"><input type="number" value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} min={1} className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ascend-violet" /><span className="text-xs text-zinc-500 self-center">days</span><button onClick={suspendUser} className="flex-1 text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 py-2.5 rounded-xl active:scale-95">Suspend</button></div></div>
          <div className="border-t border-white/5 pt-4"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Ban / Unban</p>
            {user.status === "banned" ? <button onClick={unbanUser} className="w-full text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl active:scale-95">Unban Account</button>
            : user.status === "suspended" ? <div className="flex gap-2"><button onClick={unsuspendUser} className="flex-1 text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl active:scale-95">Unsuspend</button><button onClick={banUser} className="flex-1 text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl active:scale-95">Ban Permanently</button></div>
            : <button onClick={banUser} className="w-full text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl active:scale-95">Ban Account Permanently</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
