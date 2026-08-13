import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { addJournal, useAscend, type JournalEntry } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/journal")({ component: Journal });

const MOODS: { key: "great" | "ok" | "bad"; icon: string; label: string; color: string }[] = [
  { key: "great", icon: "😄", label: "Great", color: "border-emerald-400/40 bg-emerald-400/10" },
  { key: "ok", icon: "😐", label: "Okay", color: "border-sky-400/40 bg-sky-400/10" },
  { key: "bad", icon: "😞", label: "Rough", color: "border-rose-400/40 bg-rose-400/10" },
];

const MOOD_LABELS: Record<string, string> = { great: "Great day", ok: "Good day", bad: "Rough day" };

const REFLECTION_QUESTIONS = [
  "What's one thing that challenged you today?",
  "What are you grateful for right now?",
  "What did you learn about yourself today?",
  "If today had a theme, what would it be?",
  "What would make tomorrow better?",
  "What's something you're proud of?",
  "What's pulling your attention that doesn't deserve it?",
  "How did you show kindness today?",
];

function Journal() {
  const state = useAscend();
  const [view, setView] = useState<"write" | "past" | "calendar">("write");
  const [mood, setMood] = useState<"great" | "ok" | "bad">("great");
  const [note, setNote] = useState("");
  const [win, setWin] = useState("");
  const [reflection, setReflection] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [questionIdx, setQuestionIdx] = useState(() => new Date().getDate() % REFLECTION_QUESTIONS.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = state.journal.some((e) => e.date === today);

  // "On this day last year"
  const oneYearAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const memoryLastYear = state.journal.find((e) => e.date === oneYearAgo);

  // Filtered entries for search
  const filteredEntries = useMemo(() => {
    const sorted = [...state.journal].sort((a, b) => b.date.localeCompare(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((e) =>
      (e.note ?? "").toLowerCase().includes(q) ||
      (e.win ?? "").toLowerCase().includes(q) ||
      (e.reflection ?? "").toLowerCase().includes(q) ||
      e.date.includes(q)
    );
  }, [state.journal, searchQuery]);

  const handlePhoto = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800; const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale); const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!note.trim() && !win.trim() && !reflection.trim() && !photo) return;
    addJournal({ date: today, mood, note: note.trim(), win: win.trim(), reflection: reflection.trim() || null, photo });
    setNote(""); setWin(""); setReflection(""); setPhoto(null);
    sounds.questComplete();
  };

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <h1 className="font-display text-3xl font-extrabold tracking-tighter">Journal</h1>
        <p className="text-zinc-500 text-sm mt-1">Reflect. Then rise.</p>
      </header>

      {/* "On this day last year" */}
      {memoryLastYear && (
        <div className="bg-gradient-to-br from-ascend-violet/15 via-ascend-fuchsia/10 to-transparent border border-ascend-violet/20 rounded-2xl p-4 mb-6 animate-rise-fade">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ascend-violet mb-2">🗓 On this day last year</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{MOODS.find((m) => m.key === memoryLastYear.mood)?.icon}</span>
            <span className="text-xs font-bold text-zinc-400">{MOOD_LABELS[memoryLastYear.mood] ?? memoryLastYear.mood}</span>
            <span className="text-[10px] text-zinc-600">· {new Date(memoryLastYear.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          {memoryLastYear.note && <p className="text-sm text-zinc-300 mt-1">&ldquo;{memoryLastYear.note}&rdquo;</p>}
          {memoryLastYear.win && <p className="text-xs text-ascend-violet font-semibold mt-1">⭐ {memoryLastYear.win}</p>}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 bg-black/20 rounded-xl p-1">
        {(["write", "past", "calendar"] as const).map((v) => (
          <button key={v} onClick={() => { setView(v); sounds.buttonPress(); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${view === v ? "bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white" : "text-zinc-500"}`}>
            {v === "write" ? "Write" : v === "past" ? "Past Journals" : "Calendar"}
          </button>
        ))}
      </div>

      {view === "write" && (
        <section className="bg-card border border-white/5 rounded-3xl p-5 mb-6 animate-rise-fade">
          {alreadyToday && <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-4">✓ Entry logged for today</p>}

          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">How was today?</p>
          <div className="flex gap-2 mb-5">
            {MOODS.map((m) => (
              <button key={m.key} onClick={() => setMood(m.key)} className={`flex-1 py-3 rounded-xl border transition-all active:scale-95 ${mood === m.key ? m.color : "border-white/5 bg-black/20"}`}>
                <div className="text-2xl">{m.icon}</div>
                <div className="text-[10px] mt-1 text-zinc-400 font-semibold">{m.label}</div>
              </button>
            ))}
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Reflection</label>
              <button onClick={() => setQuestionIdx((questionIdx + 1) % REFLECTION_QUESTIONS.length)} className="text-[10px] text-ascend-violet font-bold active:scale-90 transition-transform">↻ New</button>
            </div>
            <p className="text-sm text-ascend-violet/90 font-medium mb-2 italic">&ldquo;{REFLECTION_QUESTIONS[questionIdx]}&rdquo;</p>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Your thoughts..." rows={2} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-ascend-violet resize-none" />
          </div>

          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Today&apos;s win</label>
          <input value={win} onChange={(e) => setWin(e.target.value)} placeholder="One thing that went right" className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-ascend-violet" />

          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Notes</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's on your mind?" rows={3} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-ascend-violet resize-none" />

          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Photo</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handlePhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {photo ? (
            <div className="relative mb-4 rounded-xl overflow-hidden">
              <img src={photo} alt="Journal" className="w-full max-h-48 object-cover rounded-xl" />
              <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white grid place-items-center text-xs active:scale-90">✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 text-zinc-500 text-sm mb-4 active:scale-95 transition-transform">📷 Add a photo</button>
          )}

          <button onClick={save} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-gold text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">Save Entry</button>
        </section>
      )}

      {view === "past" && (
        <section className="animate-rise-fade">
          <div className="relative mb-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your journal..."
              className="w-full bg-card border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-ascend-violet transition-colors"
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs active:scale-90">✕</button>}
          </div>

          <div className="space-y-3">
            {filteredEntries.length === 0 && (
              <div className="text-center text-zinc-600 text-sm py-8">
                {searchQuery ? "No entries match your search." : "No entries yet — write your first above."}
              </div>
            )}
            {filteredEntries.map((e) => (
              <JournalCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}

      {view === "calendar" && (
        <CalendarView entries={state.journal} />
      )}
    </AppShell>
  );
}

function JournalCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MOODS.find((m) => m.key === entry.mood)?.icon}</span>
          <span className="text-xs font-bold text-zinc-400">{MOOD_LABELS[entry.mood] ?? entry.mood}</span>
        </div>
        <span className="text-xs text-zinc-500">{new Date(entry.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
      </div>
      {entry.photo && <img src={entry.photo} alt="Entry" className="w-full max-h-40 object-cover rounded-xl mb-3" />}
      {entry.win && <p className="text-sm text-ascend-violet font-semibold">⭐ {entry.win}</p>}
      {entry.reflection && <p className="text-xs text-zinc-500 italic mt-1.5 mb-1">&ldquo;{entry.reflection}&rdquo;</p>}
      {entry.note && (
        <p className={`text-sm text-zinc-300 mt-1 whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>{entry.note}</p>
      )}
      {entry.note && entry.note.length > 150 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-ascend-violet font-bold mt-2 active:scale-95 transition-transform">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function CalendarView({ entries }: { entries: JournalEntry[] }) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const entryMap = useMemo(() => {
    const m = new Map<string, JournalEntry>();
    entries.forEach((e) => m.set(e.date, e));
    return m;
  }, [entries]);

  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const monthName = new Date(calMonth.year, calMonth.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => { setCalMonth((c) => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); sounds.buttonPress(); };
  const nextMonth = () => { setCalMonth((c) => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); sounds.buttonPress(); };

  const moodColors: Record<string, string> = {
    great: "bg-emerald-400/20 border-emerald-400/40",
    ok: "bg-sky-400/20 border-sky-400/40",
    bad: "bg-rose-400/20 border-rose-400/40",
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <section className="animate-rise-fade">
      <div className="bg-card border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="size-9 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 active:scale-90 transition-transform">‹</button>
          <h2 className="font-display text-sm font-bold">{monthName}</h2>
          <button onClick={nextMonth} className="size-9 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 active:scale-90 transition-transform">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold uppercase text-zinc-600">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const entry = entryMap.get(dateStr);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-all ${entry ? moodColors[entry.mood] : "border-white/5 bg-black/20"} ${isToday ? "ring-1 ring-ascend-violet" : ""}`}
              >
                <span className={`text-[10px] font-bold ${entry ? "text-zinc-200" : "text-zinc-600"}`}>{d}</span>
                {entry && <span className="text-[8px]">{MOODS.find((m) => m.key === entry.mood)?.icon}</span>}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
          {MOODS.map((m) => (
            <div key={m.key} className="flex items-center gap-1.5">
              <div className={`size-3 rounded ${moodColors[m.key].split(" ")[0]}`} />
              <span className="text-[9px] text-zinc-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entries from this month */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-6 mb-3">Entries this month</h3>
      <div className="space-y-3">
        {entries
          .filter((e) => {
            const d = new Date(e.date);
            return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
          })
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => <JournalCard key={e.id} entry={e} />)}
        {entries.filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
        }).length === 0 && <div className="text-center text-zinc-600 text-sm py-4">No entries this month.</div>}
      </div>
    </section>
  );
}
