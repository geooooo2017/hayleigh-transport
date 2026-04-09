import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";

type ChangePasswordResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => ChangePasswordResult;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUserJson(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as unknown;
    if (!u || typeof u !== "object") return null;
    const o = u as Record<string, unknown>;
    if (
      typeof o.id !== "string" ||
      typeof o.name !== "string" ||
      typeof o.email !== "string" ||
      typeof o.domesticRef !== "string" ||
      typeof o.internationalRef !== "string"
    ) {
      return null;
    }
    return {
      id: o.id,
      name: o.name,
      email: o.email,
      domesticRef: o.domesticRef,
      internationalRef: o.internationalRef,
    };
  } catch {
    return null;
  }
}

function readStoredUser(): User | null {
  try {
    return parseStoredUserJson(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

/** One shared password for all staff accounts until changed under Settings. */
export const STAFF_INITIAL_PASSWORD = "hayleigh2026";

const PASSWORD_OVERRIDES_KEY = "ht_staff_password_overrides";

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

function readPasswordOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORD_OVERRIDES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === "object" ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writePasswordOverrides(next: Record<string, string>) {
  localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(next));
}

function effectivePassword(emailKey: string): string | null {
  const acc = accounts[emailKey];
  if (!acc) return null;
  const overrides = readPasswordOverrides();
  return overrides[emailKey] ?? acc.password;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /** Sync read on first paint so /platform doesn’t bounce to /login before hydration (Strict Mode safe). */
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "currentUser") return;
      setUser(parseStoredUserJson(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const key = email.trim().toLowerCase();
    const expected = effectivePassword(key);
    if (expected === null || expected !== password) return false;
    const row = accounts[key];
    if (!row) return false;
    setUser(row.user);
    localStorage.setItem("currentUser", JSON.stringify(row.user));
    localStorage.setItem("isLoggedIn", "true");
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
  }, []);

  const changePassword = useCallback((currentPassword: string, newPassword: string): ChangePasswordResult => {
    if (!user) return { ok: false, error: "You are not signed in." };
    const key = user.email.trim().toLowerCase();
    if (!accounts[key]) return { ok: false, error: "This account cannot change password here." };
    const expected = effectivePassword(key);
    if (expected !== currentPassword) return { ok: false, error: "Current password is incorrect." };
    const trimmed = newPassword.trim();
    if (trimmed.length < 8) return { ok: false, error: "New password must be at least 8 characters." };
    const next = { ...readPasswordOverrides(), [key]: trimmed };
    writePasswordOverrides(next);
    return { ok: true };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      changePassword,
      isAuthenticated: !!user,
    }),
    [user, login, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
