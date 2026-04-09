import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Calculator,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { HeaderSearch } from "./HeaderSearch";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { useJobsSync } from "../context/JobsContext";
import { PLATFORM_BASE, platformPath } from "../routes/paths";

const nav = [
  { name: "Dashboard", path: PLATFORM_BASE, icon: LayoutDashboard },
  { name: "Job Board", path: platformPath("/job-board"), icon: ClipboardList },
  { name: "Jobs", path: platformPath("/jobs"), icon: Truck },
  { name: "Live Tracking", path: platformPath("/live-tracking"), icon: MapPin },
  { name: "Finance Calculator", path: platformPath("/finance-calculator"), icon: Calculator },
  { name: "Financial Tracking", path: platformPath("/financial-tracking"), icon: Wallet },
  { name: "Customer Invoicing", path: platformPath("/customer-invoicing"), icon: Receipt },
  { name: "Customers", path: platformPath("/customers"), icon: Users },
  { name: "Drivers & Vehicles", path: platformPath("/drivers-vehicles"), icon: Truck },
  { name: "Statistics Centre", path: platformPath("/statistics"), icon: BarChart3 },
  { name: "Monthly Report", path: platformPath("/monthly-report"), icon: FileBarChart },
  { name: "Settings", path: platformPath("/settings"), icon: Settings },
];

function initials(name: string | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { syncMode, cloudLoading, cloudError } = useJobsSync();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const doLogout = () => {
    logout();
    navigate("/");
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-ht-canvas" style={{ fontFamily: "Inter, sans-serif" }}>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-ht-border border-l-4 border-l-ht-amber bg-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="flex-1 overflow-y-auto p-6">
          <Link
            to="/"
            className="mb-8 flex items-center gap-3 rounded-lg outline-none ring-offset-2 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ht-slate"
          >
            <CompanyLogo className="h-10 w-auto max-w-[140px] shrink-0 object-contain object-left" />
            <span className="sr-only">Hayleigh Transport</span>
          </Link>
          {user && (
            <div className="mb-6 rounded-lg border border-ht-border bg-ht-canvas p-3">
              <div className="mb-2 flex items-center gap-2">
                <Truck size={16} className="text-ht-slate" />
                <span className="text-sm font-semibold text-gray-900">{user.name}</span>
              </div>
              <div className="text-xs text-gray-600">
                <div>
                  Domestic: {user.domesticRef}
                </div>
                <div>
                  International: {user.internationalRef}
                </div>
              </div>
            </div>
          )}
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === PLATFORM_BASE}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? "bg-ht-slate text-white" : "text-slate-700 hover:bg-ht-canvas"
                    }`
                  }
                >
                  <Icon size={20} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-ht-border p-4">
          <Link
            to="/login"
            onClick={doLogout}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50"
          >
            <LogOut size={18} />
            Logout
          </Link>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-10 h-16 border-b border-ht-border bg-white lg:left-64">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="mx-2 flex min-w-0 flex-1 md:mx-4">
            <HeaderSearch />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-4">
            <NotificationsDropdown />
            <div className="hidden items-center gap-3 lg:flex">
              <div className="hidden text-right lg:block">
                <div className="text-sm font-medium">{user?.name ?? "Guest"}</div>
                <div className="text-xs text-gray-500">
                  {user?.domesticRef}/{user?.internationalRef}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ht-slate text-sm font-semibold text-white">
                {user ? initials(user.name) : "?"}
              </div>
            </div>
            <button
              type="button"
              onClick={doLogout}
              className="flex items-center gap-2 rounded-lg border border-ht-border px-3 py-1.5 text-sm hover:bg-ht-canvas"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {syncMode === "cloud" && (
        <div
          className={`fixed left-0 right-0 top-16 z-[5] border-b px-4 py-2 text-center text-xs lg:left-64 ${
            cloudError
              ? "border-red-200 bg-red-50 text-red-800"
              : cloudLoading
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {cloudError
            ? `Could not sync jobs: ${cloudError}`
            : cloudLoading
              ? "Loading shared jobs…"
              : "Jobs are stored in the cloud — everyone on your team sees the same list. Changes from others appear within a few seconds."}
        </div>
      )}

      <main
        className={`min-h-screen lg:ml-64 ${syncMode === "cloud" ? "pt-[7rem]" : "pt-16"}`}
      >
        <div className="p-4 lg:p-6">
          <RouteErrorBoundary key={pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`rounded-xl border border-ht-border bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Btn({
  className = "",
  variant = "primary",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-ht-slate text-white hover:bg-ht-slate-dark"
      : "border border-ht-border bg-white hover:bg-ht-canvas";
  return <button type={type} className={`${base} ${styles} ${className}`} {...rest} />;
}

export { ChevronRight };
