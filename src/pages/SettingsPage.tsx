import { useLocalStorage } from "../hooks/useLocalStorage";
import type { OnboardingState } from "../types";
import { Card } from "../components/Layout";

export default function SettingsPage() {
  const [onboarding] = useLocalStorage<OnboardingState>("onboarding", {
    companyName: "",
    completed: false,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Settings</h1>
        <p className="mt-1 text-gray-500">Company profile</p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Company</h2>
        <p className="text-sm text-gray-600">
          Registered name: <strong>{onboarding.companyName || "—"}</strong>
        </p>
        <p className="text-xs text-gray-500">Set when you first used the app; you can change it in browser devtools under localStorage key `onboarding` if needed.</p>
      </Card>
    </div>
  );
}
