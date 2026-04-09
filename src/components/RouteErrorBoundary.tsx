import { Component, type ErrorInfo, type ReactNode } from "react";
import { PLATFORM_BASE } from "../routes/paths";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors in the platform shell so a failed page doesn’t blank the whole app.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "Unknown error";
      return (
        <div
          className="box-border min-h-screen w-full bg-ht-canvas p-6 text-red-950"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-lg font-semibold">This page couldn’t load</h1>
          <p className="mt-2 text-sm text-red-900/90">
            Something went wrong while rendering this screen. You can go back to the dashboard or sign in again.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-red-200 bg-white p-3 text-xs text-red-800">
            {msg}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex rounded-lg bg-ht-slate px-4 py-2 text-sm font-medium text-white hover:bg-ht-slate-dark"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <a
              href={PLATFORM_BASE}
              className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
            >
              Reload dashboard
            </a>
            <a
              href="/login"
              className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
            >
              Staff login
            </a>
          </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
