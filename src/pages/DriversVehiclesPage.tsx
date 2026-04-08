import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Driver, Vehicle } from "../types";
import { Btn, Card } from "../components/Layout";

export default function DriversVehiclesPage() {
  const [drivers, setDrivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [dOpen, setDOpen] = useState(false);
  const [vOpen, setVOpen] = useState(false);
  const [dForm, setDForm] = useState({ name: "", phone: "", licenseNumber: "", licenseExpiry: "", status: "active" });
  const [vForm, setVForm] = useState({ name: "", registration: "", type: "HGV", motExpiry: "", status: "active" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Drivers & Vehicles</h1>
        <p className="mt-1 text-gray-500">Fleet resources for scheduling and compliance</p>
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
            {drivers.map((d) => (
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
                    toast.success("Driver removed");
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {drivers.length === 0 && <p className="text-sm text-gray-500">No drivers yet.</p>}
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
            {vehicles.map((v) => (
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
                    toast.success("Vehicle removed");
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {vehicles.length === 0 && <p className="text-sm text-gray-500">No vehicles yet.</p>}
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
                  if (!dForm.name.trim()) return toast.error("Name required");
                  setDrivers((x) => [...x, { id: Date.now(), ...dForm }]);
                  toast.success("Driver added");
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
                  if (!vForm.name.trim() || !vForm.registration.trim()) return toast.error("Name and registration required");
                  setVehicles((x) => [...x, { id: Date.now(), ...vForm }]);
                  toast.success("Vehicle added");
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
