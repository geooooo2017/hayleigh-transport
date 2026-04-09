/**
 * Shared “why we need this” copy and red asterisks for missing critical fields.
 */

export function WhyThisSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2.5 text-sm leading-relaxed text-sky-950">
      <span className="font-semibold text-sky-900">Why this matters: </span>
      <span className="text-sky-950/95">{children}</span>
    </div>
  );
}

/** Red asterisk when a critical value is still missing (tooltip explains why). */
export function ReqStar({ show, why }: { show: boolean; why: string }) {
  if (!show) return null;
  return (
    <span
      className="ml-0.5 align-super text-base font-bold leading-none text-red-600"
      title={why}
      aria-label={`Still required: ${why}`}
    >
      *
    </span>
  );
}

/** Legend for forms that use ReqStar */
export function MissingFieldLegend() {
  return (
    <p className="mb-4 text-xs text-gray-600">
      <span className="font-bold text-red-600">*</span> in red next to a label means that field is still empty or invalid.
      Hover the asterisk (or focus it) for a short reason. Complete all red-starred fields before saving or submitting.
    </p>
  );
}
