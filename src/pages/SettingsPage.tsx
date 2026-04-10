import { useEffect, useMemo, useState } from "react";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { AlertTriangle, Archive, Building2, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { REQ, SETTINGS_COMPANY_WHY, SETTINGS_PASSWORD_WHY } from "../lib/fieldRequirementCopy";
import { useAuth } from "../context/AuthContext";
import { platformPath } from "../routes/paths";
import { useJobRecycleBin } from "../context/JobsContext";
import { daysRemainingInBin } from "../lib/deletedJobsBin";
import { formatJobCardDate } from "../lib/jobAddress";
import { userCanDeleteJobs } from "../lib/permissions";
import {
  getUserCompanyDetails,
  saveUserCompanyDetails,
  type UserCompanyDetails,
} from "../lib/userCompanyProfile";

export default function SettingsPage() {
  const { user, changePassword } = useAuth();
  const { deletedBin, restoreJobFromBin, permanentlyRemoveFromBin } = useJobRecycleBin();

  const [companyForm, setCompanyForm] = useState<UserCompanyDetails>(() => getUserCompanyDetails(user?.id));
  useEffect(() => {
    setCompanyForm(getUserCompanyDetails(user?.id));
  }, [user?.id]);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      notifyError("New passwords do not match.");
      return;
    }
    const r = changePassword(currentPw, newPw);
    if (!r.ok) {
      notifyError(r.error);
      return;
    }
    notifySuccess("Password updated", {
      description: "Use your new password next time you sign in on this browser.",
      href: platformPath("/settings"),
    });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const onSaveCompanyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyForm.companyLegalName.trim()) {
      notifyError("Legal name is required", { description: REQ.legalName });
      return;
    }
    if (!companyForm.vatNumber.trim()) {
      notifyError("VAT number is required", { description: REQ.vatNumber });
      return;
    }
    saveUserCompanyDetails(user.id, companyForm);
    notifySuccess("Company details saved", {
      description: "These details appear on booking PDFs, CSV exports, and printed paperwork you generate.",
      href: platformPath("/settings"),
    });
  };

  const setField = (key: keyof UserCompanyDetails, value: string) => {
    setCompanyForm((prev) => ({ ...prev, [key]: value }));
  };

  const companyMiss = useMemo(
    () => ({
      legal: !companyForm.companyLegalName.trim(),
      vat: !companyForm.vatNumber.trim(),
    }),
    [companyForm.companyLegalName, companyForm.vatNumber]
  );

  const passwordMiss = useMemo(
    () => ({
      current: !currentPw,
      newPw: !newPw,
      confirm: !confirmPw,
    }),
    [currentPw, newPw, confirmPw]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Settings</h1>
        <p className="mt-1 text-gray-500">Company profile, your password, and data rules</p>
      </div>

      <MissingFieldLegend />

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Building2 className="h-5 w-5 text-ht-slate" aria-hidden />
          Your company details (letterhead)
        </h2>
        <WhyThisSection>{SETTINGS_COMPANY_WHY}</WhyThisSection>
        <p className="text-sm text-gray-600">
          Saved for <strong>{user?.name ?? "—"}</strong> on this device. They are used on booking PDFs, CSV exports, and
          browser-printed paperwork when you generate them — so each user can show their own contact line (mobile /
          email) while keeping shared registration numbers.
        </p>
        <form onSubmit={onSaveCompanyDetails} className="max-w-lg space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Legal name
              <ReqStar show={companyMiss.legal} why={REQ.legalName} />
            </label>
            <input
              value={companyForm.companyLegalName}
              onChange={(e) => setField("companyLegalName", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tel</label>
              <input
                value={companyForm.telephone}
                onChange={(e) => setField("telephone", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="01698 480314"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mob</label>
              <input
                value={companyForm.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Your mobile"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={companyForm.email}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="you@hayleigh.uk"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
            <input
              value={companyForm.website}
              onChange={(e) => setField("website", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs font-medium text-gray-700">Company details</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Company number</label>
            <input
              value={companyForm.companyNumber}
              onChange={(e) => setField("companyNumber", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              GB VAT number
              <ReqStar show={companyMiss.vat} why={REQ.vatNumber} />
            </label>
            <input
              value={companyForm.vatNumber}
              onChange={(e) => setField("vatNumber", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">EORI number</label>
            <input
              value={companyForm.eoriNumber}
              onChange={(e) => setField("eoriNumber", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <Btn type="submit">Save company details</Btn>
        </form>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-ht-slate" aria-hidden />
          Change password
        </h2>
        <WhyThisSection>{SETTINGS_PASSWORD_WHY}</WhyThisSection>
        <p className="text-sm text-gray-600">
          Updates your sign-in for <strong>{user?.email ?? "—"}</strong> on this device. Passwords are stored in this
          browser only until you add a central auth system.
        </p>
        <form onSubmit={onChangePassword} className="max-w-md space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Current password
              <ReqStar show={passwordMiss.current} why="Required to confirm you know the existing password." />
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New password
              <ReqStar show={passwordMiss.newPw} why="Choose a new password of at least 8 characters." />
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm new password
              <ReqStar show={passwordMiss.confirm} why="Must match the new password to avoid lockouts." />
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </div>
          <Btn type="submit">Save new password</Btn>
        </form>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Archive className="h-5 w-5 shrink-0 text-ht-slate" aria-hidden />
          Deleted jobs (90 days)
        </h2>
        <p className="text-sm text-gray-600">
          Jobs you remove from the jobs list or job detail page are kept here for <strong>90 days</strong>, then removed
          automatically. Restore puts the job back on the board; <strong>Erase forever</strong> deletes it immediately for
          everyone (including cloud sync).
        </p>
        {userCanDeleteJobs(user) ? (
          deletedBin.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No jobs in the bin.
            </p>
          ) : (
            <ul className="space-y-3">
              {deletedBin.map((e) => {
                const j = e.job;
                const left = daysRemainingInBin(e.deletedAt);
                return (
                  <li
                    key={`${j.id}-${e.deletedAt}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ht-slate">{j.jobNumber}</div>
                        <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                          <div>Customer job no.: {j.customerInvoiceRef?.trim() || "—"}</div>
                          <div>Collection: {formatJobCardDate(j.collectionDate)}</div>
                          <div>
                            Postcodes: {(j.collectionPostcode ?? "").trim() || "—"} → {(j.deliveryPostcode ?? "").trim() || "—"}
                          </div>
                          <div className="text-gray-500">
                            Deleted {new Date(e.deletedAt).toLocaleString("en-GB")} {e.deletedBy ? `· ${e.deletedBy}` : ""}
                          </div>
                          <div className="font-medium text-amber-800">{left} day{left === 1 ? "" : "s"} until auto-removal</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Btn
                          type="button"
                          variant="outline"
                          className="gap-1.5 text-sm"
                          onClick={() => {
                            restoreJobFromBin(j.id);
                            notifySuccess("Job restored", { description: j.jobNumber, href: platformPath("/jobs") });
                          }}
                        >
                          <RotateCcw size={14} aria-hidden /> Restore
                        </Btn>
                        <Btn
                          type="button"
                          variant="outline"
                          className="gap-1.5 border-red-200 text-sm text-red-800 hover:bg-red-50"
                          onClick={() => {
                            const msg = `Permanently erase ${j.jobNumber} from the bin? This cannot be undone.`;
                            if (!window.confirm(msg)) return;
                            permanentlyRemoveFromBin(j.id);
                            notifySuccess("Job removed from bin", { href: platformPath("/settings") });
                          }}
                        >
                          <Trash2 size={14} aria-hidden /> Erase forever
                        </Btn>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <p className="text-sm text-gray-500">Sign in to manage deleted jobs.</p>
        )}
      </Card>

      <Card className="border-amber-200 bg-amber-50/80 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-amber-950">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          Deleting jobs
        </h2>
        <div className="mt-3 space-y-2 text-sm text-amber-950">
          <p>
            <strong className="text-amber-900">Note:</strong> “Delete” moves a job to this bin for 90 days — it is not gone
            immediately unless you erase it here or wait for expiry.
          </p>
          {userCanDeleteJobs(user) ? (
            <p className="font-medium text-amber-900">
              Signed-in staff can move jobs to the bin from the Jobs table or job detail page. Confirm with the office before
              removing live work.
            </p>
          ) : (
            <p>Sign in as staff to delete or restore jobs.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
