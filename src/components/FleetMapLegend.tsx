import { JOB_BOARD_MAP_COLORS } from "../lib/jobBoardVisual";
import { FLEET_VEHICLE_LEGEND_ITEMS, fleetVehicleSvgMarkup, type FleetVehicleCategory } from "../lib/fleetVehicleMapIcon";

type Props = {
  className?: string;
};

function VehicleLegendItem({ category, title, subtitle }: { category: FleetVehicleCategory; title: string; subtitle: string }) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border border-ht-border/80 bg-white/90 px-3 py-2 shadow-sm">
      <div
        className="fleet-map-legend-glyph flex h-11 w-[7.25rem] shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-[2.75rem] [&_svg]:drop-shadow-sm"
        dangerouslySetInnerHTML={{ __html: fleetVehicleSvgMarkup(category) }}
      />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-ht-navy">{title}</div>
        <div className="text-[11px] leading-snug text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

export function FleetMapLegend({ className }: Props) {
  return (
    <div
      className={`space-y-4 rounded-xl border border-ht-border bg-gradient-to-b from-white to-ht-canvas/60 p-4 ${className ?? ""}`}
    >
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ht-slate">Live GPS — vehicle icon</h3>
        <p className="mb-3 text-[11px] leading-snug text-slate-600">
          Which icon you see is chosen in this order: <strong>Drivers &amp; Vehicles</strong> (same registration as the
          driver, if map icon is not Auto) → <strong>job Live Tracking map icon</strong> (job create / detail) → job{" "}
          <strong>vehicle type</strong> text if present. &ldquo;Articulated lorry&rdquo; is road haulage (cab + trailer).
          Hayleigh-style <strong>white cab</strong> / <strong>navy body</strong>; <strong>green stripe</strong> = live;
          <strong>amber ring</strong> = following.
        </p>
        <div className="flex flex-wrap gap-2">
          {FLEET_VEHICLE_LEGEND_ITEMS.map((row) => (
            <VehicleLegendItem key={row.category} category={row.category} title={row.title} subtitle={row.subtitle} />
          ))}
        </div>
      </div>

      <div className="border-t border-ht-border/80 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ht-slate">Job stops &amp; routes</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-700">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow"
              style={{ background: JOB_BOARD_MAP_COLORS.booked }}
            />
            Collection
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow"
              style={{ background: JOB_BOARD_MAP_COLORS.delivered }}
            />
            Delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-1 w-8 shrink-0 rounded-full"
              style={{ background: JOB_BOARD_MAP_COLORS.inTransit, opacity: 0.9 }}
            />
            Planned leg
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-8 shrink-0 rounded-full bg-blue-700 opacity-90" />
            Live driver → delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow ring-2 ring-red-500/90"
              style={{ background: JOB_BOARD_MAP_COLORS.booked }}
            />
            Issue (incomplete job data)
          </span>
        </div>
      </div>
    </div>
  );
}
