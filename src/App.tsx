import * as React from "react";
import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./store/AppContext";
import Landing from "./pages/Landing";
import { Login, Reset, Signup } from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Memories, { MemoryDetail } from "./pages/Memories";
import Gallery from "./pages/Gallery";
import Notes from "./pages/Notes";
import Timeline from "./pages/Timeline";
const Places = lazy(() => import("./pages/Places"));
const Photobooth = lazy(() => import("./components/photobooth/Photobooth"));
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import More from "./pages/More";
import { DesktopSidebar, MobileNav, QuickAddSheet, TopBar } from "./components/layout/chrome";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  const loc = useLocation();
  if (authLoading) return <Splash text="opening your diary…" />;
  if (!user) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

function RequireCouple({ children }: { children: React.ReactNode }) {
  const { couple, dataLoading, user } = useApp();
  if (!user) return <>{children}</>;
  if (dataLoading) return <Splash text="pressing flowers…" />;
  if (!couple) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function Splash({ text }: { text: string }) {
  return (
    <div className="paper-grain min-h-dvh grid place-items-center" role="status" aria-live="polite" aria-busy="true">
      <div className="text-center">
        <div className="font-display font-semibold text-[34px] tracking-tight">twofold</div>
        <div className="font-hand text-[22px] text-[#8A7F72] mt-1 animate-pulse">{text}</div>
      </div>
    </div>
  );
}

function AuthedShell() {
  const [addOpen, setAddOpen] = useState(false);
  const loc = useLocation();
  const titles: Record<string, [string, string]> = {
    "/home": ["Home", "open sesame ♡"],
    "/memories": ["Memories", "every page of us"],
    "/gallery": ["Photos", "fresh off the film"],
    "/notes": ["Notes", "passed back & forth"],
    "/timeline": ["Our story", "chapter by chapter"],
    "/places": ["Our places", "little dots, big feelings"],
    "/wishlist": ["Wishlist", "someday, together"],
    "/profile": ["Profile", "make it yours"],
    "/more": ["More", "everything else"],
  };
  const base = "/" + (loc.pathname.split("/")[1] || "home");
  const [title, sub] = titles[base] || titles["/home"];
  const hideChrome = (loc.pathname.startsWith("/memories/") && loc.pathname !== "/memories") || loc.pathname === "/photobooth";
  const isBooth = loc.pathname === "/photobooth";

  // Close Quick Add on navigation so it doesn't linger over new pages
  React.useEffect(() => {
    setAddOpen(false);
  }, [loc.pathname]);

  return (
    <div className="paper-grain min-h-dvh lg:flex lg:items-stretch">
      <DesktopSidebar />
      <div className="flex-1 min-w-0 lg:max-w-[1060px] lg:mx-auto w-full overflow-x-hidden overflow-y-visible">
        {!hideChrome && loc.pathname !== "/home" && <TopBar title={title} subtitle={sub} />}
        {loc.pathname === "/home" && (
          <div className="lg:hidden sticky top-0 z-40 bg-[#FAF6EF]/92 backdrop-blur border-b border-[#E5DAC6] px-4 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2.5 text-center">
            <div className="font-display font-semibold text-[21px] tracking-tight">twofold</div>
            <div className="font-hand text-[16px] text-[#8A7F72] leading-none">Two Lives, one story.</div>
          </div>
        )}
        <main className={isBooth ? "lg:px-4" : "pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-16 lg:px-4"}>
          <Routes>
            <Route path="/home" element={<Home onAdd={() => setAddOpen(true)} />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/memories/:id" element={<MemoryDetail />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/places" element={<Suspense fallback={<Splash text="unfolding the map…" />}><Places /></Suspense>} />
            <Route path="/photobooth" element={<Suspense fallback={<Splash text="setting up the booth…" />}><Photobooth /></Suspense>} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/more" element={<More />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
        {!isBooth && <MobileNav onAdd={() => setAddOpen(true)} />}
        <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    </div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading, dataLoading, couple } = useApp();
  const loc = useLocation();
  if (authLoading || dataLoading) return <Splash text="opening…" />;
  if (user && couple) return <Navigate to="/home" replace />;
  if (user && !couple && loc.pathname !== "/welcome") return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function RootIndex() {
  const loc = useLocation();
  if (loc.search.includes("code=") || loc.hash.includes("type=recovery")) {
    return <Navigate to={`/reset${loc.search}${loc.hash}`} replace />;
  }
  return <PublicRoute><Landing /></PublicRoute>;
}

function RootRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootIndex />} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/welcome" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/*" element={<RequireAuth><RequireCouple><AuthedShell /></RequireCouple></RequireAuth>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <RootRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
