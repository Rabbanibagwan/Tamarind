export {
  DEFAULT_SETTINGS,
  type BackupPayload,
} from "@tamarind/core";
export { dexieDb as db, store, createDexieStore } from "./dexieStore";

import {
  clearAllData as clearAllDataCore,
  exportBackup as exportBackupCore,
  importBackup as importBackupCore,
  ensureSettings as ensureSettingsCore,
  getSettings as getSettingsCore,
  updateSettings as updateSettingsCore,
  type BackupPayload,
  type AppSettings,
} from "@tamarind/core";
import { store } from "./dexieStore";

export async function ensureSettings(): Promise<AppSettings> {
  return ensureSettingsCore(store);
}

export async function getSettings(): Promise<AppSettings> {
  return getSettingsCore(store);
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<AppSettings> {
  return updateSettingsCore(store, patch);
}

export async function exportBackup(): Promise<BackupPayload> {
  return exportBackupCore(store);
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  return importBackupCore(store, payload);
}

export async function clearAllData(): Promise<void> {
  return clearAllDataCore(store);
}
