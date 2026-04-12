import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { ChevronDown, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { useJobs } from "../context/JobsContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  computeCustomerJobStats,
  groupJobsNotMatchedToCustomers,
  jobBelongsToCustomer,
} from "../lib/customerJobStats";
import { jobNetExVat } from "../lib/jobNetAmount";
import type { Customer, Job } from "../types";
import { Btn, Card } from "../components/Layout";

function formatActivityDate(iso: string | null): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(s: Job["status"]): string {
  return s === "in-progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1);
}

const empty: Omit<Customer, "id"> = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  companyNumber: "",
  vatNumber: "",
  totalJobs: 0,
  totalRevenue: 0,
  status: "active",
  paymentTerms: "30 days",
  creditLimit: 0,
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>("customers", []);
  const [jobs] = useJobs();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      address: c.address,
      companyNumber: c.companyNumber,
      vatNumber: c.vatNumber,
      totalJobs: c.totalJobs,
      totalRevenue: c.totalRevenue,
      status: c.status,
      paymentTerms: c.paymentTerms,
      creditLimit: c.creditLimit,
      notes: c.notes,
    });
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const row: Customer = {
      id: editing?.id ?? Date.now(),
      ...form,
      totalJobs: Number(form.totalJobs) || 0,
      totalRevenue: Number(form.totalRevenue) || 0,
      creditLimit: Number(form.creditLimit) || 0,
    };
    if (editing) {
      setCustomers((list) => list.map((c) => (c.id === row.id ? row : c)));
      notifySuccess("Customer updated", { href: platformPath("/customers") });
    } else {
      setCustomers((list) => [...list, row]);
      notifySuccess("Customer added", { href: platformPath("/customers") });
    }
    setOpen(false);
  };

  const remove = (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    setCustomers((list) => list.filter((x) => x.id !== c.id));
    notifySuccess("Customer deleted", { href: platformPath("/customers") });
  };

  /** Sum of sell + fuel + extras (ex VAT) across completed jobs — same basis as Customer Invoicing. */
  const netFromCompletedJobs = useMemo(
    () => jobs.filter((j) => j.status === "completed").reduce((s, j) => s + jobNetExVat(j), 0),
    [jobs]
  );
  const active = customers.filter((c) => c.status === "active").length;

  const statsByCustomerId = useMemo(() => {
    const m = new Map<number, ReturnType<typeof computeCustomerJobStats>>();
    for (const c of customers) {
      m.set(c.id, computeCustomerJobStats(c, jobs));
    }
    return m;
  }, [customers, jobs]);

  const jobsLinkedToSavedCustomers = useMemo(() => {
    let n = 0;
    for (const j of jobs) {
      if (customers.some((c) => jobBelongsToCustomer(j, c))) n += 1;
    }
    return n;
  }, [jobs, customers]);

  const unmatchedJobGroups = useMemo(
    () => groupJobsNotMatchedToCustomers(jobs, customers),
    [jobs, customers]
  );

  const formatGbp = (n: number) =>
    `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-1 text-gray-500">
            Job counts and revenue are calculated live from your jobs list (matched by customer name, or email when both are
            set).
          </p>
        </div>
        <Btn className="gap-2" onClick={openNew}>
          <Plus size={16} /> Add Customer
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Total customers</div>
          <div className="text-3xl font-semibold">{customers.length}</div>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Active customers</div>
          <div className="text-3xl font-semibold">{active}</div>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Jobs linked to a saved customer</div>
          <div className="text-3xl font-semibold">{jobsLinkedToSavedCustomers}</div>
          <p className="mt-2 text-xs text-gray-500">Of {jobs.length} total jobs in the list.</p>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Net from completed jobs (ex VAT)</div>
          <div className="text-3xl font-semibold tabular-nums">{formatGbp(netFromCompletedJobs)}</div>
          <p className="mt-2 text-xs text-gray-500">Sell + fuel surcharge + extras — same as Customer Invoicing.</p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4"
              placeholder="Search customers..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="w-8 px-2 py-3" aria-label="Expand jobs" />
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Jobs</th>
                <th className="px-4 py-3 text-right">Active</th>
                <th className="px-4 py-3 text-right">Done</th>
                <th className="px-4 py-3">Net ex VAT</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const s = statsByCustomerId.get(c.id)!;
                const expanded = expandedCustomerId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          aria-expanded={expanded}
                          aria-label={expanded ? "Hide jobs" : "Show jobs"}
                          onClick={() => setExpandedCustomerId((id) => (id === c.id ? null : c.id))}
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="max-w-[140px] truncate px-4 py-3" title={c.contactPerson}>
                        {c.contactPerson || "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3" title={c.email}>
                        {c.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.jobCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-800">{s.openCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-800">{s.completedCount}</td>
                      <td className="px-4 py-3 align-top tabular-nums text-xs leading-snug">
                        <div>All: {formatGbp(s.netExVatAll)}</div>
                        <div className="text-gray-600">Done: {formatGbp(s.netExVatCompleted)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {formatActivityDate(s.lastActivityIso)}
                      </td>
                      <td className="px-4 py-3">{c.status}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="mr-2 font-medium text-ht-slate hover:underline"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button type="button" className="text-red-600" onClick={() => remove(c)}>
                          <Trash2 size={16} className="inline" />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-gray-100 bg-slate-50/95">
                        <td colSpan={11} className="px-4 py-4">
                          {s.jobs.length === 0 ? (
                            <p className="text-sm text-gray-600">No jobs match this customer yet. Use the same company name on the job (or the same email on job and customer).</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-ht-border bg-white">
                              <table className="w-full text-xs sm:text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 text-left text-gray-600">
                                    <th className="px-3 py-2">Job</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2 text-right">Net ex VAT</th>
                                    <th className="px-3 py-2">Collection</th>
                                    <th className="px-3 py-2">Delivery</th>
                                    <th className="px-3 py-2">Invoice</th>
                                    <th className="px-3 py-2" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {s.jobs.map((j) => (
                                    <tr key={j.id} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 font-medium">{j.jobNumber}</td>
                                      <td className="px-3 py-2">{statusLabel(j.status)}</td>
                                      <td className="px-3 py-2 text-right tabular-nums">{formatGbp(jobNetExVat(j))}</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{j.collectionDate || "—"}</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{j.deliveryDate || "—"}</td>
                                      <td className="px-3 py-2">{j.invoiceSent === "yes" ? "Sent" : "Not sent"}</td>
                                      <td className="px-3 py-2 text-right">
                                        <Link
                                          to={platformPath(`/jobs/${j.id}`)}
                                          className="font-medium text-ht-slate hover:underline"
                                        >
                                          Open
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-8 text-center text-gray-500">No customers match.</p>}
          <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            Net ex VAT = sell + fuel surcharge + extra charges (same as Customer Invoicing). &quot;Done&quot; = completed jobs.
            Matching uses job customer name vs this company name, or job customer email vs this email when both are filled in.
          </p>
        </div>
      </Card>

      {unmatchedJobGroups.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Jobs not linked to a saved customer</h2>
          <p className="mt-1 text-sm text-gray-600">
            These job customer names don’t match any customer record. Add the company here or align the name on the job to see
            them in the rows above.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Name on job</th>
                  <th className="py-2 pr-4 text-right">Jobs</th>
                  <th className="py-2 pr-4 text-right">Net ex VAT (all)</th>
                  <th className="py-2 pr-4 text-right">Net ex VAT (completed)</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedJobGroups.map((g) => {
                  const netAll = g.jobs.reduce((sum, j) => sum + jobNetExVat(j), 0);
                  const netDone = g.jobs
                    .filter((j) => j.status === "completed")
                    .reduce((sum, j) => sum + jobNetExVat(j), 0);
                  return (
                    <tr key={g.key} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{g.displayName}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{g.jobs.length}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatGbp(netAll)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatGbp(netDone)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <h2 className="mb-4 text-lg font-semibold">{editing ? "Edit Customer" : "Add Customer"}</h2>
            <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "Company name *"],
                  ["contactPerson", "Contact person"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["address", "Address"],
                  ["paymentTerms", "Payment terms"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
                  {k === "address" ? (
                    <textarea
                      className="w-full rounded-lg border border-gray-200 px-3 py-2"
                      rows={2}
                      value={form[k]}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={form[k] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      required={k === "name"}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 sm:col-span-2">
                <Btn type="submit">Save</Btn>
                <Btn type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Btn>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
