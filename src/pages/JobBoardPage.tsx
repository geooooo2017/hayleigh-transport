import {
  closestCorners,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatAddressSummary } from "../lib/jobAddress";
import { useJobs } from "../context/JobsContext";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";
import { notifyMessage } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function JobCard({ job, fromBasket }: { job: Job; fromBasket?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { job },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-70 ring-2 ring-ht-slate" : ""
      } ${fromBasket ? "border-dashed" : ""}`}
    >
      <div className="text-sm font-semibold text-gray-900">{job.jobNumber}</div>
      <div className="text-xs text-gray-600">{job.customerName}</div>
      <div className="mt-2 line-clamp-2 text-xs text-gray-500">
        {formatAddressSummary(job, "collection", 56) || "—"}
      </div>
      <div className="text-xs text-gray-500">→ {formatAddressSummary(job, "delivery", 56) || "—"}</div>
      <div className="mt-2 text-xs font-medium text-ht-slate">£{Number(job.sellPrice).toFixed(2)}</div>
    </div>
  );
}

function DropColumn({ id, title, jobs }: { id: string; title: string; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex min-w-[200px] flex-1 flex-col">
      <div className="rounded-t-lg bg-gray-100 px-4 py-3 font-medium text-gray-900">{title}</div>
      <div
        ref={setNodeRef}
        className={`min-h-[400px] flex-1 space-y-3 rounded-b-lg border-2 border-dashed p-3 lg:min-h-[500px] ${
          isOver ? "border-ht-slate bg-ht-slate/5" : "border-ht-border bg-ht-canvas"
        }`}
      >
        {jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">Drop jobs here</div>
        ) : (
          jobs.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>
    </div>
  );
}

function BasketDropZone({ children, className }: { children: ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: "basket" });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-ht-slate ring-offset-2" : ""}`}
    >
      {children}
    </div>
  );
}

export default function JobBoardPage() {
  const [jobs, setJobs] = useJobs();
  const [drivers] = useLocalStorage("drivers", [] as { id: number; name: string }[]);
  const [vehicles] = useLocalStorage("vehicles", [] as { id: number; name: string; registration: string }[]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const unassigned = jobs.filter((j) => !j.scheduledDay);
  const byDay = (day: string) => jobs.filter((j) => j.scheduledDay === day);

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    if (!activeId.startsWith("job-")) return;
    const jobId = Number(activeId.slice(4));
    const overId = e.over?.id != null ? String(e.over.id) : null;
    if (!overId) return;

    setJobs((prev) => {
      const target = prev.find((j) => j.id === jobId);
      if (!target) return prev;

      let changed = false;
      const next = prev.map((j) => {
        if (j.id !== jobId) return j;
        if (overId === "basket") {
          if (j.scheduledDay) changed = true;
          const u = { ...j };
          delete u.scheduledDay;
          return u;
        }
        if ((WEEKDAYS as readonly string[]).includes(overId)) {
          const nextStatus: Job["status"] = j.status === "completed" ? j.status : "scheduled";
          if (j.scheduledDay !== overId || j.status !== nextStatus) changed = true;
          return { ...j, scheduledDay: overId, status: nextStatus };
        }
        return j;
      });

      if (changed) {
        const label =
          overId === "basket" ? "moved to unscheduled" : (WEEKDAYS as readonly string[]).includes(overId) ? `scheduled ${overId}` : "updated";
        notifyMessage("Job board updated", {
          description: `${target.jobNumber} — ${label}`,
          href: platformPath("/job-board"),
        });
      }
      return next;
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Job Board</h1>
          <p className="mt-1 text-sm text-gray-500 lg:text-base">Drag and drop jobs to schedule them</p>
        </div>

        {jobs.length === 0 && (
          <Card className="py-12 text-center">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Jobs Yet</h3>
            <p className="mb-4 text-gray-600">Create your first job to see it on the board.</p>
            <Link to={platformPath("/jobs/create")}>
              <Btn className="gap-2">
                <Plus size={16} /> Create Job
              </Btn>
            </Link>
          </Card>
        )}

        {jobs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
            <div className="order-2 space-y-6 lg:order-1 lg:col-span-1">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-base font-semibold lg:text-lg">Basket</h2>
                  <p className="text-xs text-gray-500 lg:text-sm">Unassigned Jobs ({unassigned.length})</p>
                </div>
                <BasketDropZone className="max-h-[400px] space-y-3 overflow-y-auto p-3 lg:max-h-[600px]">
                  {unassigned.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">All jobs scheduled!</div>
                  ) : (
                    unassigned.map((j) => <JobCard key={j.id} job={j} fromBasket />)
                  )}
                </BasketDropZone>
              </Card>
              <Card className="p-4">
                <h2 className="mb-4 text-lg font-semibold">Resources</h2>
                <div className="mb-4">
                  <div className="mb-2 text-sm font-medium text-gray-700">Drivers</div>
                  <div className="space-y-2 text-sm">
                    {drivers.length === 0 ? (
                      <div className="text-xs text-gray-500">No drivers added</div>
                    ) : (
                      drivers.map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <span className="text-gray-700">{d.name}</span>
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Available</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700">Vehicles</div>
                  <div className="space-y-2 text-sm">
                    {vehicles.length === 0 ? (
                      <div className="text-xs text-gray-500">No vehicles added</div>
                    ) : (
                      vehicles.map((v) => (
                        <div key={v.id} className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-700">{v.name}</div>
                            <div className="text-xs text-gray-500">{v.registration}</div>
                          </div>
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Available</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-3">
              <Card className="overflow-x-auto p-4">
                <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
                  {(["Day", "Week", "Month"] as const).map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${
                        i === 1 ? "bg-ht-slate text-white" : "text-slate-600 hover:bg-ht-canvas"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {WEEKDAYS.map((d) => (
                    <DropColumn
                      key={d}
                      id={d}
                      title={d}
                      jobs={byDay(d)}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-gray-500 lg:hidden">Swipe horizontally to see all weekdays</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
