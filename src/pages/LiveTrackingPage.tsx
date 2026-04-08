import { Link } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";

export default function LiveTrackingPage() {
  const [jobs] = useLocalStorage<Job[]>("jobs", []);
  const active = jobs.filter((j) => j.status !== "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Live Tracking</h1>
        <p className="mt-1 text-gray-500">Monitor active jobs on the road</p>
      </div>

      <Card className="flex h-64 items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="text-center text-gray-500">
          <Navigation className="mx-auto mb-2 text-[#2563EB]" size={40} />
          <p className="font-medium">Map view</p>
          <p className="text-sm">Connect a maps API to plot vehicle positions from telematics.</p>
        </div>
      </Card>

      {active.length === 0 ? (
        <Card className="p-8 text-center text-gray-600">
          <p className="mb-4">No active jobs.</p>
          <Link to="/jobs/create">
            <Btn>Create Job</Btn>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((j) => (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-gray-900">{j.jobNumber}</div>
                <div className="text-sm text-gray-600">
                  {j.customerName} · {j.handler}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={14} />
                  {j.collectionLocation.slice(0, 60)}… → {j.deliveryLocation.slice(0, 40)}…
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-gray-600">Status</div>
                <div className="font-medium capitalize text-[#2563EB]">{j.status.replace("-", " ")}</div>
              </div>
              <Link to={`/jobs/${j.id}`}>
                <Btn variant="outline" className="text-sm">
                  Details
                </Btn>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
