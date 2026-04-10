import { getSupabase } from "./supabase";

/** Notifications for new support tickets (GSS / Hayleigh IT). */
export const SUPPORT_NOTIFY_EMAIL = "george.sweeney@gssolutionsgroup.co.uk";

const LOCAL_KEY = "ht_support_tickets_v1";

export type SupportCategory = "technical" | "change_request";

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  category: SupportCategory;
  reporterName: string;
  reporterEmail: string;
  reporterCompany: string;
  description: string;
  screenshotDataUrl: string | null;
  pageUrl: string | null;
  createdAt: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedNote: string | null;
};

type Row = {
  id: string;
  ticket_number: string;
  category: SupportCategory;
  reporter_name: string;
  reporter_email: string;
  reporter_company: string;
  description: string;
  screenshot_data_url: string | null;
  page_url: string | null;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_note: string | null;
};

function rowToTicket(r: Row): SupportTicket {
  return {
    id: r.id,
    ticketNumber: r.ticket_number,
    category: r.category,
    reporterName: r.reporter_name,
    reporterEmail: r.reporter_email,
    reporterCompany: r.reporter_company,
    description: r.description,
    screenshotDataUrl: r.screenshot_data_url,
    pageUrl: r.page_url,
    createdAt: r.created_at,
    resolved: r.resolved,
    resolvedAt: r.resolved_at,
    resolvedNote: r.resolved_note,
  };
}

function readLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as SupportTicket[];
  } catch {
    return [];
  }
}

function writeLocalTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(tickets));
  } catch {
    /* quota */
  }
}

function generateTicketNumber(): string {
  const y = new Date().getFullYear();
  const n = Math.floor(10000 + Math.random() * 90000);
  return `HT-${y}-${n}`;
}

export function supportTicketsCloudConfigured(): boolean {
  return Boolean(getSupabase());
}

export async function loadSupportTickets(): Promise<SupportTicket[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (!error) {
      return ((data ?? []) as Row[]).map(rowToTicket);
    }
    console.warn("support_tickets load:", error.message);
  }
  return readLocalTickets().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export type SubmitSupportInput = {
  category: SupportCategory;
  reporterName: string;
  reporterEmail: string;
  reporterCompany: string;
  description: string;
  screenshotDataUrl: string | null;
  pageUrl: string | null;
};

export type SubmitSupportResult =
  | { ok: true; ticket: SupportTicket; mailtoHref: string }
  | { ok: false; error: string };

export async function submitSupportTicket(input: SubmitSupportInput): Promise<SubmitSupportResult> {
  const t = (s: string) => s.trim();
  if (!t(input.description)) {
    return { ok: false, error: "Please describe the issue or request." };
  }

  const ticketNumber = generateTicketNumber();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const ticket: SupportTicket = {
    id,
    ticketNumber,
    category: input.category,
    reporterName: t(input.reporterName),
    reporterEmail: t(input.reporterEmail),
    reporterCompany: t(input.reporterCompany),
    description: t(input.description),
    screenshotDataUrl: input.screenshotDataUrl,
    pageUrl: input.pageUrl,
    createdAt,
    resolved: false,
    resolvedAt: null,
    resolvedNote: null,
  };

  const sb = getSupabase();
  if (sb) {
    const row = {
      id: ticket.id,
      ticket_number: ticket.ticketNumber,
      category: ticket.category,
      reporter_name: ticket.reporterName,
      reporter_email: ticket.reporterEmail,
      reporter_company: ticket.reporterCompany,
      description: ticket.description,
      screenshot_data_url: ticket.screenshotDataUrl,
      page_url: ticket.pageUrl,
      created_at: ticket.createdAt,
      resolved: false,
      resolved_at: null,
      resolved_note: null,
    };
    const { error } = await sb.from("support_tickets").insert(row);
    if (error) {
      return { ok: false, error: error.message || "Could not save your report. Try again or email us directly." };
    }
  } else {
    const list = readLocalTickets();
    list.unshift(ticket);
    writeLocalTickets(list);
  }

  const subject = `Support ticket ${ticket.ticketNumber} (${ticket.category === "technical" ? "Technical" : "Change request"})`;
  const bodyLines = [
    `Ticket: ${ticket.ticketNumber}`,
    `Category: ${ticket.category === "technical" ? "Technical issue" : "Change request"}`,
    `Name: ${ticket.reporterName || "—"}`,
    `Email: ${ticket.reporterEmail || "—"}`,
    `Company: ${ticket.reporterCompany || "—"}`,
    `Page: ${ticket.pageUrl || "—"}`,
    "",
    "Description:",
    ticket.description,
    "",
    ticket.screenshotDataUrl
      ? "A screenshot was attached in the web form — please add it manually from the file you selected if it did not attach automatically."
      : "No screenshot uploaded.",
    "",
    `Submitted: ${new Date(ticket.createdAt).toLocaleString("en-GB")}`,
  ];
  const mailtoHref = `mailto:${SUPPORT_NOTIFY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

  return { ok: true, ticket, mailtoHref };
}

export async function setSupportTicketResolved(
  ticketId: string,
  resolved: boolean,
  resolvedNote?: string
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb
      .from("support_tickets")
      .update({
        resolved,
        resolved_at: resolved ? now : null,
        resolved_note: resolved ? (resolvedNote?.trim() || null) : null,
      })
      .eq("id", ticketId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const list = readLocalTickets();
  const idx = list.findIndex((x) => x.id === ticketId);
  if (idx < 0) return { ok: false, error: "Ticket not found" };
  list[idx] = {
    ...list[idx],
    resolved,
    resolvedAt: resolved ? now : null,
    resolvedNote: resolved ? (resolvedNote?.trim() || null) : null,
  };
  writeLocalTickets(list);
  return { ok: true };
}

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: "Technical issue",
  change_request: "Change request",
};
