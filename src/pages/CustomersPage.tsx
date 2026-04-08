import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Customer } from "../types";
import { Btn, Card } from "../components/Layout";

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
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);

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
      toast.success("Customer updated");
    } else {
      setCustomers((list) => [...list, row]);
      toast.success("Customer added");
    }
    setOpen(false);
  };

  const remove = (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    setCustomers((list) => list.filter((x) => x.id !== c.id));
    toast.success("Customer deleted");
  };

  const totalRev = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const active = customers.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-1 text-gray-500">Manage your customer database</p>
        </div>
        <Btn className="gap-2" onClick={openNew}>
          <Plus size={16} /> Add Customer
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Total Customers</div>
          <div className="text-3xl font-semibold">{customers.length}</div>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Active</div>
          <div className="text-3xl font-semibold">{active}</div>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm text-gray-600">Total Revenue (demo field)</div>
          <div className="text-3xl font-semibold">£{(totalRev / 1000).toFixed(0)}K</div>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.contactPerson}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="mr-2 text-[#2563EB] hover:underline" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button type="button" className="text-red-600" onClick={() => remove(c)}>
                      <Trash2 size={16} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-8 text-center text-gray-500">No customers match.</p>}
        </div>
      </Card>

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
