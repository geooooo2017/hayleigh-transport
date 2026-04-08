import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { CompanyLogo } from "../../components/CompanyLogo";
import { COMPANY_LEGAL_NAME, OFFICE_ENQUIRIES_EMAIL } from "../../lib/companyBrand";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About", end: false },
  { to: "/contact", label: "Contact", end: false },
];

export function MarketingLayout({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const body = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-ht-canvas text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to Content
      </a>

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

          <nav className="hidden items-center gap-8 md:flex">
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

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/quote"
              className="rounded-lg bg-ht-amber px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ht-amber-dark"
            >
              Get a quote
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-ht-slate px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ht-slate-dark"
            >
              Operations login
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
            <nav className="flex flex-col gap-3">
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
              <Link
                to="/login"
                className="rounded-lg bg-ht-slate py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Operations login
              </Link>
            </nav>
          </div>
        )}
        </div>
      </header>

      <main id="main">{body}</main>

      <footer className="border-t border-ht-border bg-ht-navy text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <CompanyLogo
                className={
                  isHome
                    ? "mb-3 h-12 w-auto max-w-[200px] rounded object-contain object-left ring-1 ring-white/20 sm:h-14 sm:max-w-[240px]"
                    : "mb-3 h-10 w-auto max-w-[140px] rounded object-contain object-left ring-1 ring-white/20"
                }
              />
              <h3 className="text-lg font-semibold text-white">Hayleigh Transport</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                End-to-end logistics tailored to your business — freight, warehousing, distribution and last-mile
                delivery.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Contact</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a href={`mailto:${OFFICE_ENQUIRIES_EMAIL}`} className="hover:text-white">
                    {OFFICE_ENQUIRIES_EMAIL}
                  </a>
                </li>
                <li>
                  <a href="tel:01698480314" className="hover:text-white">
                    01698 480314
                  </a>
                </li>
                <li>
                  <a href="tel:07508144225" className="hover:text-white">
                    07508 144225
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Follow</h3>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link to="/about" className="hover:text-white">
                  About
                </Link>
                <Link to="/contact" className="hover:text-white">
                  Contact
                </Link>
                <Link to="/login" className="hover:text-white">
                  Operations platform
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-8 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Hayleigh Transport Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
