import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { OnboardingState } from "../types";

const allowed = new Set(["/welcome", "/quote"]);

export function OnboardingRedirect() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let completed = false;
    try {
      const raw = localStorage.getItem("onboarding");
      if (raw) completed = !!(JSON.parse(raw) as OnboardingState).completed;
    } catch {
      /* ignore */
    }
    if (!completed && !allowed.has(loc.pathname)) {
      navigate("/welcome", { replace: true });
    }
  }, [loc.pathname, navigate]);

  return null;
}
