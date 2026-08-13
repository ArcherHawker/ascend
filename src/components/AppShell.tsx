import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { sounds } from "@/lib/sounds";

const TABS = [
  { to: "/home", icon: "🏠", label: "Home" },
  { to: "/explore", icon: "🧭", label: "Explore" },
  { to: "/adventure-map", icon: "🗺️", label: "Map" },
  { to: "/shop", icon: "🪙", label: "Shop" },
  { to: "/journal", icon: "📖", label: "Journal" },
  { to: "/stats", icon: "📊", label: "Stats" },
  { to: "/profile", icon: "👤", label: "Profile" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Scroll to top on route change for app-like behavior
  useEffect(() => {
    const main = document.getElementById("app-scroll");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="fixed inset-0 bg-nebula text-zinc-100 overflow-hidden" style={{ color: "var(--text-primary)" }}>
      <div
        id="app-scroll"
        className="absolute inset-0 max-w-md mx-auto px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="aurora-bg opacity-70" />
        <div className="starfield opacity-60" />
        <div key={pathname} className="relative z-10 pb-4 animate-page-enter">{children}</div>
      </div>
      <nav
        className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-sm h-16 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-around px-2 z-50 shadow-2xl shadow-black/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={() => sounds.pageTransition()}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90 ${active ? "text-ascend-violet" : "text-zinc-500"}`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className={`text-xl transition-transform duration-200 ${active ? "scale-110 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" : ""}`}>
                {t.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
              {active && <span className="absolute -bottom-0.5 h-0.5 w-6 rounded-full bg-gradient-to-r from-ascend-violet to-ascend-gold" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
