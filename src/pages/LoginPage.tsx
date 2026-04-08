import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const quickFill = (em: string, pw: string, name: string) => {
    setEmail(em);
    setPassword(pw);
    setSelectedQuick(name);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (login(email, password)) navigate("/");
    else setError("Invalid email or password. Please try again.");
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2563EB] to-[#1e40af] p-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-xl lg:p-8">
          <div className="mb-6 flex flex-col items-center lg:mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] lg:h-16 lg:w-16">
              <Truck size={28} className="text-white" />
            </div>
            <h1 className="text-center text-xl font-semibold text-gray-900 lg:text-2xl">
              Transport Operations Platform
            </h1>
            <p className="mt-2 text-center text-xs text-gray-500 lg:text-sm">
              Manage jobs, scheduling and transport operations in one place
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 lg:p-4">
            <h3 className="mb-2 text-xs font-semibold text-blue-900 lg:text-sm">Quick Login</h3>
            <p className="mb-3 text-xs text-blue-700">Select a user to auto-fill credentials:</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["keir@transportops.com", "keir123", "Keir", "DT/TT"],
                  ["scott@transportops.com", "scott123", "Scott", "DSO/TSO"],
                  ["nik@transportops.com", "nik123", "Nik", "DO/TO"],
                ] as const
              ).map(([em, pw, name, label]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => quickFill(em, pw, name)}
                  className={`rounded-lg border py-2 px-3 text-xs font-medium transition-all ${
                    selectedQuick === name
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-medium text-white hover:bg-[#1e40af]"
            >
              Login
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-white">
          Full demo access - Click any user above to login
        </p>
        <p className="mt-4 text-center text-sm text-blue-100">
          <a href="/quote" className="underline hover:text-white">
            Public: Get an instant quote
          </a>
        </p>
      </div>
    </div>
  );
}
