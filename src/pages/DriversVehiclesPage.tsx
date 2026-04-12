import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Driver, LiveMapVehicleIconPreference, Vehicle } from "../types";
import { LIVE_MAP_VEHICLE_ICON_OPTIONS } from "../lib/fleetVehicleMapIcon";
import { formatVehicleRegistrationDisplay } from "../lib/driverPositionsApi";
import { Btn, Card } from "../components/Layout";

type VehicleModal = null | { mode: "add" } | { mode: "edit"; vehicle: Vehicle };

const emptyVehicleForm = () => ({
  name: "",
  registration: "",
  type: "HGV",
  motExpiry: "",
  status: "active",
  liveMapVehicleIcon: "auto" as LiveMapVehicleIconPreference,
});

export default function DriversVehiclesPage() {
  const [drivers, setDrivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [searchParams] = useSearchParams();
  const [filterQ, setFilterQ] = useState(() => searchParams.get("q") ?? "");
  const [vehicleModal, setVehicleModal] = useState<VehicleModal>(null);
  const [vForm, setVForm] = useState(emptyVehicleForm);

  useEffect(() => {
    setFilterQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const fq = filterQ.trim().toLowerCase();
  const driversShown = useMemo(() => {
    if (!fq) return drivers;
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(fq) ||
        d.phone.toLowerCase().includes(fq) ||
        d.licenseNumber.toLowerCase().includes(fq)
    );
  }, [drivers, fq]);
  const vehiclesShown = useMemo(() => {
    if (!fq) return vehicles;
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(fq) ||
        v.registration.toLowerCase().includes(fq) ||
        v.type.toLowerCase().includes(fq)
    );
  }, [vehicles, fq]);

  const [dOpen, setDOpen] = useState(false);
  const [dForm, setDForm] = useState({ name: "", phone: "", licenseNumber: "", licenseExpiry: "", status: "active" });

  const mapIconLabel = (v: Vehicle) =>
    LIVE_MAP_VEHICLE_ICON_OPTIONS.find((o) => o.value === (v.liveMapVehicleIcon ?? "auto"))?.label ?? "Auto";

  const saveVehicle = () => {
    if (!vForm.name.trim() || !vForm.registration.trim()) return notifyError("Name and registration required");
    const payload: Omit<Vehicle, "id"> = {
      name: vForm.name.trim(),
      registration: formatVehicleRegistrationDisplay(vForm.registration),
      type: vForm.type.trim() || "HGV",
      motExpiry: vForm.motExpiry.trim(),
      status: vForm.status,
      ...(vForm.liveMapVehicleIcon !== "auto" ? { liveMapVehicleIcon: vForm.liveMapVehicleIcon } : {}),
    };
    if (vehicleModal?.mode === "add") {
      setVehicles((x) => [...x, { id: Date.now(), ...payload }]);
      notifySuccess("Vehicle added", { href: platformPath("/drivers-vehicles") });
    } else if (vehicleModal?.mode === "edit") {
      setVehicles((x) =>
        x.map((y) => (y.id === vehicleModal.vehicle.id ? { ...y, ...payload, id: y.id } : y))
      );
      notifySuccess("Vehicle updated", { href: platformPath("/drivers-vehicles") });
    }
    setVehicleModal(null);
    setVForm(emptyVehicleForm());
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Drivers &amp; vehicles</h1>
          <p className="mt-1 text-gray-500">Fleet people and fleet units in one place — scheduling, compliance, and live map icons</p>
        </div>
        <input
          type="search"
          placeholder="Filter drivers & vehicles…"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          className="h-10 w-full max-w-xs rounded-lg border border-ht-border px-3 text-sm outline-none focus:ring-2 focus:ring-ht-slate/20"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-ht-border bg-slate-50/90 px-6 py-4">
          <p className="text-sm leading-relaxed text-gray-700">
            <strong className="text-gray-900">Why two lists in one screen?</strong> Drivers hold contact and licence details;
            vehicles hold registrations used to match live GPS pins and optional map shapes. Who drives which truck on a given
            day is set on each <strong>job</strong> (assigned driver + truck plates), not here — this page is your master list
            of both.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="border-b border-ht-border p-6 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Drivers</h2>
              <Btn className="gap-1 py-1.5 text-sm" onClick={() => setDOpen(true)}>
                <Plus size={14} /> Add
              </Btn>
            </div>
            <ul className="space-y-2">
              {driversShown.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-gray-500">{d.phone}</div>
                  </div>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => {
                      setDrivers((x) => x.filter((y) => y.id !== d.id));
                      notifySuccess("Driver removed", { href: platformPath("/drivers-vehicles") });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
              {drivers.length === 0 && <p className="text-sm text-gray-500">No drivers yet.</p>}
              {drivers.length > 0 && driversShown.length === 0 && (
                <p className="text-sm text-gray-500">No drivers match this filter.</p>
              )}
            </ul>
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Vehicles</h2>
              <Btn
                className="gap-1 py-1.5 text-sm"
                onClick={() => {
                  setVForm(emptyVehicleForm());
                  setVehicleModal({ mode: "add" });
                }}
              >
                <Plus size={14} /> Add
              </Btn>
            </div>
            <ul className="space-y-2">
              {vehiclesShown.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-gray-500">{v.registration}</div>
                    <div className="text-[11px] text-slate-500">Live map: {mapIconLabel(v)}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded p-1.5 text-ht-slate hover:bg-slate-100"
                      title="Edit vehicle"
                      onClick={() => {
                        setVForm({
                          name: v.name,
                          registration: formatVehicleRegistrationDisplay(v.registration),
                          type: v.type,
                          motExpiry: v.motExpiry,
                          status: v.status,
                          liveMapVehicleIcon: v.liveMapVehicleIcon ?? "auto",
                        });
                        setVehicleModal({ mode: "edit", vehicle: v });
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-red-600"
                      onClick={() => {
                        setVehicles((x) => x.filter((y) => y.id !== v.id));
                        notifySuccess("Vehicle removed", { href: platformPath("/drivers-vehicles") });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
              {vehicles.length === 0 && <p className="text-sm text-gray-500">No vehicles yet.</p>}
              {vehicles.length > 0 && vehiclesShown.length === 0 && (
                <p className="text-sm text-gray-500">No vehicles match this filter.</p>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {dOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md space-y-3 p-6">
            <h3 className="font-semibold">Add driver</h3>
            {(["name", "phone", "licenseNumber", "licenseExpiry"] as const).map((k) => (
              <div key={k}>
                <label className="text-xs text-gray-600">{k}</label>
                <input
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2"
                  value={dForm[k]}
                  onChange={(e) => setDForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Btn
                onClick={() => {
                  if (!dForm.name.trim()) return notifyError("Name required");
                  setDrivers((x) => [...x, { id: Date.now(), ...dForm }]);
                  notifySuccess("Driver added", { href: platformPath("/drivers-vehicles") });
                  setDOpen(false);
                  setDForm({ name: "", phone: "", licenseNumber: "", licenseExpiry: "", status: "active" });
                }}
              >
                Save
              </Btn>
              <Btn variant="outline" onClick={() => setDOpen(false)}>
                Cancel
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {vehicleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md space-y-3 p-6">
            <h3 className="font-semibold">{vehicleModal.mode === "edit" ? "Edit vehicle" : "Add vehicle"}</h3>
            {(["name", "registration", "type", "motExpiry"] as const).map((k) => (
              <div key={k}>
                <label className="text-xs text-gray-600">{k === "motExpiry" ? "MOT expiry" : k}</label>
                <input
                  className={`mt-1 w-full rounded border border-gray-200 px-3 py-2 ${k === "registration" ? "uppercase" : ""}`}
                  value={vForm[k]}
                  onChange={(e) =>
                    setVForm((f) => ({
                      ...f,
                      [k]: k === "registration" ? formatVehicleRegistrationDisplay(e.target.value) : e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-600">Live Tracking map icon</label>
              <p className="mb-1 text-[11px] text-gray-500">
                When this registration matches a driver on the map, use this shape. Auto follows the job setting or vehicle
                type text.
              </p>
              <select
                className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                value={vForm.liveMapVehicleIcon}
                onChange={(e) =>
                  setVForm((f) => ({ ...f, liveMapVehicleIcon: e.target.value as LiveMapVehicleIconPreference }))
                }
              >
                {LIVE_MAP_VEHICLE_ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Btn onClick={saveVehicle}>Save</Btn>
              <Btn variant="outline" onClick={() => setVehicleModal(null)}>
                Cancel
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
