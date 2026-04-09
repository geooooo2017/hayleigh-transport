import { Outlet } from "react-router-dom";
import { MarketingSiteHeader } from "../../components/marketing/MarketingSiteHeader";

/** Public driver flows with the same top bar as the company website. */
export function DriverAreaLayout() {
  return (
    <div className="min-h-screen bg-ht-canvas text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to Content
      </a>
      <MarketingSiteHeader />
      <main
        id="main"
        className="pb-[env(safe-area-inset-bottom,0px)]"
      >
        <Outlet />
      </main>
    </div>
  );
}
