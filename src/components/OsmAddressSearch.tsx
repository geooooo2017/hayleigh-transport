import { useCallback, useState } from "react";
import { searchNominatimAddresses, type NominatimAddressChoice } from "../lib/nominatimAddressSearch";
import type { PlaceResolvedPayload } from "../lib/googlePlaceToAddress";
import { Btn } from "./Layout";

type Props = {
  routeType: "domestic" | "international";
  onPick: (payload: PlaceResolvedPayload) => void;
};

/**
 * Free-text address search using OpenStreetMap Nominatim (no API key).
 * Uses a Search button + result list to avoid hammering the public service.
 */
export default function OsmAddressSearch({ routeType, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimAddressChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setMessage(null);
    setResults([]);
    if (q.length < 3) {
      setMessage("Enter at least 3 characters.");
      return;
    }
    setBusy(true);
    try {
      const countryCode = routeType === "domestic" ? "gb" : undefined;
      const list = await searchNominatimAddresses(q, { countryCode });
      setResults(list);
      if (list.length === 0) setMessage("No matches — try a street name with town or postcode.");
    } catch {
      setMessage("Search failed — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [query, routeType]);

  const apply = (row: NominatimAddressChoice) => {
    const { displayName: _d, ...payload } = row;
    onPick(payload);
    setResults([]);
    setQuery("");
    setMessage(null);
  };

  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium text-gray-700">Look up address (free — OpenStreetMap)</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          type="text"
          autoComplete="off"
          placeholder="Street, business name, or place…"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2"
        />
        <Btn type="button" variant="outline" className="shrink-0" disabled={busy} onClick={() => void runSearch()}>
          {busy ? "Searching…" : "Search"}
        </Btn>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        No API key needed. Please use sparingly (about one search per second). Results may need a quick edit.{" "}
        <a
          className="text-emerald-800 underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        .
      </p>
      {message ? <p className="mt-2 text-xs text-amber-800">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm">
          {results.map((row, i) => (
            <li key={`${row.displayName}-${i}`}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-gray-800 hover:bg-emerald-50"
                onClick={() => apply(row)}
              >
                {row.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
