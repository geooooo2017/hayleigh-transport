import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Calculator,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Receipt,
  Search,
  Settings,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const nav = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Job Board", path: "/job-board", icon: ClipboardList },
  { name: "Jobs", path: "/jobs", icon: Truck },
  { name: "Live Tracking", path: "/live-tracking", icon: MapPin },
  { name: "Finance Calculator", path: "/finance-calculator", icon: Calculator },
  { name: "Financial Tracking", path: "/financial-tracking", icon: Wallet },
  { name: "Customer Invoicing", path: "/customer-invoicing", icon: Receipt },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Drivers & Vehicles", path: "/drivers-vehicles", icon: Truck },
  { name: "Statistics Centre", path: "/statistics", icon: BarChart3 },
  { name: "Monthly Report", path: "/monthly-report", icon: FileBarChart },
  { name: "Settings", path: "/settings", icon: Settings },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
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
          <div className="mb-8 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#2563EB]" />
            <span className="text-lg font-semibold">Hayleigh Transport</span>
          </div>
          {user && (
            <div className="mb-6 rounded-lg bg-blue-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Truck size={16} className="text-[#2563EB]" />
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
                  end={item.path === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? "bg-[#2563EB] text-white" : "text-gray-700 hover:bg-gray-100"
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
        <div className="border-t border-gray-200 p-4">
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

      <header className="fixed left-0 right-0 top-0 z-10 h-16 border-b border-gray-200 bg-white lg:left-64">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="relative hidden max-w-xl flex-1 md:flex">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search jobs, customers, drivers..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 lg:gap-4">
            <button type="button" className="relative rounded-lg p-2 hover:bg-gray-100">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden items-center gap-3 lg:flex">
              <div className="hidden text-right lg:block">
                <div className="text-sm font-medium">{user?.name ?? "Guest"}</div>
                <div className="text-xs text-gray-500">
                  {user?.domesticRef}/{user?.internationalRef}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
                {user ? initials(user.name) : "?"}
              </div>
            </div>
            <button
              type="button"
              onClick={doLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-16 lg:ml-64">
        <div className="p-4 lg:p-6">
          <Outlet />
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
  return <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
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
      ? "bg-[#2563EB] text-white hover:bg-[#1e40af]"
      : "border border-gray-200 bg-white hover:bg-gray-50";
  return <button type={type} className={`${base} ${styles} ${className}`} {...rest} />;
}

export { ChevronRight };
