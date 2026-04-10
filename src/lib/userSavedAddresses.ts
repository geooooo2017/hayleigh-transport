/** Last-used collection / delivery details per user (localStorage) for prepopulating new jobs. */

export type SavedAddressSide = {
  addressLines: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  postcode: string;
};

export type SavedJobAddresses = {
  collection: SavedAddressSide;
  delivery: SavedAddressSide;
};

const prefix = "ht_saved_job_addresses_";

function storageKey(userId: string): string {
  return prefix + userId;
}

export function loadSavedJobAddresses(userId: string | undefined): SavedJobAddresses | null {
  if (!userId || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedJobAddresses;
    if (!p?.collection || !p?.delivery) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveSavedJobAddresses(userId: string | undefined, data: SavedJobAddresses): void {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
