import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobsContext";
import { downloadBothBookingPdfs } from "../lib/jobBookingPdf";
import { allocateJobNumber, previewJobNumber } from "../lib/jobNumbers";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";
import { platformPath } from "../routes/paths";

export default function JobCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [, setJobs] = useJobs();

  const [routeType, setRouteType] = useState<"domestic" | "international">("domestic");
  const [collectionDate, setCollectionDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [truckPlates, setTruckPlates] = useState("");
  const [collectionLocation, setCollectionLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [fuelSurcharge, setFuelSurcharge] = useState("0");
  const [extraCharges, setExtraCharges] = useState("0");
  const [podReceived, setPodReceived] = useState("no");
  const [invoiceSent, setInvoiceSent] = useState("no");
  const [supplierInvoiceReceived, setSupplierInvoiceReceived] = useState("no");
  const [supplierDueDate, setSupplierDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (user) setPreview(previewJobNumber(user, routeType));
  }, [user, routeType]);

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const fuel = parseFloat(fuelSurcharge) || 0;
  const extra = parseFloat(extraCharges) || 0;
  const profit = sell - buy - fuel - extra;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;

  const marginClass =
    margin < 0 ? "text-red-600" : margin < 15 ? "text-orange-600" : margin < 25 ? "text-yellow-600" : "text-green-600";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const jobNumber = allocateJobNumber(user, routeType);
    const job: Job = {
      id: Date.now(),
      jobNumber,
      handler: user.name,
      routeType,
      collectionDate,
      deliveryDate,
      customerName,
      carrier,
      truckPlates,
      buyPrice: buy,
      sellPrice: sell,
      fuelSurcharge: fuel,
      extraCharges: extra,
      collectionLocation,
      deliveryLocation,
      podReceived,
      invoiceSent,
      supplierInvoiceReceived,
      supplierDueDate,
      profit,
      margin,
      notes,
      createdAt: new Date().toISOString(),
      status: "scheduled",
    };
    setJobs((prev) => [...prev, job]);
    toast.success(`Job ${jobNumber} created successfully!`);
    try {
      await downloadBothBookingPdfs(job);
      toast.success("Booking PDFs saved", { description: "Customer confirmation and supplier instruction." });
    } catch {
      toast.message("PDF download skipped", { description: "Open the job to generate booking PDFs." });
    }
    navigate(platformPath("/jobs"));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:space-y-6">
      <div className="flex items-center gap-4">
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2 py-1.5 text-sm">
            <ArrowLeft size={16} /> Back
          </Btn>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Create New Job</h1>
          <p className="mt-1 text-sm text-gray-500 lg:text-base">Fill in the details below to create a new transport job</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-ht-border bg-ht-canvas p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 text-sm text-gray-600">Job Number (Auto-generated)</div>
              <div className="text-3xl font-semibold text-ht-slate">{preview || "—"}</div>
            </div>
            <div className="text-right">
              <div className="mb-1 text-sm text-gray-600">Handler</div>
              <div className="text-lg font-semibold text-gray-900">{user?.name}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">General Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Route Type *</label>
              <select
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as "domestic" | "international")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              >
                <option value="domestic">Domestic (GB → GB)</option>
                <option value="international">International (GB → EU/World)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Customer *</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Amazon, DHL, Tesco"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Collection Date *</label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Delivery Date *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g., DSV, Wincanton"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Truck Registration</label>
              <input
                value={truckPlates}
                onChange={(e) => setTruckPlates(e.target.value)}
                placeholder="e.g., AB12 CDE"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Locations</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Collection Address *</label>
              <textarea
                value={collectionLocation}
                onChange={(e) => setCollectionLocation(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Full collection address"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Delivery Address *</label>
              <textarea
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Full delivery address"
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Financial Information (Ex VAT)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Buy Price (Ex VAT) *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sell Price (Ex VAT) *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fuel Surcharge</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={fuelSurcharge}
                  onChange={(e) => setFuelSurcharge(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Extra Charges</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="text-sm text-gray-600">Estimated Profit</div>
                <div className={`text-2xl font-semibold ${marginClass}`}>£{profit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Margin</div>
                <div className={`text-2xl font-semibold ${marginClass}`}>{margin.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Compliance</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">POD Received?</label>
              <select
                value={podReceived}
                onChange={(e) => setPodReceived(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Invoice Sent?</label>
              <select
                value={invoiceSent}
                onChange={(e) => setInvoiceSent(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier Invoice Received?</label>
              <select
                value={supplierInvoiceReceived}
                onChange={(e) => setSupplierInvoiceReceived(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium">Supplier Due Date</label>
              <input
                type="date"
                value={supplierDueDate}
                onChange={(e) => setSupplierDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 md:max-w-xs"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <label className="mb-2 block text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            placeholder="Internal notes…"
          />
        </Card>

        <div className="flex gap-3">
          <Btn type="submit">Create Job</Btn>
          <Link to={platformPath("/jobs")}>
            <Btn type="button" variant="outline">
              Cancel
            </Btn>
          </Link>
        </div>
      </form>
    </div>
  );
}
