import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useJobs } from "../context/JobsContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { buildSearchHits, type SearchHit } from "../lib/platformSearch";
import type { Customer, Driver, Vehicle } from "../types";
import { platformPath } from "../routes/paths";

export function HeaderSearch() {
  const navigate = useNavigate();
  const [jobs] = useJobs();
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const hits = useMemo(
    () => buildSearchHits(debounced, jobs, customers, drivers, vehicles),
    [debounced, jobs, customers, drivers, vehicles]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (h: SearchHit) => {
    setOpen(false);
    setQuery("");
    setDebounced("");
    if (h.kind === "job") {
      navigate(platformPath(`/jobs/${h.id}`));
      return;
    }
    if (h.kind === "customer") {
      navigate(`${platformPath("/customers")}?q=${encodeURIComponent(h.title)}`);
      return;
    }
    navigate(`${platformPath("/drivers-vehicles")}?q=${encodeURIComponent(h.title)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && hits.length > 0) {
      e.preventDefault();
      go(hits[0]);
    }
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="header-search-results"
        placeholder="Search jobs, customers, drivers…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-ht-border bg-ht-canvas py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ht-slate/20"
      />
      {open && debounced.trim().length >= 2 && (
        <div
          id="header-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-ht-border bg-white py-1 shadow-lg"
        >
          {hits.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
          ) : (
            hits.map((h, i) => (
              <button
                key={`${h.kind}-${h.id}-${i}`}
                type="button"
                role="option"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-ht-canvas"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(h)}
              >
                <span className="font-medium text-gray-900">
                  <span className="text-xs font-normal uppercase text-gray-400">{h.kind} · </span>
                  {h.title}
                </span>
                <span className="line-clamp-1 text-xs text-gray-600">{h.subtitle}</span>
              </button>
            ))
          )}
        </div>
      )}
      {open && debounced.trim().length > 0 && debounced.trim().length < 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-ht-border bg-white px-3 py-2 text-xs text-gray-500 shadow-lg">
          Type at least 2 characters
        </div>
      )}
    </div>
  );
}
