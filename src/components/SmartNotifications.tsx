import { useState, useEffect } from "react";
import { getActiveNotifications, dismissNotification, type SmartNotification } from "@/lib/notifications";
import { sounds } from "@/lib/sounds";

export function SmartNotifications() {
  const [notifs, setNotifs] = useState<SmartNotification[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setNotifs(getActiveNotifications());
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  if (notifs.length === 0) return null;

  const dismiss = (id: string) => {
    sounds.buttonPress();
    dismissNotification(id);
    setNotifs(getActiveNotifications());
  };

  return (
    <div className="space-y-2 mb-4">
      {notifs.slice(0, 3).map((n) => (
        <div
          key={n.id}
          className="bg-gradient-to-r from-ascend-violet/10 via-white/[0.03] to-ascend-gold/5 border border-white/10 rounded-2xl overflow-hidden transition-all"
        >
          <button
            onClick={() => { setExpanded(expanded === n.id ? null : n.id); sounds.buttonPress(); }}
            className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-transform"
          >
            <div className="size-10 rounded-xl bg-black/30 grid place-items-center text-xl shrink-0">
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{n.title}</p>
              {expanded === n.id ? (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{n.body}</p>
              ) : (
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">{n.body}</p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
              className="text-zinc-600 text-sm shrink-0 p-1 active:scale-90 transition-transform"
            >
              ✕
            </button>
          </button>
        </div>
      ))}
    </div>
  );
}
