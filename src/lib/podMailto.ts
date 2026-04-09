/** Browsers cannot attach files via mailto — we download the POD then open the compose window. */
export const MAX_POD_STORE_BYTES = 450 * 1024;

export function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function buildPodMailtoUrl(opts: {
  to: string;
  jobNumber: string;
  customerName: string;
  handlerName?: string;
}): string {
  const { to, jobNumber, customerName, handlerName } = opts;
  const subject = `Proof of delivery — ${jobNumber}`;
  const body = `Dear ${customerName},\n\nPlease find attached proof of delivery for transport job ${jobNumber}.\n\nKind regards${handlerName ? `,\n${handlerName}` : ""}`;
  return `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName || "POD", { type: blob.type || "application/octet-stream" });
}

export function downloadBlobUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.replace(/[/\\?%*:|"<>]/g, "-") || "POD";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function openMailtoUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
