import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Driver, Vehicle } from "../types";
import { Btn, Card } from "../components/Layout";

export default function DriversVehiclesPage() {
  const [drivers, setDrivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [searchParams] = useSearchParams();
  const [filterQ, setFilterQ] = useState(() => searchParams.get("q") ?? "");

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
  const [vOpen, setVOpen] = useState(false);
  const [dForm, setDForm] = useState({ name: "", phone: "", licenseNumber: "", licenseExpiry: "", status: "active" });
  const [vForm, setVForm] = useState({ name: "", registration: "", type: "HGV", motExpiry: "", status: "active" });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Drivers & Vehicles</h1>
          <p className="mt-1 text-gray-500">Fleet resources for scheduling and compliance</p>
        </div>
        <input
          type="search"
          placeholder="Filter drivers & vehicles…"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          className="h-10 w-full max-w-xs rounded-lg border border-ht-border px-3 text-sm outline-none focus:ring-2 focus:ring-ht-slate/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drivers</h2>
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
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vehicles</h2>
            <Btn className="gap-1 py-1.5 text-sm" onClick={() => setVOpen(true)}>
              <Plus size={14} /> Add
            </Btn>
          </div>
          <ul className="space-y-2">
            {vehiclesShown.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-gray-500">{v.registration}</div>
                </div>
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => {
                    setVehicles((x) => x.filter((y) => y.id !== v.id));
                    notifySuccess("Vehicle removed", { href: platformPath("/drivers-vehicles") });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {vehicles.length === 0 && <p className="text-sm text-gray-500">No vehicles yet.</p>}
            {vehicles.length > 0 && vehiclesShown.length === 0 && (
              <p className="text-sm text-gray-500">No vehicles match this filter.</p>
            )}
          </ul>
        </Card>
      </div>

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

      {vOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md space-y-3 p-6">
            <h3 className="font-semibold">Add vehicle</h3>
            {(["name", "registration", "type", "motExpiry"] as const).map((k) => (
              <div key={k}>
                <label className="text-xs text-gray-600">{k}</label>
                <input
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2"
                  value={vForm[k]}
                  onChange={(e) => setVForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Btn
                onClick={() => {
                  if (!vForm.name.trim() || !vForm.registration.trim()) return notifyError("Name and registration required");
                  setVehicles((x) => [...x, { id: Date.now(), ...vForm }]);
                  notifySuccess("Vehicle added", { href: platformPath("/drivers-vehicles") });
                  setVOpen(false);
                  setVForm({ name: "", registration: "", type: "HGV", motExpiry: "", status: "active" });
                }}
              >
                Save
              </Btn>
              <Btn variant="outline" onClick={() => setVOpen(false)}>
                Cancel
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
