import { useState, useEffect, useCallback } from "react";
import { useAscend, getCoachMessage } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

export function AICoach() {
  const state = useAscend();
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(() => {
    setMessage(getCoachMessage());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, state.completedCount, state.streak, state.xpThisWeek]);

  if (dismissed) {
    return (
      <button
        onClick={() => { setDismissed(false); sounds.buttonPress(); }}
        className="fixed bottom-20 right-4 z-40 size-12 rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia grid place-items-center shadow-lg shadow-ascend-violet/30 active:scale-95 transition-transform"
      >
        <span className="text-xl">🤖</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-ascend-violet/15 via-ascend-fuchsia/10 to-ascend-gold/10 border border-ascend-violet/20 rounded-3xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia grid place-items-center text-lg shrink-0 shadow-md shadow-ascend-violet/20">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ascend-violet">AI Coach</span>
            <div className="flex items-center gap-1">
              <button onClick={refresh} className="text-[10px] text-zinc-500 active:scale-90 transition-transform p-1">↻</button>
              <button onClick={() => { setDismissed(true); sounds.buttonPress(); }} className="text-[10px] text-zinc-500 active:scale-90 transition-transform p-1">✕</button>
            </div>
          </div>
          <p className={`text-sm leading-relaxed text-zinc-200 ${expanded ? "" : "line-clamp-3"}`}>
            {message}
          </p>
          {message.length > 150 && (
            <button
              onClick={() => { setExpanded(!expanded); sounds.buttonPress(); }}
              className="text-[11px] font-bold text-ascend-violet mt-2 active:scale-95 transition-transform"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
