export type BackupFileRecord = { name: string; size: number };

export type BackupRunRecord = {
  at: string;
  destination: "onedrive" | "download";
  folderPath?: string;
  success: boolean;
  fileCount?: number;
  files?: BackupFileRecord[];
  error?: string;
};

const KEY = "ht_company_backup_history_v1";
const MAX = 25;

export function readBackupHistory(): BackupRunRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as BackupRunRecord[]) : [];
  } catch {
    return [];
  }
}

export function prependBackupRun(record: BackupRunRecord): void {
  try {
    const next = [record, ...readBackupHistory()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}
