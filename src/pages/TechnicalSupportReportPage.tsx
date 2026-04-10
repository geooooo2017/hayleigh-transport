import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Send } from "lucide-react";
import { Btn, Card } from "../components/Layout";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_NOTIFY_EMAIL,
  submitSupportTicket,
  type SupportCategory,
} from "../lib/technicalSupport";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const TARGET_DATA_URL_CHARS = 480_000;

async function shrinkImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
  if (dataUrl.length <= TARGET_DATA_URL_CHARS) return dataUrl;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("img"));
    img.src = dataUrl;
  });

  let w = img.naturalWidth || 800;
  let h = img.naturalHeight || 600;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl.slice(0, TARGET_DATA_URL_CHARS);

  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const jpeg = canvas.toDataURL("image/jpeg", 0.82);
    if (jpeg.length <= TARGET_DATA_URL_CHARS) return jpeg;
    w = Math.round(w * 0.85);
    h = Math.round(h * 0.85);
    if (w < 320 || h < 240) break;
  }
  return canvas.toDataURL("image/jpeg", 0.65);
}

export default function TechnicalSupportReportPage() {
  const [category, setCategory] = useState<SupportCategory>("technical");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterCompany, setReporterCompany] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      let screenshotDataUrl: string | null = null;
      if (file) {
        if (file.size > MAX_FILE_BYTES) {
          notifyError("Screenshot too large", { description: "Please use an image under 4 MB." });
          setSubmitting(false);
          return;
        }
        if (!file.type.startsWith("image/")) {
          notifyError("Please choose an image file", { description: "PNG, JPG, or similar." });
          setSubmitting(false);
          return;
        }
        try {
          screenshotDataUrl = await shrinkImageFile(file);
        } catch {
          notifyError("Could not read the image", { description: "Try another file or continue without a screenshot." });
          setSubmitting(false);
          return;
        }
      }

      const pageUrl = typeof window !== "undefined" ? window.location.href : null;
      const result = await submitSupportTicket({
        category,
        reporterName,
        reporterEmail,
        reporterCompany,
        description,
        screenshotDataUrl,
        pageUrl,
      });

      if (!result.ok) {
        notifyError("Could not submit", { description: result.error });
        return;
      }

      notifySuccess(`Ticket ${result.ticket.ticketNumber} logged`, {
        description: "Your email app should open next — send the message to complete notification (attach your screenshot there if it did not attach automatically).",
      });

      try {
        window.location.href = result.mailtoHref;
      } catch {
        window.open(result.mailtoHref, "_blank");
      }

      setDescription("");
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ht-navy">Report an issue or request a change</h1>
        <p className="mt-2 text-slate-600">
          Describe what went wrong or what you would like changed. You can attach a screenshot. You will receive a{" "}
          <strong>ticket number</strong> for tracking. Our team is notified at{" "}
          <a className="font-medium text-ht-slate underline" href={`mailto:${SUPPORT_NOTIFY_EMAIL}`}>
            {SUPPORT_NOTIFY_EMAIL}
          </a>
          .
        </p>
      </div>

      <Card className="space-y-5 p-6 shadow-md">
        <form className="space-y-5" onSubmit={onSubmit}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800">Type</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              {(["technical", "change_request"] as const).map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    className="text-ht-slate"
                  />
                  {SUPPORT_CATEGORY_LABELS[c]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Your name</label>
              <input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email (for follow-up)</label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company (optional)</label>
            <input
              value={reporterCompany}
              onChange={(e) => setReporterCompany(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Your organisation"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              What is happening? <span className="text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Steps to reproduce, what you expected, error messages, browser/device…"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Camera className="h-4 w-4 text-slate-500" aria-hidden />
              Screenshot (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ht-slate file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ht-slate-dark"
            />
            <p className="mt-1 text-xs text-slate-500">
              On a phone you can take a photo. Large images are compressed automatically. If email does not include the
              image, attach it manually when your mail app opens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Btn type="submit" disabled={submitting} className="gap-2">
              <Send size={16} aria-hidden />
              {submitting ? "Submitting…" : "Submit & open email"}
            </Btn>
            <Link to="/" className="text-sm font-medium text-ht-slate underline">
              Back to home
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
