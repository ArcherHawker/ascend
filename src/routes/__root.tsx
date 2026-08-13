import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { AuthProvider } from "../lib/auth-context";
import "../lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian text-zinc-100 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-extrabold bg-linear-to-tr from-violet-glow to-electric bg-clip-text text-transparent">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the void</h2>
        <p className="mt-2 text-sm text-zinc-500">This realm hasn&apos;t opened yet.</p>
        <Link to="/home" className="mt-6 inline-flex items-center justify-center rounded-xl bg-violet-glow px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95">Return home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian text-zinc-100 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke the streak</h1>
        <p className="mt-2 text-sm text-zinc-500">Try again — your progress is safe.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-xl bg-violet-glow px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform">Try again</button>
          <a href="/" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100">Restart</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" },
      { name: "theme-color", content: "#0b0714" },
      { title: "Ascend — Level up your real life" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
