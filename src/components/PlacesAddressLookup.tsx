import { useEffect, useRef } from "react";
import { parseGooglePlaceToStructured, type PlaceResolvedPayload } from "../lib/googlePlaceToAddress";
import { loadGooglePlacesScript } from "../lib/loadGooglePlaces";

type Props = {
  apiKey: string;
  routeType: "domestic" | "international";
  onResolved: (payload: PlaceResolvedPayload) => void;
};

/**
 * Google Places autocomplete (street + business). Requires `VITE_GOOGLE_MAPS_API_KEY` and Places API enabled for the key.
 */
export default function PlacesAddressLookup({ apiKey, routeType, onResolved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    let cancelled = false;
    const input = inputRef.current;
    if (!apiKey.trim() || !input) return;

    let listener: google.maps.MapsEventListener | null = null;

    loadGooglePlacesScript(apiKey.trim())
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const componentRestrictions =
          routeType === "domestic" ? ({ country: "gb" } as const) : undefined;
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["address_components", "geometry", "name", "formatted_address", "types"],
          componentRestrictions,
        });
        acRef.current = ac;
        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.address_components?.length && !place.name) return;
          onResolvedRef.current(parseGooglePlaceToStructured(place));
          if (inputRef.current) inputRef.current.value = "";
        });
      })
      .catch(() => {
        /* optional feature — silent if key/network fails */
      });

    return () => {
      cancelled = true;
      if (listener) google.maps.event.removeListener(listener);
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [apiKey, routeType]);

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      placeholder="Search street or business name…"
      className="w-full rounded-lg border border-gray-200 px-3 py-2"
    />
  );
}
