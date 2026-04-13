import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  FileDown,
  FileUp,
  Mail,
  MapPin,
  Package,
  Pencil,
  Smartphone,
  Trash2,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DriverPortalActivityPanel } from "../components/DriverPortalActivityPanel";
import { JobManualProgressCard } from "../components/JobManualProgressCard";
import { JobLifecycleTimeline } from "../components/JobLifecycleTimeline";
import { useAuth } from "../context/AuthContext";
import { useJobRecycleBin, useJobs } from "../context/JobsContext";
import { delay, geocodeNominatim, geocodeUkPostcode } from "../lib/geocode";
import { isValidUkPostcodeFormat, ukPostcodeValidationMessage } from "../lib/ukPostcode";
import { userCanDeleteJobs } from "../lib/permissions";
import { downloadCustomerBookingPdf, downloadSupplierBookingPdf } from "../lib/jobBookingPdf";
import {
  buildPodMailtoUrl,
  dataUrlToFile,
  downloadBlobUrl,
  looksLikeEmail,
  MAX_POD_STORE_BYTES,
  openMailtoUrl,
} from "../lib/podMailto";
import {
  build1hAwayMailto,
  build24hBeforeMailto,
  buildDriverUpdateSmsUrl,
  ETA_ASSUMED_SPEED_KMH,
} from "../lib/customerNotifications";
import { formatDriverIssueKindLabel } from "../lib/driverIssueCommon";
import { formatVehicleRegistrationDisplay } from "../lib/driverPositionsApi";
import { formatDriverDeliveryEtaDisplay, geocodeNominatimQuery } from "../lib/jobAddress";
import { jobHasDriverReportedIssue } from "../lib/jobBoardVisual";
import {
  getCollectionAddressIssues,
  getDeliveryAddressIssues,
  getJobAddressIssues,
} from "../lib/jobAddressValidation";
import {
  JOB_ADDRESS_WHY,
  JOB_INVOICE_BILLING_WHY,
  JOB_CARRIER_WHY,
  JOB_FINANCE_WHY,
  JOB_MAP_WHY,
  JOB_GENERAL_WHY,
  JOB_NOTIFICATIONS_WHY,
  JOB_NOTES_WHY,
  JOB_REGISTER_WHY,
  POD_ATTACHMENT_WHY,
  REQ,
} from "../lib/fieldRequirementCopy";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import type { Job, LiveMapVehicleIconPreference } from "../types";
import { LIVE_MAP_VEHICLE_ICON_OPTIONS } from "../lib/fleetVehicleMapIcon";
import { notifyError, notifyMessage, notifySuccess } from "../lib/platformNotify";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { platformPath } from "../routes/paths";
import { computeJobGpExVat } from "../lib/jobProfit";
import { joinStructuredAddressLines, splitSavedAddressLines } from "../lib/addressStructured";
import type { PlaceResolvedPayload } from "../lib/googlePlaceToAddress";
import { StructuredSiteAddressFields } from "../components/StructuredSiteAddressFields";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const INTERNAL_PDF_CONFIRM_MSG =
  "This PDF is for internal use only. It includes supplier buy rates and carrier details — it must not be sent to the customer.\n\nDownload this internal PDF?";

function statusBadge(status: Job["status"]) {
  const map = {
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-ht-slate/12 text-ht-slate-dark",
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useJobs();
  const { softDeleteJob } = useJobRecycleBin();
  const id = Number(jobId);
  const job = jobs.find((j) => j.id === id);
  const [assignedDriverName, setAssignedDriverName] = useState("");
  const [assignedDriverPhone, setAssignedDriverPhone] = useState("");
  const [coreCustomerName, setCoreCustomerName] = useState("");
  const [coreHandler, setCoreHandler] = useState("");
  const [coreRouteType, setCoreRouteType] = useState<"domestic" | "international">("domestic");
  const [coreCollectionDate, setCoreCollectionDate] = useState("");
  const [coreDeliveryDate, setCoreDeliveryDate] = useState("");
  const [coreStatus, setCoreStatus] = useState<Job["status"]>("scheduled");
  const [coreScheduledDay, setCoreScheduledDay] = useState("");
  const [coreCarrier, setCoreCarrier] = useState("");
  const [coreTruckPlates, setCoreTruckPlates] = useState("");
  const [coreLiveMapVehicleIcon, setCoreLiveMapVehicleIcon] = useState<LiveMapVehicleIconPreference>("auto");
  const [finBuy, setFinBuy] = useState("");
  const [finSell, setFinSell] = useState("");
  const [finFuel, setFinFuel] = useState("");
  const [finExtra, setFinExtra] = useState("");
  const [notesText, setNotesText] = useState("");
  const [collectionPostcode, setCollectionPostcode] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [cOrg, setCOrg] = useState("");
  const [cLine1, setCLine1] = useState("");
  const [cLine2, setCLine2] = useState("");
  const [cTown, setCTown] = useState("");
  const [cContactName, setCContactName] = useState("");
  const [cContactPhone, setCContactPhone] = useState("");
  const [cContactEmail, setCContactEmail] = useState("");
  const [dOrg, setDOrg] = useState("");
  const [dLine1, setDLine1] = useState("");
  const [dLine2, setDLine2] = useState("");
  const [dTown, setDTown] = useState("");
  const [dContactName, setDContactName] = useState("");
  const [dContactPhone, setDContactPhone] = useState("");
  const [dContactEmail, setDContactEmail] = useState("");
  const [ibOrg, setIbOrg] = useState("");
  const [ibLine1, setIbLine1] = useState("");
  const [ibLine2, setIbLine2] = useState("");
  const [ibTown, setIbTown] = useState("");
  const [invoiceBillingPostcode, setInvoiceBillingPostcode] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [coreInvoiceSent, setCoreInvoiceSent] = useState<"yes" | "no">("no");
  const [sheetBillable, setSheetBillable] = useState<"yes" | "no">("no");
  const [sheetPodSent, setSheetPodSent] = useState<"yes" | "no">("no");
  const [sheetHayleighPo, setSheetHayleighPo] = useState("");
  const [sheetCollectionRef, setSheetCollectionRef] = useState("");
  const [sheetCustomerInvoiceRef, setSheetCustomerInvoiceRef] = useState("");
  const [sheetCustomerPaymentDate, setSheetCustomerPaymentDate] = useState("");
  const [sheetPodReceived, setSheetPodReceived] = useState<"yes" | "no">("no");
  const [sheetSupplierInvRec, setSheetSupplierInvRec] = useState<"yes" | "no">("no");
  const [sheetSupplierDue, setSheetSupplierDue] = useState("");
  const [sessionLargePodName, setSessionLargePodName] = useState<string | null>(null);
  const podInputRef = useRef<HTMLInputElement>(null);
  const oversizedPodRef = useRef<File | null>(null);
  const canDeleteJob = userCanDeleteJobs(user);

  const cAddrLines = useMemo(
    () => joinStructuredAddressLines({ organisation: cOrg, line1: cLine1, line2: cLine2, town: cTown }),
    [cOrg, cLine1, cLine2, cTown]
  );
  const dAddrLines = useMemo(
    () => joinStructuredAddressLines({ organisation: dOrg, line1: dLine1, line2: dLine2, town: dTown }),
    [dOrg, dLine1, dLine2, dTown]
  );
  const ibAddrLines = useMemo(
    () => joinStructuredAddressLines({ organisation: ibOrg, line1: ibLine1, line2: ibLine2, town: ibTown }),
    [ibOrg, ibLine1, ibLine2, ibTown]
  );

  const onCollectionPlace = useCallback((p: PlaceResolvedPayload) => {
    setCOrg(p.organisation);
    setCLine1(p.line1);
    setCLine2(p.line2);
    setCTown(p.town);
    if (p.postcode.trim()) setCollectionPostcode(p.postcode.trim().toUpperCase());
  }, []);

  const onDeliveryPlace = useCallback((p: PlaceResolvedPayload) => {
    setDOrg(p.organisation);
    setDLine1(p.line1);
    setDLine2(p.line2);
    setDTown(p.town);
    if (p.postcode.trim()) setDeliveryPostcode(p.postcode.trim().toUpperCase());
  }, []);

  const onInvoiceBillingPlace = useCallback((p: PlaceResolvedPayload) => {
    setIbOrg(p.organisation);
    setIbLine1(p.line1);
    setIbLine2(p.line2);
    setIbTown(p.town);
    if (p.postcode.trim()) setInvoiceBillingPostcode(p.postcode.trim().toUpperCase());
  }, []);

  const validatePostcodesOrToast = () => {
    const c = collectionPostcode.trim();
    const d = deliveryPostcode.trim();
    if (!c) {
      notifyError("Collection postcode is required");
      return false;
    }
    if (!d) {
      notifyError("Delivery postcode is required");
      return false;
    }
    if (coreRouteType === "domestic") {
      if (!isValidUkPostcodeFormat(c)) {
        notifyError(ukPostcodeValidationMessage("Collection postcode"));
        return false;
      }
      if (!isValidUkPostcodeFormat(d)) {
        notifyError(ukPostcodeValidationMessage("Delivery postcode"));
        return false;
      }
    } else if (c.length < 2 || d.length < 2) {
      notifyError("Enter postcodes for both collection and delivery");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!job) return;
    setCollectionPostcode(job.collectionPostcode ?? "");
    setDeliveryPostcode(job.deliveryPostcode ?? "");
  }, [job?.id, job?.collectionPostcode, job?.deliveryPostcode]);

  useEffect(() => {
    if (!job) return;
    setAssignedDriverName(job.assignedDriverName ?? "");
    setAssignedDriverPhone(job.assignedDriverPhone ?? "");
    setCustomerEmail(job.customerEmail ?? "");
    setCoreCustomerName(job.customerName);
    setCoreHandler(job.handler);
    setCoreRouteType(job.routeType);
    setCoreCollectionDate(job.collectionDate.length >= 10 ? job.collectionDate.slice(0, 10) : job.collectionDate);
    setCoreDeliveryDate(job.deliveryDate && job.deliveryDate.length >= 10 ? job.deliveryDate.slice(0, 10) : "");
    setCoreStatus(job.status);
    setCoreInvoiceSent(job.invoiceSent === "yes" ? "yes" : "no");
    setCoreScheduledDay(job.scheduledDay ?? "");
    setCoreCarrier(job.carrier ?? "");
    setCoreTruckPlates(job.truckPlates ?? "");
    setCoreLiveMapVehicleIcon(job.liveMapVehicleIcon ?? "auto");
    setFinBuy(String(job.buyPrice ?? ""));
    setFinSell(String(job.sellPrice ?? ""));
    setFinFuel(String(job.fuelSurcharge ?? ""));
    setFinExtra(String(job.extraCharges ?? ""));
    setNotesText(job.notes ?? "");
    setSheetBillable(job.billable === "yes" ? "yes" : "no");
    setSheetPodSent(job.podSent === "yes" ? "yes" : "no");
    setSheetHayleighPo(job.hayleighPo ?? "");
    setSheetCollectionRef(job.collectionRef ?? "");
    setSheetCustomerInvoiceRef(job.customerInvoiceRef ?? "");
    setSheetCustomerPaymentDate(
      job.customerPaymentDate && job.customerPaymentDate.length >= 10 ? job.customerPaymentDate.slice(0, 10) : job.customerPaymentDate ?? ""
    );
    setSheetPodReceived(job.podReceived === "yes" ? "yes" : "no");
    setSheetSupplierInvRec(job.supplierInvoiceReceived === "yes" ? "yes" : "no");
    setSheetSupplierDue(job.supplierDueDate && job.supplierDueDate.length >= 10 ? job.supplierDueDate.slice(0, 10) : job.supplierDueDate ?? "");
    const cp = splitSavedAddressLines(job.collectionAddressLines);
    const dp = splitSavedAddressLines(job.deliveryAddressLines);
    setCOrg(cp.organisation);
    setCLine1(cp.line1);
    setCLine2(cp.line2);
    setCTown(cp.town);
    setCContactName(job.collectionContactName);
    setCContactPhone(job.collectionContactPhone);
    setCContactEmail(job.collectionContactEmail);
    setDOrg(dp.organisation);
    setDLine1(dp.line1);
    setDLine2(dp.line2);
    setDTown(dp.town);
    setDContactName(job.deliveryContactName);
    setDContactPhone(job.deliveryContactPhone);
    setDContactEmail(job.deliveryContactEmail);
    const ibp = splitSavedAddressLines(job.invoiceBillingAddressLines ?? "");
    setIbOrg(ibp.organisation);
    setIbLine1(ibp.line1);
    setIbLine2(ibp.line2);
    setIbTown(ibp.town);
    setInvoiceBillingPostcode(job.invoiceBillingPostcode ?? "");
    oversizedPodRef.current = null;
    setSessionLargePodName(null);
  }, [job?.id]);

  /** Keep status & paperwork dropdowns aligned when job is patched (e.g. manual progression card). */
  useEffect(() => {
    if (!job) return;
    setCoreStatus(job.status);
    setCoreInvoiceSent(job.invoiceSent === "yes" ? "yes" : "no");
    setSheetPodReceived(job.podReceived === "yes" ? "yes" : "no");
    setSheetSupplierInvRec(job.supplierInvoiceReceived === "yes" ? "yes" : "no");
  }, [job?.id, job?.status, job?.invoiceSent, job?.podReceived, job?.supplierInvoiceReceived]);

  const pricingPreview = useMemo(() => {
    if (!job) return { profit: 0, margin: 0 };
    const draft = {
      ...job,
      buyPrice: parseFloat(finBuy) || 0,
      sellPrice: parseFloat(finSell) || 0,
      fuelSurcharge: parseFloat(finFuel) || 0,
      extraCharges: parseFloat(finExtra) || 0,
    };
    return computeJobGpExVat(draft);
  }, [job, finBuy, finSell, finFuel, finExtra]);

  const addressFormIssues = useMemo(
    () =>
      getJobAddressIssues({
        routeType: coreRouteType,
        collectionAddressLines: cAddrLines.trim(),
        collectionContactName: cContactName.trim(),
        collectionContactPhone: cContactPhone.trim(),
        collectionContactEmail: cContactEmail.trim(),
        collectionPostcode: collectionPostcode.trim() || undefined,
        deliveryAddressLines: dAddrLines.trim(),
        deliveryContactName: dContactName.trim(),
        deliveryContactPhone: dContactPhone.trim(),
        deliveryContactEmail: dContactEmail.trim(),
        deliveryPostcode: deliveryPostcode.trim() || undefined,
      }),
    [
      coreRouteType,
      cAddrLines,
      cContactName,
      cContactPhone,
      cContactEmail,
      collectionPostcode,
      dAddrLines,
      dContactName,
      dContactPhone,
      dContactEmail,
      deliveryPostcode,
    ]
  );

  const jobDetailMiss = useMemo(() => {
    const cPc = collectionPostcode.trim();
    const dPc = deliveryPostcode.trim();
    const pcBad = (pc: string) => {
      if (!pc) return true;
      if (coreRouteType === "domestic") return !isValidUkPostcodeFormat(pc);
      return pc.length < 2;
    };
    return {
      customer: !coreCustomerName.trim(),
      handler: !coreHandler.trim(),
      collDate: !coreCollectionDate,
      delDate: !coreDeliveryDate.trim(),
      carrier: !coreCarrier.trim(),
      truck: !coreTruckPlates.trim(),
      cAddr: !cAddrLines.trim(),
      cPhone: !cContactPhone.trim(),
      cEmail: cContactEmail.trim() !== "" && !looksLikeEmail(cContactEmail),
      cPc: pcBad(cPc),
      dAddr: !dAddrLines.trim(),
      dPhone: !dContactPhone.trim(),
      dEmail: dContactEmail.trim() !== "" && !looksLikeEmail(dContactEmail),
      dPc: pcBad(dPc),
      finBuy: finBuy.trim() === "",
      finSell: !(parseFloat(finSell) > 0),
      podCustEmail: customerEmail.trim() !== "" && !looksLikeEmail(customerEmail),
    };
  }, [
    coreCustomerName,
    coreHandler,
    coreCollectionDate,
    coreDeliveryDate,
    coreCarrier,
    coreTruckPlates,
    cAddrLines,
    cContactPhone,
    cContactEmail,
    collectionPostcode,
    dAddrLines,
    dContactPhone,
    dContactEmail,
    deliveryPostcode,
    coreRouteType,
    finBuy,
    finSell,
    customerEmail,
  ]);

  const bookingPdfBusyRef = useRef(false);
  const downloadBookingPdf = useCallback(
    async (variant: "customer" | "supplier") => {
      if (!job) return;
      if (bookingPdfBusyRef.current) return;
      bookingPdfBusyRef.current = true;
      const issuer = {
        details: getUserCompanyDetails(user?.id),
        preparedBy: user?.name,
      };
      try {
        if (variant === "customer") {
          await downloadCustomerBookingPdf(job, issuer);
        } else {
          await downloadSupplierBookingPdf(job, issuer);
        }
      } catch {
        notifyError("Could not build PDF", { description: "Try again or check that the logo loads." });
      } finally {
        bookingPdfBusyRef.current = false;
      }
    },
    [job, user?.id, user?.name]
  );

  const requestInternalBookingPdf = useCallback(() => {
    if (!job) return;
    if (!window.confirm(INTERNAL_PDF_CONFIRM_MSG)) return;
    void downloadBookingPdf("supplier");
  }, [job, downloadBookingPdf]);

  if (!job) {
    return (
      <div className="space-y-4">
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2">
            <ArrowLeft size={16} /> Back to Jobs
          </Btn>
        </Link>
        <Card className="p-8 text-center text-gray-600">Job not found.</Card>
      </div>
    );
  }

  const patchJob = (updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const nextRev = (j.officeRevision ?? 0) + 1;
        return {
          ...j,
          ...updates,
          officeUpdatedAt: new Date().toISOString(),
          officeRevision: nextRev,
        };
      })
    );
  };

  const jobWithAddressDraft = (): Job => ({
    ...job,
    collectionAddressLines: cAddrLines,
    collectionContactName: cContactName,
    collectionContactPhone: cContactPhone,
    collectionContactEmail: cContactEmail,
    collectionPostcode: collectionPostcode.trim() || undefined,
    deliveryAddressLines: dAddrLines,
    deliveryContactName: dContactName,
    deliveryContactPhone: dContactPhone,
    deliveryContactEmail: dContactEmail,
    deliveryPostcode: deliveryPostcode.trim() || undefined,
    invoiceBillingAddressLines: ibAddrLines.trim() || undefined,
    invoiceBillingPostcode: invoiceBillingPostcode.trim() || undefined,
  });

  const saveInvoiceBillingDetails = () => {
    patchJob({
      invoiceBillingAddressLines: ibAddrLines.trim() || undefined,
      invoiceBillingPostcode: invoiceBillingPostcode.trim() || undefined,
    });
    notifySuccess("Invoice billing address saved", { href: platformPath(`/jobs/${id}`) });
  };

  const saveCollectionDetails = () => {
    const draft = {
      routeType: coreRouteType,
      collectionAddressLines: cAddrLines.trim(),
      collectionContactName: cContactName.trim(),
      collectionContactPhone: cContactPhone.trim(),
      collectionContactEmail: cContactEmail.trim(),
      collectionPostcode: collectionPostcode.trim() || undefined,
      deliveryAddressLines: dAddrLines.trim(),
      deliveryContactName: dContactName.trim(),
      deliveryContactPhone: dContactPhone.trim(),
      deliveryContactEmail: dContactEmail.trim(),
      deliveryPostcode: deliveryPostcode.trim() || undefined,
    };
    const colIssues = getCollectionAddressIssues(draft);
    if (colIssues.length > 0) {
      notifyError("Complete collection details", { description: colIssues.join(" · ") });
      return;
    }
    patchJob({
      collectionAddressLines: cAddrLines.trim(),
      collectionContactName: cContactName.trim(),
      collectionContactPhone: cContactPhone.trim(),
      collectionContactEmail: cContactEmail.trim(),
    });
    notifySuccess("Collection details saved", { href: platformPath(`/jobs/${id}`) });
  };

  const saveDeliveryDetails = () => {
    const draft = {
      routeType: coreRouteType,
      collectionAddressLines: cAddrLines.trim(),
      collectionContactName: cContactName.trim(),
      collectionContactPhone: cContactPhone.trim(),
      collectionContactEmail: cContactEmail.trim(),
      collectionPostcode: collectionPostcode.trim() || undefined,
      deliveryAddressLines: dAddrLines.trim(),
      deliveryContactName: dContactName.trim(),
      deliveryContactPhone: dContactPhone.trim(),
      deliveryContactEmail: dContactEmail.trim(),
      deliveryPostcode: deliveryPostcode.trim() || undefined,
    };
    const delIssues = getDeliveryAddressIssues(draft);
    if (delIssues.length > 0) {
      notifyError("Complete delivery details", { description: delIssues.join(" · ") });
      return;
    }
    patchJob({
      deliveryAddressLines: dAddrLines.trim(),
      deliveryContactName: dContactName.trim(),
      deliveryContactPhone: dContactPhone.trim(),
      deliveryContactEmail: dContactEmail.trim(),
    });
    notifySuccess("Delivery details saved", { href: platformPath(`/jobs/${id}`) });
  };

  const jobType = job.routeType === "international" ? "International" : "Domestic";

  const onPodFiles = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    oversizedPodRef.current = null;
    setSessionLargePodName(null);
    if (file.size > MAX_POD_STORE_BYTES) {
      oversizedPodRef.current = file;
      setSessionLargePodName(file.name);
      patchJob({
        podFileName: undefined,
        podFileDataUrl: undefined,
        podReceived: "yes",
      });
      notifyMessage("POD selected (large file)", {
        description:
          "Too large to store inside the job. Use “Open email with POD” from this page, or upload a smaller file.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patchJob({
        podFileName: file.name,
        podFileDataUrl: reader.result as string,
        podReceived: "yes",
      });
      notifySuccess("POD saved to this job", { href: platformPath(`/jobs/${id}`) });
    };
    reader.onerror = () => notifyError("Could not read file");
    reader.readAsDataURL(file);
  };

  const clearPod = () => {
    oversizedPodRef.current = null;
    setSessionLargePodName(null);
    patchJob({ podFileName: undefined, podFileDataUrl: undefined, podReceived: "no" });
    if (podInputRef.current) podInputRef.current.value = "";
    notifyMessage("POD removed");
  };

  const openEmailWithPod = async () => {
    if (!looksLikeEmail(customerEmail)) {
      notifyError("Enter a valid customer email");
      return;
    }
    patchJob({ customerEmail: customerEmail.trim() });

    let file: File | null = null;
    if (job.podFileDataUrl && job.podFileName) {
      try {
        file = await dataUrlToFile(job.podFileDataUrl, job.podFileName);
      } catch {
        notifyError("Could not read saved POD");
        return;
      }
    } else if (oversizedPodRef.current) {
      file = oversizedPodRef.current;
    } else {
      notifyError("Choose a POD file first");
      return;
    }

    const mailto = buildPodMailtoUrl({
      to: customerEmail.trim(),
      jobNumber: job.jobNumber,
      customerName: job.customerName,
      handlerName: user?.name,
    });

    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `POD ${job.jobNumber}`,
          text: `Proof of delivery for ${job.jobNumber}`,
        });
        notifySuccess("Share sheet opened", { description: "Pick Mail or Outlook if your device offers it." });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }

    const objUrl = URL.createObjectURL(file);
    downloadBlobUrl(objUrl, file.name);
    URL.revokeObjectURL(objUrl);
    setTimeout(() => openMailtoUrl(mailto), 400);
    notifyMessage("Email draft opening", {
      description:
        "The POD was saved to your Downloads folder. Attach it to the message in Outlook if it is not already there.",
    });
  };

  const podLabel = job.podFileName || sessionLargePodName;
  const hasPodFile = Boolean(job.podFileDataUrl && job.podFileName) || Boolean(sessionLargePodName);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2 text-sm">
            <ArrowLeft size={16} /> Back to Jobs
          </Btn>
        </Link>
      </div>

      <MissingFieldLegend />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">{job.jobNumber}</h1>
          <p className="mt-1 text-gray-500">
            {job.customerName} — {jobType}
          </p>
          {job.scheduledDay && (
            <p className="mt-1 text-sm text-ht-slate">Scheduled: {job.scheduledDay}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {statusBadge(job.status)}
          <Link to={platformPath(`/jobs/${id}/driver-view`)}>
            <Btn variant="outline" className="gap-2" type="button" title="Same card as the driver portal app (read-only)">
              <Smartphone size={16} aria-hidden /> Driver portal view
            </Btn>
          </Link>
          <Btn
            variant="outline"
            className="gap-2"
            type="button"
            onClick={() => void downloadBookingPdf("customer")}
          >
            <FileDown size={16} /> Customer PDF
          </Btn>
          <Btn
            variant="outline"
            className="gap-2 border-amber-600/70 bg-amber-50 text-amber-950 hover:bg-amber-100"
            type="button"
            title="Internal only — includes buy rate and carrier details. Never send this file to your customer."
            onClick={() => requestInternalBookingPdf()}
          >
            <AlertTriangle size={16} className="shrink-0 text-amber-700" aria-hidden />
            <FileDown size={16} /> Internal PDF (office / carrier)
          </Btn>
          <Btn
            className="gap-2"
            type="button"
            onClick={() => {
              patchJob({
                assignedDriverName: assignedDriverName.trim() || undefined,
                assignedDriverPhone: assignedDriverPhone.trim() || undefined,
              });
              notifySuccess("Driver assignment saved", {
                description: "The driver app will show an update alert on next refresh.",
                href: platformPath(`/jobs/${id}`),
              });
            }}
          >
            <Pencil size={16} /> Save driver assignment
          </Btn>
        </div>
      </div>

      {addressFormIssues.length > 0 && (
        <Card className="flex gap-3 border-2 border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-amber-950">Complete required address details</h2>
            <p className="mt-1 text-sm text-amber-950/90">
              This job is missing required address, phone, or postcode information. Site contact names and emails are optional.
              Update <strong>Collection &amp; delivery</strong> and <strong>Map — postcodes</strong> below.
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-950/85">
              {addressFormIssues.slice(0, 8).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {addressFormIssues.length > 8 && (
              <p className="mt-1 text-xs text-amber-900/80">…and more. Fix the list above from the top.</p>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <JobLifecycleTimeline job={job} />
        </div>

        <div className="lg:col-span-2">
          <JobManualProgressCard job={job} jobDetailPath={platformPath(`/jobs/${id}`)} onPatch={patchJob} />
        </div>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Package size={20} /> Job details & assignment
          </h2>
          <WhyThisSection>
            <span className="block">{JOB_GENERAL_WHY}</span>
            <span className="mt-2 block">{JOB_CARRIER_WHY}</span>
            <span className="mt-2 block">
              Saving bumps a version the driver app watches. Use the driver’s mobile to open a text with a short update
              message (your phone sends the SMS).
            </span>
          </WhyThisSection>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Job number</label>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium">{job.jobNumber}</div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Customer name
                <ReqStar show={jobDetailMiss.customer} why={REQ.customerName} />
              </label>
              <input
                value={coreCustomerName}
                onChange={(e) => setCoreCustomerName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Customer email <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Handler
                <ReqStar show={jobDetailMiss.handler} why="Handler attributes the job internally and on exports." />
              </label>
              <input
                value={coreHandler}
                onChange={(e) => setCoreHandler(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Route type</label>
              <select
                value={coreRouteType}
                onChange={(e) => setCoreRouteType(e.target.value as "domestic" | "international")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Job status</label>
              <select
                value={coreStatus}
                onChange={(e) => setCoreStatus(e.target.value as Job["status"])}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Customer invoice sent</label>
              <select
                value={coreInvoiceSent}
                onChange={(e) => setCoreInvoiceSent(e.target.value as "yes" | "no")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                disabled={coreStatus !== "completed"}
              >
                <option value="no">Not sent yet</option>
                <option value="yes">Invoice sent</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {coreStatus === "completed" ? (
                  <>
                    Matches <Link to={platformPath("/customer-invoicing")} className="text-ht-slate underline">Customer Invoicing</Link>
                    . Mark when the customer has been billed.
                  </>
                ) : (
                  "Available once the job is marked completed — then track here or on Customer Invoicing."
                )}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Scheduled day (board)</label>
              <input
                value={coreScheduledDay}
                onChange={(e) => setCoreScheduledDay(e.target.value)}
                placeholder="e.g. Monday"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 flex flex-wrap items-center gap-1 text-xs font-medium text-gray-600">
                <Calendar size={14} aria-hidden /> Collection date
                <ReqStar show={jobDetailMiss.collDate} why={REQ.collectionDate} />
              </label>
              <input
                type="date"
                value={coreCollectionDate}
                onChange={(e) => setCoreCollectionDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 flex flex-wrap items-center gap-1 text-xs font-medium text-gray-600">
                <Clock size={14} aria-hidden /> Delivery date
                <ReqStar show={jobDetailMiss.delDate} why={REQ.deliveryDate} />
              </label>
              <input
                type="date"
                value={coreDeliveryDate}
                onChange={(e) => setCoreDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Carrier
                <ReqStar show={jobDetailMiss.carrier} why={REQ.carrier} />
              </label>
              <input
                value={coreCarrier}
                onChange={(e) => setCoreCarrier(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Truck registration
                <ReqStar show={jobDetailMiss.truck} why={REQ.truckPlates} />
              </label>
              <input
                value={coreTruckPlates}
                onChange={(e) => setCoreTruckPlates(formatVehicleRegistrationDisplay(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Live Tracking map icon
                <span className="ml-1 font-normal text-gray-500">
                  (optional — fleet vehicle with same reg overrides this)
                </span>
              </label>
              <select
                value={coreLiveMapVehicleIcon}
                onChange={(e) => setCoreLiveMapVehicleIcon(e.target.value as LiveMapVehicleIconPreference)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {LIVE_MAP_VEHICLE_ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Assigned driver name <span className="font-normal text-gray-500">(optional — must match /driver login)</span>
              </label>
              <input
                value={assignedDriverName}
                onChange={(e) => setAssignedDriverName(e.target.value)}
                placeholder="e.g. Nik, Keir, Scott"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Driver mobile (SMS)</label>
              <input
                type="tel"
                value={assignedDriverPhone}
                onChange={(e) => setAssignedDriverPhone(e.target.value)}
                placeholder="For text alert link"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              type="button"
              className="gap-2"
              onClick={() => {
                const gaps: string[] = [];
                if (!coreCustomerName.trim()) gaps.push("Customer name");
                if (!coreHandler.trim()) gaps.push("Handler");
                if (!coreCollectionDate) gaps.push("Collection date");
                if (!coreDeliveryDate.trim()) gaps.push("Delivery date");
                if (!coreCarrier.trim()) gaps.push("Carrier");
                if (!coreTruckPlates.trim()) gaps.push("Truck registration");
                if (gaps.length > 0) {
                  notifyError("Complete critical job details", { description: gaps.join(" · ") });
                  return;
                }
                const updates: Partial<Job> = {
                  customerName: coreCustomerName.trim(),
                  customerEmail: customerEmail.trim() || undefined,
                  handler: coreHandler.trim(),
                  routeType: coreRouteType,
                  collectionDate: coreCollectionDate,
                  deliveryDate: coreDeliveryDate.trim(),
                  status: coreStatus,
                  scheduledDay: coreScheduledDay.trim() || undefined,
                  carrier: coreCarrier.trim(),
                  truckPlates: formatVehicleRegistrationDisplay(coreTruckPlates),
                  liveMapVehicleIcon: coreLiveMapVehicleIcon === "auto" ? undefined : coreLiveMapVehicleIcon,
                };
                if (coreStatus === "completed") {
                  updates.invoiceSent = coreInvoiceSent;
                }
                patchJob(updates);
                notifySuccess("Job details saved", {
                  description: "Drivers are notified on their next job refresh.",
                  href: platformPath(`/jobs/${id}`),
                });
              }}
            >
              Save job details
            </Btn>
            {buildDriverUpdateSmsUrl(assignedDriverPhone, job.jobNumber) && (
              <a
                href={buildDriverUpdateSmsUrl(assignedDriverPhone, job.jobNumber)!}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ht-border bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-ht-canvas"
              >
                <Smartphone size={16} aria-hidden /> Text driver update
              </a>
            )}
          </div>
        </Card>

        {job.pendingDriverAllocationRequest ? (
          <Card className="border-2 border-amber-400 bg-amber-50/90 p-5 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-amber-950">Driver asked to sign in (live tracking)</h2>
                <p className="mt-2 text-sm text-amber-950/90">
                  Registration <strong className="font-mono tracking-wide">{job.pendingDriverAllocationRequest.vehicleReg}</strong>
                  {job.pendingDriverAllocationRequest.driverName?.trim() ? (
                    <>
                      {" "}
                      — name given: <strong>{job.pendingDriverAllocationRequest.driverName.trim()}</strong>
                    </>
                  ) : null}
                  . This job had no truck registration yet. Confirm to set truck plates and optional driver name, or dismiss if
                  it was a mistake.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Btn
                  type="button"
                  variant="outline"
                  onClick={() => {
                    patchJob({ pendingDriverAllocationRequest: undefined });
                    notifySuccess("Request dismissed", { href: platformPath(`/jobs/${id}`) });
                  }}
                >
                  Dismiss
                </Btn>
                <Btn
                  type="button"
                  className="bg-amber-800 text-white hover:bg-amber-900"
                  onClick={() => {
                    const p = job.pendingDriverAllocationRequest!;
                    patchJob({
                      truckPlates: formatVehicleRegistrationDisplay(p.vehicleReg),
                      ...(p.driverName?.trim() ? { assignedDriverName: p.driverName.trim() } : {}),
                      pendingDriverAllocationRequest: undefined,
                    });
                    notifySuccess("Vehicle assigned — driver can sign in", { href: platformPath(`/jobs/${id}`) });
                  }}
                >
                  Assign vehicle to job
                </Btn>
              </div>
            </div>
          </Card>
        ) : null}

        <DriverPortalActivityPanel job={job} className="md:col-span-2" />

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapPin size={20} /> Collection & delivery details
          </h2>
          <WhyThisSection>{JOB_ADDRESS_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-600">
            Save each side when that side (and its postcode in the map section below) has the required fields. Contact names and
            emails are optional. Incomplete required fields still appear in the notifications bell.
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2 space-y-3">
              {job.driverDeliveryEtaAt ? (
                <div className="flex gap-3 rounded-lg border-2 border-green-500 bg-green-50/95 p-4 shadow-sm">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-green-800" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-green-900">Driver ETA to delivery</div>
                    <p className="mt-1 text-lg font-semibold text-green-950 sm:text-base">
                      {formatDriverDeliveryEtaDisplay(job.driverDeliveryEtaAt)}
                    </p>
                    {job.driverDeliveryEtaUpdatedAt ? (
                      <p className="mt-1 text-xs text-green-800/90">
                        Driver last updated: {formatDriverDeliveryEtaDisplay(job.driverDeliveryEtaUpdatedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No driver-submitted delivery ETA yet — drivers can set this from their job screen after sign-in.</p>
              )}
              {jobHasDriverReportedIssue(job) && job.driverReportedIssue ? (
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border-2 border-red-600 bg-red-50 p-4 shadow-sm">
                  <div className="flex min-w-0 gap-3">
                    <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden />
                    <div className="min-w-0">
                      <div className="text-sm font-bold uppercase tracking-wide text-red-900">Driver-reported issue</div>
                      <p className="mt-1 text-base font-semibold text-red-950">
                        {formatDriverIssueKindLabel(job.driverReportedIssue.kind)}
                      </p>
                      {job.driverReportedIssue.notes?.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-red-900/90">{job.driverReportedIssue.notes.trim()}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-red-800/90">
                        Reported {formatDriverDeliveryEtaDisplay(job.driverReportedIssue.reportedAt)}
                      </p>
                    </div>
                  </div>
                  <Btn
                    type="button"
                    variant="outline"
                    className="shrink-0 border-red-300 text-sm text-red-900 hover:bg-red-100"
                    onClick={() => {
                      patchJob({ driverReportedIssue: undefined });
                      notifySuccess("Driver report cleared on job", { href: platformPath(`/jobs/${id}`) });
                    }}
                  >
                    Clear driver report
                  </Btn>
                </div>
              ) : null}
            </div>
            <div className="space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30 p-4">
              <StructuredSiteAddressFields
                title="Collection"
                titleClassName="text-sm font-semibold text-emerald-900"
                wrapperClassName="space-y-3"
                routeType={coreRouteType}
                googleMapsApiKey={GOOGLE_MAPS_KEY}
                organisation={cOrg}
                line1={cLine1}
                line2={cLine2}
                town={cTown}
                onOrganisationChange={setCOrg}
                onLine1Change={setCLine1}
                onLine2Change={setCLine2}
                onTownChange={setCTown}
                onPlaceResolved={onCollectionPlace}
                showAddressRequiredStar={jobDetailMiss.cAddr}
                addressRequiredWhy={REQ.collectionAddress}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact name
                  <span className="ml-1 font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  value={cContactName}
                  onChange={(e) => setCContactName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact phone
                  <ReqStar show={jobDetailMiss.cPhone} why={REQ.collectionContact} />
                </label>
                <input
                  type="tel"
                  value={cContactPhone}
                  onChange={(e) => setCContactPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact email
                  <span className="ml-1 font-normal text-gray-500">(optional)</span>
                  <ReqStar show={jobDetailMiss.cEmail} why={REQ.collectionContact} />
                </label>
                <input
                  type="email"
                  value={cContactEmail}
                  onChange={(e) => setCContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <Btn type="button" variant="outline" className="text-sm" onClick={saveCollectionDetails}>
                Save collection details
              </Btn>
            </div>
            <div className="space-y-3 rounded-lg border border-red-200/80 bg-red-50/20 p-4">
              <StructuredSiteAddressFields
                title="Delivery"
                titleClassName="text-sm font-semibold text-red-900"
                wrapperClassName="space-y-3"
                routeType={coreRouteType}
                googleMapsApiKey={GOOGLE_MAPS_KEY}
                organisation={dOrg}
                line1={dLine1}
                line2={dLine2}
                town={dTown}
                onOrganisationChange={setDOrg}
                onLine1Change={setDLine1}
                onLine2Change={setDLine2}
                onTownChange={setDTown}
                onPlaceResolved={onDeliveryPlace}
                showAddressRequiredStar={jobDetailMiss.dAddr}
                addressRequiredWhy={REQ.deliveryAddress}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact name
                  <span className="ml-1 font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  value={dContactName}
                  onChange={(e) => setDContactName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact phone
                  <ReqStar show={jobDetailMiss.dPhone} why={REQ.deliveryContact} />
                </label>
                <input
                  type="tel"
                  value={dContactPhone}
                  onChange={(e) => setDContactPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contact email
                  <span className="ml-1 font-normal text-gray-500">(optional)</span>
                  <ReqStar show={jobDetailMiss.dEmail} why={REQ.deliveryContact} />
                </label>
                <input
                  type="email"
                  value={dContactEmail}
                  onChange={(e) => setDContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <Btn type="button" variant="outline" className="text-sm" onClick={saveDeliveryDetails}>
                Save delivery details
              </Btn>
            </div>
            <div className="lg:col-span-2 space-y-3 rounded-lg border border-indigo-200/80 bg-indigo-50/25 p-4">
              <WhyThisSection>{JOB_INVOICE_BILLING_WHY}</WhyThisSection>
              <p className="text-xs text-gray-600">
                Optional. Customer sales invoice PDF shows this in <strong>Invoice billing address</strong> when set;
                otherwise that block matches delivery. Collection and delivery always print in full below it on the PDF.
              </p>
              <StructuredSiteAddressFields
                title="Invoice billing (accounts / head office)"
                titleClassName="text-sm font-semibold text-indigo-950"
                wrapperClassName="space-y-3"
                routeType={coreRouteType}
                googleMapsApiKey={GOOGLE_MAPS_KEY}
                organisation={ibOrg}
                line1={ibLine1}
                line2={ibLine2}
                town={ibTown}
                onOrganisationChange={setIbOrg}
                onLine1Change={setIbLine1}
                onLine2Change={setIbLine2}
                onTownChange={setIbTown}
                onPlaceResolved={onInvoiceBillingPlace}
                showAddressRequiredStar={false}
                addressRequiredWhy={REQ.collectionAddress}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Billing postcode
                  <span className="ml-1 font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  value={invoiceBillingPostcode}
                  onChange={(e) => setInvoiceBillingPostcode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
                  placeholder="If different from delivery"
                />
              </div>
              <Btn type="button" variant="outline" className="text-sm" onClick={saveInvoiceBillingDetails}>
                Save invoice billing address
              </Btn>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <MapPin size={20} /> Map — postcodes & coordinates
          </h2>
          <WhyThisSection>{JOB_MAP_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-600">
            Domestic jobs must use full valid UK postcodes for the lookup button. For Ireland / EU, use “Geocode full
            addresses” (OpenStreetMap; one job at a time).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Collection postcode
                <ReqStar show={jobDetailMiss.cPc} why={REQ.collectionPostcode} />
              </label>
              <input
                value={collectionPostcode}
                onChange={(e) => setCollectionPostcode(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
                placeholder={coreRouteType === "domestic" ? "Full UK e.g. M1 1AA" : "UK or postal code"}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {coreRouteType === "domestic" ? "Full valid UK postcode." : "Required — any format accepted if ≥ 2 characters."}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Delivery postcode
                <ReqStar show={jobDetailMiss.dPc} why={REQ.deliveryPostcode} />
              </label>
              <input
                value={deliveryPostcode}
                onChange={(e) => setDeliveryPostcode(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
                placeholder={coreRouteType === "domestic" ? "Full UK e.g. B1 1AA" : "UK or postal code"}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {coreRouteType === "domestic" ? "Full valid UK postcode." : "Required — any format accepted if ≥ 2 characters."}
              </p>
            </div>
          </div>
          {(job.collectionLat != null || job.deliveryLat != null) && (
            <p className="mt-3 text-xs text-gray-500">
              Stored: collection {job.collectionLat?.toFixed(5)}, {job.collectionLng?.toFixed(5)} · delivery{" "}
              {job.deliveryLat != null ? `${job.deliveryLat.toFixed(5)}, ${job.deliveryLng?.toFixed(5)}` : "—"}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              type="button"
              variant="outline"
              className="text-sm"
              disabled={geoBusy}
              onClick={() => {
                if (!validatePostcodesOrToast()) return;
                patchJob({
                  collectionPostcode: collectionPostcode.trim() || undefined,
                  deliveryPostcode: deliveryPostcode.trim() || undefined,
                });
                notifySuccess("Postcodes saved", { href: platformPath(`/jobs/${id}`) });
              }}
            >
              Save postcodes only
            </Btn>
            <Btn
              type="button"
              className="text-sm"
              disabled={geoBusy}
              onClick={async () => {
                if (!validatePostcodesOrToast()) return;
                setGeoBusy(true);
                const cPc = collectionPostcode.trim();
                const dPc = deliveryPostcode.trim();
                let collectionLat = job.collectionLat;
                let collectionLng = job.collectionLng;
                let deliveryLat = job.deliveryLat;
                let deliveryLng = job.deliveryLng;

                if (coreRouteType === "domestic") {
                  const c = await geocodeUkPostcode(cPc);
                  if (!c) {
                    notifyError("Collection postcode not found");
                    setGeoBusy(false);
                    return;
                  }
                  collectionLat = c.lat;
                  collectionLng = c.lng;
                  const d = await geocodeUkPostcode(dPc);
                  if (!d) {
                    notifyError("Delivery postcode not found");
                    setGeoBusy(false);
                    return;
                  }
                  deliveryLat = d.lat;
                  deliveryLng = d.lng;
                  patchJob({
                    collectionPostcode: cPc || undefined,
                    deliveryPostcode: dPc || undefined,
                    collectionLat,
                    collectionLng,
                    deliveryLat,
                    deliveryLng,
                  });
                  notifySuccess("Map coordinates updated from UK postcodes");
                } else {
                  if (isValidUkPostcodeFormat(cPc)) {
                    const c = await geocodeUkPostcode(cPc);
                    if (c) {
                      collectionLat = c.lat;
                      collectionLng = c.lng;
                    }
                  }
                  if (isValidUkPostcodeFormat(dPc)) {
                    const d = await geocodeUkPostcode(dPc);
                    if (d) {
                      deliveryLat = d.lat;
                      deliveryLng = d.lng;
                    }
                  }
                  patchJob({
                    collectionPostcode: cPc || undefined,
                    deliveryPostcode: dPc || undefined,
                    collectionLat,
                    collectionLng,
                    deliveryLat,
                    deliveryLng,
                  });
                  notifySuccess(
                    isValidUkPostcodeFormat(cPc) || isValidUkPostcodeFormat(dPc)
                      ? "Postcodes saved — UK-format codes geocoded where possible"
                      : "Postcodes saved — use Geocode full addresses for map pins"
                  );
                }
                setGeoBusy(false);
              }}
            >
              Look up UK postcodes → map
            </Btn>
            <Btn
              type="button"
              variant="outline"
              className="text-sm"
              disabled={geoBusy}
              onClick={async () => {
                setGeoBusy(true);
                const draft = jobWithAddressDraft();
                const collQ = geocodeNominatimQuery(draft, "collection");
                const delQ = geocodeNominatimQuery(draft, "delivery");
                const coll = collQ.trim() ? await geocodeNominatim(collQ) : null;
                await delay(1100);
                const del = delQ.trim() ? await geocodeNominatim(delQ) : null;
                if (!coll && !del) {
                  notifyError("Could not geocode addresses");
                  setGeoBusy(false);
                  return;
                }
                patchJob({
                  ...(coll ? { collectionLat: coll.lat, collectionLng: coll.lng } : {}),
                  ...(del ? { deliveryLat: del.lat, deliveryLng: del.lng } : {}),
                });
                notifySuccess(coll && del ? "Collection & delivery placed from addresses" : "Partial geocode — check map");
                setGeoBusy(false);
              }}
            >
              Geocode full addresses
            </Btn>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Truck size={20} /> Financial (ex VAT)
          </h2>
          <WhyThisSection>{JOB_FINANCE_WHY}</WhyThisSection>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Sell (ex VAT)
                <ReqStar show={jobDetailMiss.finSell} why={REQ.sellPrice} />
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={finSell}
                  onChange={(e) => setFinSell(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Buy (ex VAT)
                <ReqStar show={jobDetailMiss.finBuy} why={REQ.buyPrice} />
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={finBuy}
                  onChange={(e) => setFinBuy(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Fuel surcharge (ex VAT)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={finFuel}
                  onChange={(e) => setFinFuel(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Extra charges</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={finExtra}
                  onChange={(e) => setFinExtra(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <Btn
              type="button"
              onClick={() => {
                if (finBuy.trim() === "") {
                  notifyError("Enter buy price (ex VAT)", { description: "Use 0 if the supplier rate is not agreed yet." });
                  return;
                }
                const sell = parseFloat(finSell) || 0;
                if (!(sell > 0)) {
                  notifyError("Sell price must be greater than zero", { description: REQ.sellPrice });
                  return;
                }
                const buy = parseFloat(finBuy) || 0;
                const fuel = parseFloat(finFuel) || 0;
                const extra = parseFloat(finExtra) || 0;
                const gp = computeJobGpExVat({ ...job, buyPrice: buy, sellPrice: sell, fuelSurcharge: fuel, extraCharges: extra });
                patchJob({
                  buyPrice: buy,
                  sellPrice: sell,
                  fuelSurcharge: fuel,
                  extraCharges: extra,
                  profit: gp.profit,
                  margin: gp.margin,
                });
                notifySuccess("Pricing saved", {
                  description: `GP £${gp.profit.toFixed(2)} · margin ${gp.margin.toFixed(1)}% (vs customer net ex VAT)`,
                  href: platformPath(`/jobs/${id}`),
                });
              }}
            >
              Save pricing
            </Btn>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                Preview: GP <strong className="text-green-700">£{pricingPreview.profit.toFixed(2)}</strong> · margin{" "}
                <strong>{pricingPreview.margin.toFixed(1)}%</strong>
                <span className="ml-2 text-xs">(customer net ex VAT minus supplier cost — saved when you click Save pricing)</span>
              </div>
              {job.supplierInvoiceLines && job.supplierInvoiceLines.length > 0 ? (
                <p className="text-xs text-amber-800">
                  Supplier invoice lines are on file — GP uses their total as cost. Edit under{" "}
                  <Link className="font-medium text-ht-slate underline" to={platformPath(`/supplier-invoicing?job=${job.id}`)}>
                    Supplier invoicing
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  <Link className="font-medium text-ht-slate underline" to={platformPath(`/supplier-invoicing?job=${job.id}`)}>
                    Supplier invoicing
                  </Link>{" "}
                  — upload supplier documents, costs, and links to customer invoice refs.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ClipboardList size={20} className="text-ht-slate" aria-hidden />
            Job register &amp; paperwork
          </h2>
          <WhyThisSection>{JOB_REGISTER_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-600">
            Matches the Hayleigh spreadsheet flow: billable flag, POD, customer/supplier invoice tracking, PO and references,
            payment dates.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Billable</label>
              <select
                value={sheetBillable}
                onChange={(e) => setSheetBillable(e.target.value as "yes" | "no")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">POD received</label>
              <select
                value={sheetPodReceived}
                onChange={(e) => setSheetPodReceived(e.target.value as "yes" | "no")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">POD sent</label>
              <select
                value={sheetPodSent}
                onChange={(e) => setSheetPodSent(e.target.value as "yes" | "no")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Supplier invoice received</label>
              <select
                value={sheetSupplierInvRec}
                onChange={(e) => setSheetSupplierInvRec(e.target.value as "yes" | "no")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Supplier due (payment)</label>
              <input
                type="date"
                value={sheetSupplierDue}
                onChange={(e) => setSheetSupplierDue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Customer payment date</label>
              <input
                type="date"
                value={sheetCustomerPaymentDate}
                onChange={(e) => setSheetCustomerPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hayleigh PO</label>
              <input
                value={sheetHayleighPo}
                onChange={(e) => setSheetHayleighPo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Internal PO"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Collection ref</label>
              <input
                value={sheetCollectionRef}
                onChange={(e) => setSheetCollectionRef(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Customer invoice ref</label>
              <input
                value={sheetCustomerInvoiceRef}
                onChange={(e) => setSheetCustomerInvoiceRef(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="If different from job number"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Customer <strong>invoice sent</strong> is saved with <strong>Save job details</strong> above (and Customer Invoicing).
          </p>
          <Btn
            type="button"
            className="mt-4"
            variant="outline"
            onClick={() => {
              patchJob({
                billable: sheetBillable,
                podSent: sheetPodSent,
                hayleighPo: sheetHayleighPo.trim(),
                collectionRef: sheetCollectionRef.trim(),
                customerInvoiceRef: sheetCustomerInvoiceRef.trim(),
                customerPaymentDate: sheetCustomerPaymentDate.trim(),
                podReceived: sheetPodReceived,
                supplierInvoiceReceived: sheetSupplierInvRec,
                supplierDueDate: sheetSupplierDue.trim(),
              });
              notifySuccess("Register & paperwork saved", { href: platformPath(`/jobs/${id}`) });
            }}
          >
            Save register &amp; paperwork
          </Btn>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Notes</h2>
          <WhyThisSection>{JOB_NOTES_WHY}</WhyThisSection>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Operational notes…"
          />
          <Btn
            type="button"
            className="mt-3"
            variant="outline"
            onClick={() => {
              patchJob({ notes: notesText });
              notifySuccess("Notes saved", { href: platformPath(`/jobs/${id}`) });
            }}
          >
            Save notes
          </Btn>
        </Card>

        <Card className="border border-blue-200/80 bg-blue-50/40 p-6 md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Bell size={20} className="text-blue-700" aria-hidden />
            Customer notifications
          </h2>
          <WhyThisSection>{JOB_NOTIFICATIONS_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-700">
            Emails open in your mail app — you send them (this site does not mail customers automatically without an email
            service). The dashboard and live             map can open the <strong>~1 hour</strong> delivery draft when live GPS suggests the
            driver is about an hour out (straight-line estimate at ~{ETA_ASSUMED_SPEED_KMH} km/h road guess).
          </p>
          <ul className="mb-4 list-inside list-disc text-sm text-gray-600">
            <li>
              <strong>24h reminder:</strong> send when goods are due to arrive within about a day — site contact and unload
              equipment.
            </li>
            <li>
              <strong>1h reminder:</strong> same message as the automated draft — someone on site and equipment to unload.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Btn
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                const url = build24hBeforeMailto(job);
                if (!url) {
                  notifyError("Add customer or delivery contact email first");
                  return;
                }
                openMailtoUrl(url);
                patchJob({ customerNotified24hAt: new Date().toISOString() });
                notifySuccess("24h reminder draft opened");
              }}
            >
              <Mail size={16} aria-hidden /> 24-hour reminder email
            </Btn>
            <Btn
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                const url = build1hAwayMailto(job);
                if (!url) {
                  notifyError("Add customer or delivery contact email first");
                  return;
                }
                openMailtoUrl(url);
                notifyMessage("1-hour email draft opened", { description: "Use for manual sends; live map may also open this once per job." });
              }}
            >
              <Mail size={16} aria-hidden /> 1-hour reminder (manual)
            </Btn>
          </div>
          <div className="mt-4 space-y-1 text-xs text-gray-600">
            {job.customerNotified24hAt && (
              <p>
                Last 24h reminder draft: {new Date(job.customerNotified24hAt).toLocaleString()}
              </p>
            )}
            {job.customerNotified1hEtaAt && (
              <p>Automated 1h draft triggered: {new Date(job.customerNotified1hEtaAt).toLocaleString()}</p>
            )}
            {job.officeUpdatedAt && (
              <p>
                Last office edit: {new Date(job.officeUpdatedAt).toLocaleString()} (rev {job.officeRevision ?? 0})
              </p>
            )}
          </div>
        </Card>

        {canDeleteJob && (
          <Card className="border-red-200 bg-red-50/50 p-6 lg:col-span-2">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-red-900">
              <Trash2 size={20} aria-hidden /> Move job to deleted bin
            </h2>
            <p className="mb-4 text-sm text-red-950/90">
              The job is removed from the live jobs list and kept in a <strong>deleted bin for 90 days</strong> (Settings →
              Deleted jobs). You can restore it during that time. After 90 days it is removed automatically. This applies to
              the whole team when cloud sync is on.
            </p>
            <Btn
              type="button"
              variant="outline"
              className="border-red-300 bg-white text-red-800 hover:bg-red-50"
              onClick={() => {
                const msg = `Move job ${job.jobNumber} to the deleted bin? It will disappear from jobs and the board until restored (90 days max).`;
                if (!window.confirm(msg)) return;
                softDeleteJob(job, user?.name);
                notifySuccess("Job moved to deleted bin", {
                  description: "Restore under Settings → Deleted jobs.",
                  href: platformPath("/settings"),
                });
                navigate(platformPath("/jobs"));
              }}
            >
              <Trash2 size={16} aria-hidden /> Move to deleted bin
            </Btn>
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileUp size={20} /> Attachments & POD email
        </h2>
        <WhyThisSection>{POD_ATTACHMENT_WHY}</WhyThisSection>
        <p className="mb-4 text-sm text-gray-600">
          Choose a proof-of-delivery file, then open a ready-to-send email to the customer. Websites cannot attach files to
          Outlook directly; on desktop we download the POD and open your mail app — attach from Downloads if needed. On
          supported devices, the system share sheet may include the file automatically.
        </p>
        <div className="mb-4 max-w-md space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Customer email
            <span className="ml-1 text-xs font-normal text-gray-500">(optional — required to open POD email draft)</span>
            <ReqStar show={jobDetailMiss.podCustEmail} why={REQ.customerEmail} />
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              onBlur={() => {
                const t = customerEmail.trim();
                if (t === (job.customerEmail ?? "").trim()) return;
                patchJob({ customerEmail: t || undefined });
              }}
              placeholder="customer@example.com"
              className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>
        </div>
        <input
          ref={podInputRef}
          type="file"
          className="sr-only"
          accept="image/*,.pdf,application/pdf"
          onChange={(e) => {
            onPodFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              podInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPodFiles(e.dataTransfer.files);
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            podInputRef.current?.click();
          }}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-ht-slate/40 hover:bg-gray-50/80"
        >
          <FileUp size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="mb-2 text-gray-600">Upload POD or documents (PDF or image)</p>
          {podLabel && (
            <p className="mb-3 text-sm font-medium text-ht-slate">
              Selected: {podLabel}
              {sessionLargePodName ? " (session only — not stored in job)" : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Btn variant="outline" type="button" onClick={() => podInputRef.current?.click()}>
              Choose files
            </Btn>
            {hasPodFile && (
              <Btn variant="outline" type="button" className="text-red-700" onClick={clearPod}>
                Remove POD
              </Btn>
            )}
            <Btn
              type="button"
              className="gap-2"
              disabled={!hasPodFile}
              onClick={() => void openEmailWithPod()}
            >
              <Mail size={16} aria-hidden /> Open email with POD
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
