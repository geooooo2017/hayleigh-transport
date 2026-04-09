import { toast } from "sonner";
import { appendPlatformActivity } from "./platformActivityLog";

type Opts = { description?: string; duration?: number; href?: string };

/** Toast + bell activity (success). */
export function notifySuccess(message: string, opts?: Opts) {
  appendPlatformActivity({ title: message, detail: opts?.description, href: opts?.href, tone: "success" });
  return toast.success(message, { description: opts?.description, duration: opts?.duration });
}

/** Toast + bell activity (neutral / info). */
export function notifyMessage(message: string, opts?: Opts) {
  appendPlatformActivity({ title: message, detail: opts?.description, href: opts?.href, tone: "info" });
  return toast.message(message, { description: opts?.description, duration: opts?.duration });
}

/** Toast only — use for validation errors (avoid flooding the bell). */
export function notifyError(message: string, opts?: { description?: string; duration?: number }) {
  return toast.error(message, opts);
}

/** Toast + bell (warning). */
export function notifyWarning(message: string, opts?: Opts) {
  appendPlatformActivity({ title: message, detail: opts?.description, href: opts?.href, tone: "warning" });
  return toast.warning(message, { description: opts?.description, duration: opts?.duration });
}

/** Bell only (no toast) — login, or actions that already show inline UI. */
export function recordActivityOnly(
  title: string,
  detail?: string,
  href?: string,
  tone: "success" | "info" | "warning" = "info"
) {
  appendPlatformActivity({ title, detail, href, tone });
}
