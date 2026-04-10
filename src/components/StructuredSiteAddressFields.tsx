import type { PlaceResolvedPayload } from "../lib/googlePlaceToAddress";
import { ReqStar } from "./FormGuidance";
import OsmAddressSearch from "./OsmAddressSearch";
import PlacesAddressLookup from "./PlacesAddressLookup";

export type StructuredSiteAddressFieldsProps = {
  title: string;
  wrapperClassName?: string;
  titleClassName: string;
  routeType: "domestic" | "international";
  googleMapsApiKey: string | undefined;
  organisation: string;
  line1: string;
  line2: string;
  town: string;
  onOrganisationChange: (v: string) => void;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onTownChange: (v: string) => void;
  onPlaceResolved: (p: PlaceResolvedPayload) => void;
  showAddressRequiredStar: boolean;
  addressRequiredWhy: string;
};

export function StructuredSiteAddressFields({
  title,
  wrapperClassName,
  titleClassName,
  routeType,
  googleMapsApiKey,
  organisation,
  line1,
  line2,
  town,
  onOrganisationChange,
  onLine1Change,
  onLine2Change,
  onTownChange,
  onPlaceResolved,
  showAddressRequiredStar,
  addressRequiredWhy,
}: StructuredSiteAddressFieldsProps) {
  const key = googleMapsApiKey?.trim();

  return (
    <div className={wrapperClassName}>
      <h3 className={titleClassName}>{title}</h3>
      {key ? (
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Look up address (Google)</label>
          <PlacesAddressLookup apiKey={key} routeType={routeType} onResolved={onPlaceResolved} />
          <p className="mt-1 text-xs text-gray-500">
            Type a street or company name and choose a suggestion to fill the fields. You can edit them afterwards.
          </p>
        </div>
      ) : (
        <OsmAddressSearch routeType={routeType} onPick={onPlaceResolved} />
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Organisation or building name
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <input
          value={organisation}
          onChange={(e) => onOrganisationChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="e.g. company or site name"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Address line 1
          <ReqStar show={showAddressRequiredStar} why={addressRequiredWhy} />
        </label>
        <input
          value={line1}
          onChange={(e) => onLine1Change(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="Street number and name"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Address line 2
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <input
          value={line2}
          onChange={(e) => onLine2Change(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="Unit, floor, estate…"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Town or city
          <ReqStar show={showAddressRequiredStar} why={addressRequiredWhy} />
        </label>
        <input
          value={town}
          onChange={(e) => onTownChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="Town / city"
          required
        />
      </div>
    </div>
  );
}
