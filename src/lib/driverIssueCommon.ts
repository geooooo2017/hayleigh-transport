import type { DriverReportedIssue, DriverReportedIssueKind, Job } from "../types";

export function driverReportedIssueSig(j: Job): string {
  const r = j.driverReportedIssue;
  if (!r?.kind || !r.reportedAt) return "";
  const notes = (r.notes ?? "").trim();
  return `${r.reportedAt}|${r.kind}|${notes}`;
}

export function jobHasDriverReportedIssue(j: Job): boolean {
  return Boolean(j.driverReportedIssue?.kind && j.driverReportedIssue.reportedAt);
}

export function formatDriverIssueKindLabel(kind: DriverReportedIssueKind): string {
  switch (kind) {
    case "broken-down":
      return "Broken down";
    case "stuck-traffic":
      return "Stuck in traffic";
    case "other":
      return "Other";
    default:
      return kind;
  }
}

export function formatDriverIssueBellDetail(r: DriverReportedIssue): string {
  const head = formatDriverIssueKindLabel(r.kind);
  const n = (r.notes ?? "").trim();
  return n ? `${head} — ${n}` : head;
}

/** HTML line for map popups (caller escapes elsewhere). */
export function formatDriverIssuePopupLine(r: DriverReportedIssue): string {
  const n = (r.notes ?? "").trim();
  const base = formatDriverIssueKindLabel(r.kind);
  return n ? `${base}: ${n}` : base;
}
