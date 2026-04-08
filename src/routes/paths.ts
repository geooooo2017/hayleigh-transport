/** Base path for the authenticated Transport Operations Platform (sidebar app). */
export const PLATFORM_BASE = "/platform";

export function platformPath(segment: string): string {
  if (!segment || segment === "/") return PLATFORM_BASE;
  const s = segment.startsWith("/") ? segment : `/${segment}`;
  return `${PLATFORM_BASE}${s}`;
}
