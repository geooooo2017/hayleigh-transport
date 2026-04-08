import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileUp,
  MapPin,
  Package,
  Pencil,
  Truck,
  User,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";

function statusBadge(status: Job["status"]) {
  const map = {
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-blue-100 text-blue-700",
    scheduled: "bg-orange-100 text-orange-700",
  } as const;
  const label =
    status === "completed" ? "Completed" : status === "in-progress" ? "In Progress" : "Scheduled";
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${map[status]}`}>{label}</span>
  );
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [jobs] = useLocalStorage<Job[]>("jobs", []);
  const id = Number(jobId);
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <div className="space-y-4">
        <Link to="/jobs">
          <Btn variant="outline" className="gap-2">
            <ArrowLeft size={16} /> Back to Jobs
          </Btn>
        </Link>
        <Card className="p-8 text-center text-gray-600">Job not found.</Card>
      </div>
    );
  }

  const jobType = job.routeType === "international" ? "International" : "Domestic";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/jobs">
          <Btn variant="outline" className="gap-2 text-sm">
            <ArrowLeft size={16} /> Back to Jobs
          </Btn>
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">{job.jobNumber}</h1>
          <p className="mt-1 text-gray-500">
            {job.customerName} — {jobType}
          </p>
          {job.scheduledDay && (
            <p className="mt-1 text-sm text-blue-600">Scheduled: {job.scheduledDay}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(job.status)}
          <Btn className="gap-2" type="button" onClick={() => alert("Edit flow: update fields on Jobs list export / recreate job.")}>
            <Pencil size={16} /> Edit Job
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package size={20} /> Job Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="mb-1 text-gray-600">Job Number</div>
              <div className="font-medium">{job.jobNumber}</div>
            </div>
            <div>
              <div className="mb-1 text-gray-600">Customer</div>
              <div className="font-medium">{job.customerName}</div>
            </div>
            <div>
              <div className="mb-1 text-gray-600">Job Type</div>
              <div className="font-medium">{jobType}</div>
            </div>
            <div>
              <div className="mb-1 text-gray-600">Handler</div>
              <div className="font-medium">{job.handler}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <User size={20} /> Assignment
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <div className="mb-1 text-gray-600">Carrier</div>
              <div className="font-medium">{job.carrier || "—"}</div>
            </div>
            <div>
              <div className="mb-1 text-gray-600">Vehicle</div>
              <div className="font-medium">{job.truckPlates || job.vehicleType || "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <div>
                <div className="text-gray-600">Collection</div>
                <div className="font-medium">{new Date(job.collectionDate).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <div>
                <div className="text-gray-600">Delivery</div>
                <div className="font-medium">
                  {job.deliveryDate ? new Date(job.deliveryDate).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-600">
            <MapPin size={20} /> Collection
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-900">{job.collectionLocation}</p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
            <MapPin size={20} /> Delivery
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-900">{job.deliveryLocation}</p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Truck size={20} /> Financial
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Sell (ex VAT)</div>
              <div className="text-2xl font-semibold">£{Number(job.sellPrice).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Buy (ex VAT)</div>
              <div className="text-2xl font-semibold text-red-600">£{Number(job.buyPrice).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Profit</div>
              <div className="text-2xl font-semibold text-green-600">£{Number(job.profit).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Margin</div>
              <div className="text-2xl font-semibold">{Number(job.margin).toFixed(1)}%</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{job.notes || "No notes."}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileUp size={20} /> Attachments
        </h2>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <FileUp size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="mb-2 text-gray-600">Upload POD or documents</p>
          <Btn variant="outline" type="button">
            Choose Files
          </Btn>
        </div>
      </Card>
    </div>
  );
}
