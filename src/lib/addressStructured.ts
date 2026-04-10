/** Split / join site address for forms while keeping storage as newline-separated `*AddressLines`. */

export type StructuredAddressParts = {
  organisation: string;
  line1: string;
  line2: string;
  town: string;
};

export function joinStructuredAddressLines(parts: StructuredAddressParts): string {
  return [parts.organisation, parts.line1, parts.line2, parts.town]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/** Best-effort parse of legacy textarea / saved multiline values into separate fields. */
export function splitSavedAddressLines(multiline: string): StructuredAddressParts {
  const lines = multiline
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { organisation: "", line1: "", line2: "", town: "" };
  }
  if (lines.length === 1) {
    return { organisation: "", line1: lines[0], line2: "", town: "" };
  }
  if (lines.length === 2) {
    return { organisation: "", line1: lines[0], line2: "", town: lines[1] };
  }
  if (lines.length === 3) {
    return { organisation: "", line1: lines[0], line2: lines[1], town: lines[2] };
  }
  return {
    organisation: lines[0],
    line1: lines[1],
    line2: lines[2],
    town: lines.slice(3).join(", "),
  };
}
