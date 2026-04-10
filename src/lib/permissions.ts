import type { User } from "../types";

/** Any signed-in staff user may move jobs to the 90-day deleted bin (Settings). */
export function userCanDeleteJobs(user: User | null): boolean {
  return user != null;
}
