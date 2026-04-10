import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Navigation, X } from "lucide-react";
import { CompanyLogo } from "../CompanyLogo";
import { COMPANY_LEGAL_NAME } from "../../lib/companyBrand";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About", end: false },
  { to: "/contact", label: "Contact", end: false },
  { to: "/report-issue", label: "Report issue", end: false },
];

export function MarketingSiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      <div className="h-1 bg-ht-amber" aria-hidden />
      <div className="border-b border-ht-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <Link to="/" className="flex items-center gap-3 text-ht-navy">
            <CompanyLogo
              className={
                isHome
                  ? "h-12 w-auto max-w-[220px] object-contain object-left sm:h-14 sm:max-w-[270px] lg:h-[4.25rem] lg:max-w-[300px]"
                  : "h-9 w-auto max-w-[128px] object-contain object-left"
              }
              alt={COMPANY_LEGAL_NAME}
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline lg:text-base">{COMPANY_LEGAL_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? "text-ht-slate" : "text-slate-600 hover:text-ht-navy"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/quote"
              className="rounded-lg bg-ht-amber px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ht-amber-dark"
            >
              Get a quote
            </Link>
            <NavLink
              to="/driver"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                    : "border-emerald-600/80 bg-white text-emerald-800 hover:bg-emerald-50"
                }`
              }
            >
              <Navigation className="h-4 w-4" aria-hidden />
              Driver sign-in
            </NavLink>
            <Link
              to="/login"
              className="rounded-lg bg-ht-slate px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ht-slate-dark"
            >
              Staff login
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-ht-border bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3" aria-label="Main mobile">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `py-2 text-sm font-medium ${isActive ? "text-ht-slate" : "text-slate-600"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/quote"
                className="mt-2 rounded-lg bg-ht-amber py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Get a quote
              </Link>
              <NavLink
                to="/driver"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-center text-sm font-semibold ${
                    isActive
                      ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                      : "border-emerald-600 bg-emerald-50 text-emerald-900"
                  }`
                }
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Driver sign-in
              </NavLink>
              <Link
                to="/login"
                className="rounded-lg bg-ht-slate py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Staff / operations login
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
