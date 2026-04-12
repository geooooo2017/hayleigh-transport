import { useCallback, useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, Download, History, Loader2 } from "lucide-react";
import { Btn, Card } from "./Layout";
import { WhyThisSection } from "./FormGuidance";
import { ONEDRIVE_BACKUP_WHY } from "../lib/fieldRequirementCopy";
import { useAuth } from "../context/AuthContext";
import { useJobRecycleBin, useJobs } from "../context/JobsContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { CompanyBackupSnapshot } from "../lib/companyBackupSnapshot";
import { buildFullBackupPdfPack } from "../lib/companyBackupPdfs";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { getUserBibbyTerms } from "../lib/userBibbySettings";
import { loadSupportTickets } from "../lib/technicalSupport";
import type { Customer, Driver, Vehicle } from "../types";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { useSearchParams } from "react-router-dom";
import {
  beginMicrosoftSignIn,
  clearStoredGraphTokens,
  isMicrosoftOneDriveConfigured,
  readStoredGraphTokens,
  refreshGraphTokens,
  uploadBlobToOneDrivePath,
  type StoredGraphTokens,
} from "../lib/microsoftGraphOneDrive";
import { prependBackupRun, readBackupHistory, type BackupFileRecord } from "../lib/backupHistory";

function backupFolderName(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function OneDriveBackupCard() {
  const { user } = useAuth();
  const [jobs] = useJobs();
  const { deletedBin } = useJobRecycleBin();
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [searchParams, setSearchParams] = useSearchParams();

  const [includeJobPdfs, setIncludeJobPdfs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState("");
  const [history, setHistory] = useState(() => readBackupHistory());
  const [msSession, setMsSession] = useState<StoredGraphTokens | null>(() => readStoredGraphTokens());

  const msConfigured = isMicrosoftOneDriveConfigured();
  const connected = Boolean(msSession);

  const refreshHistory = useCallback(() => setHistory(readBackupHistory()), []);

  useEffect(() => {
    const ok = searchParams.get("onedrive");
    const err = searchParams.get("onedrive_error");
    if (ok === "connected") {
      setMsSession(readStoredGraphTokens());
      notifySuccess("Microsoft connected", { description: "You can run a OneDrive backup below.", href: platformPath("/settings") });
      searchParams.delete("onedrive");
      setSearchParams(searchParams, { replace: true });
    }
    if (err) {
      notifyError("OneDrive sign-in failed", { description: decodeURIComponent(err) });
      searchParams.delete("onedrive_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const snapshotBase = useMemo((): Omit<CompanyBackupSnapshot, "supportTickets"> => {
    return {
      exportedAt: new Date().toISOString(),
      preparedBy: user?.name,
      userId: user?.id,
      company: getUserCompanyDetails(user?.id),
      bibby: getUserBibbyTerms(user?.id),
      customers,
      drivers,
      vehicles,
      jobs,
      deletedBin,
    };
  }, [user?.name, user?.id, customers, drivers, vehicles, jobs, deletedBin]);

  const buildSnapshot = useCallback(async (): Promise<CompanyBackupSnapshot> => {
    const tickets = await loadSupportTickets();
    return { ...snapshotBase, exportedAt: new Date().toISOString(), supportTickets: tickets };
  }, [snapshotBase]);

  const runDownloadPack = async () => {
    setBusy(true);
    setStatusLine("Building PDFs…");
    try {
      const snap = await buildSnapshot();
      const files = await buildFullBackupPdfPack(snap, { includePerJobPdfs: includeJobPdfs });
      setStatusLine(`Downloading ${files.length} files…`);
      const recs: BackupFileRecord[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        setStatusLine(`Downloading ${i + 1}/${files.length}: ${f.filename}`);
        const url = URL.createObjectURL(f.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = f.filename;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
        recs.push({ name: f.filename, size: f.blob.size });
        await new Promise((r) => setTimeout(r, 450));
      }
      prependBackupRun({
        at: snap.exportedAt,
        destination: "download",
        success: true,
        fileCount: files.length,
        files: recs,
      });
      refreshHistory();
      notifySuccess("Backup PDFs exported", {
        description: `${files.length} files — check your Downloads folder.`,
        href: platformPath("/settings"),
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : "Backup failed";
      notifyError(m);
      prependBackupRun({
        at: new Date().toISOString(),
        destination: "download",
        success: false,
        error: m,
      });
      refreshHistory();
    } finally {
      setBusy(false);
      setStatusLine("");
    }
  };

  const runOneDriveUpload = async () => {
    let tokens = readStoredGraphTokens();
    if (!tokens) {
      notifyError("Connect Microsoft first", { description: "Use Connect Microsoft, then try again." });
      return;
    }
    setBusy(true);
    setStatusLine("Refreshing token…");
    try {
      tokens = await refreshGraphTokens(tokens);
      const snap = await buildSnapshot();
      const files = await buildFullBackupPdfPack(snap, { includePerJobPdfs: includeJobPdfs });
      const folder = `HayleighTransportBackup/${backupFolderName()}`;
      setStatusLine(`Uploading ${files.length} files to OneDrive…`);
      const recs: BackupFileRecord[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        setStatusLine(`Uploading ${i + 1}/${files.length}: ${f.filename}`);
        const path = `${folder}/${f.filename}`;
        await uploadBlobToOneDrivePath(tokens.access_token, path, f.blob);
        recs.push({ name: f.filename, size: f.blob.size });
        await new Promise((r) => setTimeout(r, 350));
      }
      prependBackupRun({
        at: snap.exportedAt,
        destination: "onedrive",
        folderPath: folder,
        success: true,
        fileCount: files.length,
        files: recs,
      });
      refreshHistory();
      notifySuccess("Backup uploaded to OneDrive", {
        description: `Folder: ${folder}`,
        href: platformPath("/settings"),
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : "Upload failed";
      notifyError(m);
      prependBackupRun({
        at: new Date().toISOString(),
        destination: "onedrive",
        success: false,
        error: m,
      });
      refreshHistory();
    } finally {
      setBusy(false);
      setStatusLine("");
    }
  };

  const connectMs = async () => {
    try {
      await beginMicrosoftSignIn();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not start sign-in");
    }
  };

  const disconnectMs = () => {
    clearStoredGraphTokens();
    setMsSession(null);
    refreshHistory();
    notifySuccess("Microsoft disconnected", { description: "OneDrive tokens removed from this browser." });
  };

  const jobPdfWarning = includeJobPdfs && jobs.length > 20;

  return (
    <Card className="space-y-4 p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Cloud className="h-5 w-5 text-ht-slate" aria-hidden />
        OneDrive backup (PDF export)
      </h2>
      <WhyThisSection>{ONEDRIVE_BACKUP_WHY}</WhyThisSection>

      {!msConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>OneDrive upload is not configured.</strong> Add{" "}
          <code className="rounded bg-white px-1">VITE_MS_CLIENT_ID</code> to your <code className="rounded bg-white px-1">.env</code>{" "}
          (Azure Portal → App registration → SPA → redirect URI{" "}
          <code className="rounded bg-white px-1">{typeof window !== "undefined" ? window.location.origin : ""}/onedrive-callback</code>
          , Microsoft Graph <code className="rounded bg-white px-1">Files.ReadWrite</code>), then rebuild the app. You can still use{" "}
          <strong>Download PDF pack</strong> without Microsoft.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {msConfigured ? (
          connected ? (
            <Btn type="button" variant="outline" className="gap-2" onClick={disconnectMs} disabled={busy}>
              <CloudOff size={16} aria-hidden /> Disconnect Microsoft
            </Btn>
          ) : (
            <Btn type="button" className="gap-2" onClick={() => void connectMs()} disabled={busy}>
              <Cloud size={16} aria-hidden /> Connect Microsoft (OneDrive)
            </Btn>
          )
        ) : null}
        <Btn type="button" className="gap-2" onClick={() => void runDownloadPack()} disabled={busy}>
          <Download size={16} aria-hidden /> Download PDF pack
        </Btn>
        {msConfigured && connected ? (
          <Btn type="button" className="gap-2" onClick={() => void runOneDriveUpload()} disabled={busy}>
            <Cloud size={16} aria-hidden /> Upload to OneDrive
          </Btn>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={includeJobPdfs}
          onChange={(e) => setIncludeJobPdfs(e.target.checked)}
          disabled={busy}
          className="mt-1"
        />
        <span>
          Include <strong>combined booking</strong> and <strong>customer invoice</strong> PDF for every job (adds two files per job;
          can be slow for large fleets).
        </span>
      </label>
      {jobPdfWarning ? (
        <p className="text-xs text-amber-800">
          You have {jobs.length} jobs — this option may take several minutes and many browser downloads/uploads.
        </p>
      ) : null}

      {busy ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>{statusLine || "Working…"}</span>
        </div>
      ) : null}

      <div className="border-t border-ht-border pt-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <History size={16} aria-hidden />
          Recent backups (this browser)
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No runs yet — exports appear here with file names and sizes.</p>
        ) : (
          <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {h.success ? "OK" : "Failed"} · {h.destination === "onedrive" ? "OneDrive" : "Download"}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(h.at).toLocaleString("en-GB")}</span>
                </div>
                {h.folderPath ? (
                  <p className="mt-1 text-xs text-gray-600">
                    Folder: <code className="rounded bg-white px-1">{h.folderPath}</code>
                  </p>
                ) : null}
                {h.error ? <p className="mt-1 text-xs text-red-700">{h.error}</p> : null}
                {h.files && h.files.length > 0 ? (
                  <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto font-mono text-xs text-gray-700">
                    {h.files.map((f) => (
                      <li key={f.name}>
                        {f.name} ({Math.round(f.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                ) : h.fileCount != null ? (
                  <p className="mt-1 text-xs text-gray-600">{h.fileCount} files</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
