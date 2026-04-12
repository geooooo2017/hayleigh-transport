import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Smartphone } from "lucide-react";
import { DriverPortalActivityPanel } from "../components/DriverPortalActivityPanel";
import { Btn, Card } from "../components/Layout";
import { DriverJobCardContent } from "../components/driver/DriverJobCard";
import { useJobs } from "../context/JobsContext";
import { platformPath } from "../routes/paths";

/** Staff-only: same job card content drivers see in the portal (read-only). */
export default function StaffDriverJobViewPage() {
  const { jobId: jobIdParam } = useParams();
  const id = Number(jobIdParam);
  const [jobs] = useJobs();
  const job = Number.isFinite(id) ? jobs.find((j) => j.id === id) : undefined;

  if (!job) {
    return (
      <div className="space-y-4">
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2">
            <ArrowLeft size={16} /> Back to Jobs
          </Btn>
        </Link>
        <Card className="p-8 text-center text-gray-600">
          {Number.isFinite(id) ? "Job not found or not loaded yet." : "Invalid job link."}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={platformPath(`/jobs/${job.id}`)}>
          <Btn variant="outline" className="gap-2 text-sm">
            <ArrowLeft size={16} /> Full job (office)
          </Btn>
        </Link>
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2 text-sm">
            All jobs
          </Btn>
        </Link>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-ht-slate">
          <Smartphone className="h-6 w-6 shrink-0" aria-hidden />
          <h1 className="text-2xl font-semibold text-gray-900">Driver portal view</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          This matches what drivers see for this job in the driver app: collection and delivery sites, their delivery ETA,
          and any issue report. It is read-only here — drivers update these fields from their own login.
        </p>
      </div>

      <div className="mx-auto max-w-lg">
        <Card className="rounded-2xl p-5 sm:p-4">
          <div className="text-lg font-semibold text-gray-900 sm:text-base">{job.jobNumber}</div>
          <div className="mt-1 text-base text-gray-700 sm:text-sm">{job.customerName}</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <DriverJobCardContent job={job} interactive={false} jobIds={[job.id]} />
          </div>
          <div className="mt-4 text-sm font-medium capitalize text-ht-slate sm:mt-3 sm:text-xs">
            Status: {job.status.replace("-", " ")}
          </div>
        </Card>

        <DriverPortalActivityPanel job={job} className="mt-4" />
      </div>
    </div>
  );
}
