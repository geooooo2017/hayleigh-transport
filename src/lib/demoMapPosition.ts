/** Stable pseudo-coordinates for demo map pins (UK). Replace with telematics lat/lng when available. */
export function demoPositionForJob(jobId: number): { lat: number; lng: number } {
  const a = ((jobId * 9301 + 49297) % 10000) / 10000;
  const b = ((jobId * 7919 + 23333) % 10000) / 10000;
  const lat = 50.2 + a * 7.4;
  const lng = -6.2 + b * 7.8;
  return { lat, lng };
}
