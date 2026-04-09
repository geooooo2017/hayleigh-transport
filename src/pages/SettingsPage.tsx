import { useEffect, useMemo, useState } from "react";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { AlertTriangle, Building2, KeyRound, Percent } from "lucide-react";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { BIBBY_SETTINGS_WHY, REQ, SETTINGS_COMPANY_WHY, SETTINGS_PASSWORD_WHY } from "../lib/fieldRequirementCopy";
import { bibbyTotalDiscountAprPercent, type BibbyTerms } from "../lib/bibbyFinancing";
import { getUserBibbyTerms, saveUserBibbyTerms } from "../lib/userBibbySettings";
import { useAuth } from "../context/AuthContext";
import { platformPath } from "../routes/paths";
import { userCanDeleteJobs } from "../lib/permissions";
import {
  getUserCompanyDetails,
  saveUserCompanyDetails,
  type UserCompanyDetails,
} from "../lib/userCompanyProfile";

export default function SettingsPage() {
  const { user, changePassword } = useAuth();

  const [companyForm, setCompanyForm] = useState<UserCompanyDetails>(() => getUserCompanyDetails(user?.id));
  useEffect(() => {
    setCompanyForm(getUserCompanyDetails(user?.id));
  }, [user?.id]);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [bibbyTerms, setBibbyTerms] = useState<BibbyTerms>(() => getUserBibbyTerms(user?.id));
  useEffect(() => {
    setBibbyTerms(getUserBibbyTerms(user?.id));
  }, [user?.id]);

  const setBibby = <K extends keyof BibbyTerms>(key: K, value: BibbyTerms[K]) => {
    setBibbyTerms((prev) => ({ ...prev, [key]: value }));
  };

  const onSaveBibbyTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const t = bibbyTerms;
    if (t.prepaymentPercent < 0 || t.prepaymentPercent > 100) {
      notifyError("Prepayment must be between 0 and 100%.");
      return;
    }
    if ([t.serviceFeePercent, t.badDebtProtectionPercent, t.discountFeePercent, t.bankBaseRatePercent].some((n) => n < 0 || n > 100)) {
      notifyError("Fee percentages must be between 0 and 100.");
      return;
    }
    saveUserBibbyTerms(user.id, t);
    notifySuccess("Invoice financing terms saved", {
      description: "Job costing uses these rates from now on.",
      href: platformPath("/settings"),
    });
  };

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
          <Percent className="h-5 w-5 text-ht-slate" aria-hidden />
          Invoice financing (Bibby-style terms)
        </h2>
        <WhyThisSection>{BIBBY_SETTINGS_WHY}</WhyThisSection>
        <p className="text-sm text-gray-600">
          Saved per user on this device. Adjust to match your agreement (prepayment %, service fee, optional bad debt
          protection, discount margin, Bank of England base rate). Example: 85% prepayment, 0.95% service, 1.13% BDP, 2.99%
          + 3.75% = 6.74% total discount APR on drawn funds.
        </p>
        <form onSubmit={onSaveBibbyTerms} className="max-w-lg space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prepayment %</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={bibbyTerms.prepaymentPercent}
                onChange={(e) => setBibby("prepaymentPercent", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Service fee % (on invoice)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={bibbyTerms.serviceFeePercent}
                onChange={(e) => setBibby("serviceFeePercent", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bad debt protection %</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={bibbyTerms.badDebtProtectionPercent}
                onChange={(e) => setBibby("badDebtProtectionPercent", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Discount fee % (margin)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={bibbyTerms.discountFeePercent}
                onChange={(e) => setBibby("discountFeePercent", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bank of England base rate %</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={bibbyTerms.bankBaseRatePercent}
                onChange={(e) => setBibby("bankBaseRatePercent", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-500">Total discount (inc. base)</span>
                <div className="font-semibold text-gray-900">{bibbyTotalDiscountAprPercent(bibbyTerms).toFixed(2)}% p.a.</div>
              </div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={bibbyTerms.includeBadDebtProtection}
              onChange={(e) => setBibby("includeBadDebtProtection", e.target.checked)}
              className="rounded border-gray-300"
            />
            Include bad debt protection in job costing
          </label>
          <Btn type="submit">Save financing terms</Btn>
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

      <Card className="border-amber-200 bg-amber-50/80 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-amber-950">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          Deleting jobs from the system
        </h2>
        <div className="mt-3 space-y-2 text-sm text-amber-950">
          <p>
            <strong className="text-amber-900">Warning:</strong> Removing a job permanently deletes it for the whole team
            (including cloud sync). This cannot be undone.
          </p>
          {userCanDeleteJobs(user) ? (
            <p className="font-medium text-amber-900">
              You are signed in as <strong>Nik</strong> — you may delete jobs from the Jobs table or the job detail page.
              Always confirm with the office before deleting live work.
            </p>
          ) : (
            <p>
              Only <strong>Nik</strong> (signed in as Nik) can delete jobs. Everyone else should ask Nik to remove a job
              if it was created by mistake. You will not see a delete option on jobs.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
