/**
 * Temporary demo helpers for testing Live Tracking without an assigned job.
 * Delete this file and remove all imports/usages when you no longer need demo mode.
 */

export const LIVE_TRACKING_DEMO_FAST_POLL_MS = 4000;

const FAST_POLL_STORAGE_KEY = "ht_live_tracking_demo_fast_poll";

export function readLiveTrackingDemoFastPoll(): boolean {
  try {
    return sessionStorage.getItem(FAST_POLL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLiveTrackingDemoFastPoll(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(FAST_POLL_STORAGE_KEY, "1");
    else sessionStorage.removeItem(FAST_POLL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
