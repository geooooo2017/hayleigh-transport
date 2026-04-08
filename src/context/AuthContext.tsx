import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** One shared password for all staff accounts until you change it in code or add a real backend. */
export const STAFF_INITIAL_PASSWORD = "hayleigh2026";

const accounts: Record<
  string,
  {
    password: string;
    user: User;
  }
> = {
  "keir@hayleigh.uk": {
    password: STAFF_INITIAL_PASSWORD,
    user: {
      id: "keir",
      name: "Keir",
      email: "keir@hayleigh.uk",
      domesticRef: "DT",
      internationalRef: "TT",
    },
  },
  "scott@hayleigh.uk": {
    password: STAFF_INITIAL_PASSWORD,
    user: {
      id: "scott",
      name: "Scott",
      email: "scott@hayleigh.uk",
      domesticRef: "DSO",
      internationalRef: "TSO",
    },
  },
  "nik@hayleigh.uk": {
    password: STAFF_INITIAL_PASSWORD,
    user: {
      id: "nik",
      name: "Nik",
      email: "nik@hayleigh.uk",
      domesticRef: "DO",
      internationalRef: "TO",
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      /* ignore */
    }
  }, []);

  const login = (email: string, password: string) => {
    const key = email.trim().toLowerCase();
    const row = accounts[key];
    if (!row || row.password !== password) return false;
    setUser(row.user);
    localStorage.setItem("currentUser", JSON.stringify(row.user));
    localStorage.setItem("isLoggedIn", "true");
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
