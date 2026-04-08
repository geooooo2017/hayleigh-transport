import { toast } from "sonner";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { OnboardingState } from "../types";
import { Btn, Card } from "../components/Layout";

export default function SettingsPage() {
  const [onboarding, setOnboarding] = useLocalStorage<OnboardingState>("onboarding", {
    companyName: "",
    completed: false,
  });

  const resetDemo = () => {
    if (!confirm("Clear all local data and reload?")) return;
    localStorage.clear();
    window.location.href = "/welcome";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Settings</h1>
        <p className="mt-1 text-gray-500">Company profile and demo utilities</p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Company</h2>
        <p className="text-sm text-gray-600">
          Registered name: <strong>{onboarding.companyName || "—"}</strong>
        </p>
        <p className="text-xs text-gray-500">Update via re-running onboarding or edit localStorage key `onboarding`.</p>
        <Btn
          variant="outline"
          onClick={() => {
            setOnboarding({ ...onboarding, completed: false });
            toast.info("Onboarding reset — you will be redirected to welcome on next navigation.");
            window.location.href = "/welcome";
          }}
        >
          Reset onboarding flow
        </Btn>
      </Card>

      <Card className="space-y-4 border-red-100 bg-red-50/50 p-6">
        <h2 className="font-semibold text-red-900">Danger zone</h2>
        <p className="text-sm text-gray-700">Clears jobs, customers, drivers, vehicles, and auth.</p>
        <Btn className="bg-red-600 hover:bg-red-700" onClick={resetDemo}>
          Reset all demo data
        </Btn>
      </Card>
    </div>
  );
}
