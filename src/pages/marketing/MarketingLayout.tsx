import { type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CompanyLogo } from "../../components/CompanyLogo";
import { MarketingSiteHeader } from "../../components/marketing/MarketingSiteHeader";
import { OFFICE_ENQUIRIES_EMAIL } from "../../lib/companyBrand";

export function MarketingLayout({ children }: { children?: ReactNode }) {
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

      <MarketingSiteHeader />

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
                <Link to="/driver" className="hover:text-white">
                  Driver sign-in
                </Link>
                <Link to="/login" className="hover:text-white">
                  Staff operations login
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
