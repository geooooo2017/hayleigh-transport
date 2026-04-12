import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens, verifyOAuthState, writeStoredGraphTokens } from "../lib/microsoftGraphOneDrive";
import { platformPath } from "../routes/paths";

/**
 * OAuth redirect target (must match Azure SPA redirect URI and `oneDriveRedirectUri()`).
 */
export default function OneDriveCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Completing Microsoft sign-in…");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");
    const desc = searchParams.get("error_description");
    const state = searchParams.get("state");

    if (err) {
      setMsg(desc || err);
      const q = encodeURIComponent(desc || err);
      navigate(`${platformPath("/settings")}?onedrive_error=${q}`, { replace: true });
      return;
    }

    if (!verifyOAuthState(state)) {
      setMsg("Invalid sign-in state — try again from Settings.");
      navigate(`${platformPath("/settings")}?onedrive_error=${encodeURIComponent("Invalid OAuth state")}`, {
        replace: true,
      });
      return;
    }

    if (!code) {
      navigate(`${platformPath("/settings")}?onedrive_error=${encodeURIComponent("No authorization code")}`, {
        replace: true,
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code);
        if (cancelled) return;
        writeStoredGraphTokens(tokens);
        navigate(`${platformPath("/settings")}?onedrive=connected`, { replace: true });
      } catch (e) {
        if (cancelled) return;
        const m = e instanceof Error ? e.message : "Could not complete sign-in";
        setMsg(m);
        navigate(`${platformPath("/settings")}?onedrive_error=${encodeURIComponent(m)}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ht-canvas p-6 text-center">
      <p className="text-sm text-gray-700">{msg}</p>
    </div>
  );
}
