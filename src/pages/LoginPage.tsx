import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Calculator, Home, Info, Mail } from "lucide-react";
import { CompanyLogo } from "../components/CompanyLogo";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { STAFF_LOGIN_WHY, STAFF_REQ } from "../lib/fieldRequirementCopy";
import { useAuth } from "../context/AuthContext";
import { recordActivityOnly } from "../lib/platformNotify";
import { PLATFORM_BASE } from "../routes/paths";

const publicNav = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/about", label: "About", Icon: Info },
  { to: "/contact", label: "Contact", Icon: Mail },
  { to: "/quote", label: "Get a quote", Icon: Calculator },
] as const;

const publicDestinations = [
  { to: "/", title: "Company website", subtitle: "Services, overview and how we work", Icon: Home },
  { to: "/about", title: "About us", subtitle: "Our approach and capabilities", Icon: Info },
  { to: "/contact", title: "Contact", subtitle: "Email, phone and enquiries", Icon: Mail },
  { to: "/quote", title: "Request a quote", subtitle: "Public quote wizard", Icon: Calculator },
] as const;

function destinationAfterAuth(location: ReturnType<typeof useLocation>) {
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  if (from && from.startsWith("/platform")) return from;
  return PLATFORM_BASE;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const loginMiss = useMemo(
    () => ({
      email: !email.trim(),
      password: !password,
    }),
    [email, password]
  );

  const quickFill = (em: string, name: string) => {
    setEmail(em);
    setPassword("");
    setSelectedQuick(name);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password. Quick login only fills email.");
      return;
    }
    if (login(email, password)) {
      const dest = destinationAfterAuth(location);
      try {
        recordActivityOnly("Signed in to operations", email.trim(), dest, "success");
      } catch {
        /* never block navigation */
      }
      navigate(dest, { replace: true });
    } else setError("Invalid email or password. Please try again.");
  };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-gradient-to-br from-ht-navy via-ht-navy-mid to-ht-slate"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ht-navy/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg text-white outline-none ring-offset-2 ring-offset-ht-navy hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-ht-amber"
          >
            <CompanyLogo className="h-8 w-auto max-w-[120px] object-contain object-left" alt="Hayleigh Transport" />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Hayleigh Transport</span>
          </Link>
          <nav aria-label="Public website" className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {publicNav.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/95 ring-white/40 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-3 sm:text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-10">
        <div className="flex w-full max-w-lg flex-col items-stretch">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl lg:p-8">
          <div className="mb-6 flex flex-col items-center lg:mb-8">
            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
              <CompanyLogo className="h-12 w-auto max-w-[200px] object-contain lg:h-14" />
            </div>
            <h1 className="text-center text-xl font-semibold text-gray-900 lg:text-2xl">
              Staff — operations login
            </h1>
            <p className="mt-2 text-center text-xs text-gray-500 lg:text-sm">
              Office and planners only. Drivers use a separate page.
            </p>
            <p className="mt-3 text-center text-xs">
              <Link to="/driver" className="font-medium text-ht-slate underline decoration-ht-slate/30 hover:decoration-ht-slate">
                Driver sign-in (jobs &amp; optional GPS)
              </Link>
              {" · "}
              <Link to="/" className="text-gray-600 underline decoration-gray-300 hover:text-gray-900">
                Company homepage
              </Link>
            </p>
          </div>

          {user && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-950">
                Already signed in as {user.name} ({user.email})
              </p>
              <p className="mt-1 text-xs text-emerald-900/85">
                Continue to operations, or sign out to use a different account.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={destinationAfterAuth(location)}
                  className="inline-flex items-center justify-center rounded-lg bg-ht-slate px-4 py-2 text-sm font-medium text-white hover:bg-ht-slate-dark"
                >
                  Continue to operations
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setEmail("");
                    setPassword("");
                    setSelectedQuick(null);
                    setError("");
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          <div className="mb-6 rounded-lg border border-ht-border bg-ht-canvas p-3 lg:p-4">
            <h3 className="mb-2 text-xs font-semibold text-ht-navy lg:text-sm">Quick login</h3>
            <p className="mb-3 text-xs text-slate-600">
              Select a user to fill email — you still need to enter the password below.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["keir@hayleigh.uk", "Keir", "DT/TT"],
                  ["scott@hayleigh.uk", "Scott", "DSO/TSO"],
                  ["nik@hayleigh.uk", "Nik", "DO/TO"],
                ] as const
              ).map(([em, name, label]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => quickFill(em, name)}
                  className={`rounded-lg border py-2 px-3 text-xs font-medium transition-all ${
                    selectedQuick === name
                      ? "border-ht-slate bg-ht-slate text-white"
                      : "border-ht-border bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {name}
                  <div className="mt-1 text-[10px] opacity-80">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <MissingFieldLegend />

          <WhyThisSection>{STAFF_LOGIN_WHY}</WhyThisSection>

          <form noValidate onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
                <ReqStar show={loginMiss.email} why={STAFF_REQ.email} />
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ht-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ht-slate/25"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
                <ReqStar show={loginMiss.password} why={STAFF_REQ.password} />
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ht-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ht-slate/25"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-ht-slate py-2.5 text-sm font-medium text-white hover:bg-ht-slate-dark"
            >
              Login
            </button>
          </form>
        </div>

        <div className="mt-8 w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md sm:p-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-400/90">Not logging in?</p>
          <p className="mt-1 text-center text-sm text-white/90">Go to the public site or request a quote</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {publicDestinations.map(({ to, title, subtitle, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-left transition hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-300">{subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </div>
  );
}
