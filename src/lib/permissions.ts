import type { User } from "../types";

/** Only Nik may permanently remove jobs from the system (Settings explains this). */
export function userCanDeleteJobs(user: User | null): boolean {
  return user?.id === "nik";
}
