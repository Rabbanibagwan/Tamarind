import { DEFAULT_SETTINGS } from "./defaults";
import type { DataStore } from "./store/types";
import { ALL_COLLECTIONS } from "./store/types";
import type {
  AppSettings,
  Auction,
  FarmerPattiDoc,
  LedgerEntry,
  Lot,
  Party,
  Payment,
  VendorBillDoc,
  WeightSlip,
} from "./types";

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  farmers: Party[];
  vendors: Party[];
  settings: AppSettings[];
  lots: Lot[];
  slips: WeightSlip[];
  auctions: Auction[];
  pattis: FarmerPattiDoc[];
  vendorBills: VendorBillDoc[];
  payments: Payment[];
  ledger: LedgerEntry[];
};

export async function exportBackup(store: DataStore): Promise<BackupPayload> {
  await ensureSettings(store);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    farmers: await store.getAll("farmers"),
    vendors: await store.getAll("vendors"),
    settings: await store.getAll("settings"),
    lots: await store.getAll("lots"),
    slips: await store.getAll("slips"),
    auctions: await store.getAll("auctions"),
    pattis: await store.getAll("pattis"),
    vendorBills: await store.getAll("vendorBills"),
    payments: await store.getAll("payments"),
    ledger: await store.getAll("ledger"),
  };
}

export async function importBackup(
  store: DataStore,
  payload: BackupPayload,
): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error("Unsupported backup format");
  }
  await store.transaction(async () => {
    for (const c of ALL_COLLECTIONS) {
      await store.clear(c);
    }
    await store.bulkPut("farmers", payload.farmers ?? []);
    await store.bulkPut("vendors", payload.vendors ?? []);
    await store.bulkPut(
      "settings",
      payload.settings?.length ? payload.settings : [DEFAULT_SETTINGS],
    );
    await store.bulkPut("lots", payload.lots ?? []);
    await store.bulkPut("slips", payload.slips ?? []);
    await store.bulkPut("auctions", payload.auctions ?? []);
    await store.bulkPut("pattis", payload.pattis ?? []);
    await store.bulkPut("vendorBills", payload.vendorBills ?? []);
    await store.bulkPut("payments", payload.payments ?? []);
    await store.bulkPut("ledger", payload.ledger ?? []);
  });
}

export async function clearAllData(store: DataStore): Promise<void> {
  await store.transaction(async () => {
    for (const c of ALL_COLLECTIONS) {
      await store.clear(c);
    }
    await store.put("settings", DEFAULT_SETTINGS);
  });
}

export async function ensureSettings(store: DataStore): Promise<AppSettings> {
  const existing = await store.get("settings", "settings");
  if (existing) return existing;
  await store.put("settings", DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function getSettings(store: DataStore): Promise<AppSettings> {
  return ensureSettings(store);
}

export async function updateSettings(
  store: DataStore,
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<AppSettings> {
  const current = await ensureSettings(store);
  const next = { ...current, ...patch, id: "settings" as const };
  await store.put("settings", next);
  return next;
}
