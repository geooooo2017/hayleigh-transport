export type PlaceResolvedPayload = {
  organisation: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  lat?: number;
  lng?: number;
};

function longName(comps: google.maps.GeocoderAddressComponent[], type: string): string {
  return comps.find((c) => c.types.includes(type))?.long_name ?? "";
}

/**
 * Maps a Places `PlaceResult` into UK-oriented address lines + postcode.
 * Works for street addresses and many business / POI listings.
 */
export function parseGooglePlaceToStructured(place: google.maps.places.PlaceResult): PlaceResolvedPayload {
  const comps = place.address_components ?? [];
  const streetNumber = longName(comps, "street_number");
  const route = longName(comps, "route");
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();

  const subpremise = longName(comps, "subpremise");
  const premise = longName(comps, "premise");
  let line2 = [subpremise, premise].filter(Boolean).join(", ").trim();

  const postalTown = longName(comps, "postal_town");
  const locality = longName(comps, "locality");
  const sublocal = longName(comps, "sublocality") || longName(comps, "sublocality_level_1");
  const admin2 = longName(comps, "administrative_area_level_2");
  const town = postalTown || locality || sublocal || admin2 || "";

  const postcode = longName(comps, "postal_code");

  const types = place.types ?? [];
  const namedPoi = types.includes("establishment") || types.includes("point_of_interest");
  let organisation = "";
  if (place.name && namedPoi) {
    organisation = place.name;
    if (premise && premise.toLowerCase() === place.name.toLowerCase()) {
      line2 = subpremise || "";
    }
  }

  let lat: number | undefined;
  let lng: number | undefined;
  const loc = place.geometry?.location;
  if (loc) {
    const la = loc.lat;
    const ln = loc.lng;
    lat = typeof la === "function" ? la() : la;
    lng = typeof ln === "function" ? ln() : ln;
  }

  return { organisation, line1, line2, town, postcode, lat, lng };
}
