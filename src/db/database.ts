import Dexie, { type Table } from "dexie";
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
import { money } from "../domain/money";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  merchantName: "Tamarind Mandi",
  merchantAddress: "",
  merchantPhone: "",
  suitDivisor: 20,
  farmerCommissionPercent: 10,
  vendorCommissionPercent: 2,
  defaultHamaliPerBag: money(8),
  defaultBhada: money(40),
  defaultStationery: money(20),
  defaultVendorHamaliPerBag: money(10),
  defaultCessPercent: 0,
  printWidthMm: 80,
  nextLotNumber: 1,
  nextSlipNumber: 1,
  nextPattiNumber: 1,
  nextVendorBillNumber: 1,
};

export class TamarindDB extends Dexie {
  farmers!: Table<Party, string>;
  vendors!: Table<Party, string>;
  settings!: Table<AppSettings, string>;
  lots!: Table<Lot, string>;
  slips!: Table<WeightSlip, string>;
  auctions!: Table<Auction, string>;
  pattis!: Table<FarmerPattiDoc, string>;
  vendorBills!: Table<VendorBillDoc, string>;
  payments!: Table<Payment, string>;
  ledger!: Table<LedgerEntry, string>;

  constructor() {
    super("tamarind_billing_v1");
    this.version(1).stores({
      farmers: "id, name",
      vendors: "id, name",
      settings: "id",
      lots: "id, lotNumber, date, farmerId, status",
      slips: "id, lotId, slipNumber",
      auctions: "id, lotId, date, farmerId",
      pattis: "id, pattiNumber, date, farmerId",
      vendorBills: "id, billNumber, date, vendorId",
      payments: "id, date, partyId, docId",
      ledger: "id, date, partyId, partyType",
    });
  }
}

export const db = new TamarindDB();

export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function getSettings(): Promise<AppSettings> {
  return ensureSettings();
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<AppSettings> {
  const current = await ensureSettings();
  const next = { ...current, ...patch, id: "settings" as const };
  await db.settings.put(next);
  return next;
}

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

export async function exportBackup(): Promise<BackupPayload> {
  await ensureSettings();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    farmers: await db.farmers.toArray(),
    vendors: await db.vendors.toArray(),
    settings: await db.settings.toArray(),
    lots: await db.lots.toArray(),
    slips: await db.slips.toArray(),
    auctions: await db.auctions.toArray(),
    pattis: await db.pattis.toArray(),
    vendorBills: await db.vendorBills.toArray(),
    payments: await db.payments.toArray(),
    ledger: await db.ledger.toArray(),
  };
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error("Unsupported backup format");
  }
  await db.transaction(
    "rw",
    [
      db.farmers,
      db.vendors,
      db.settings,
      db.lots,
      db.slips,
      db.auctions,
      db.pattis,
      db.vendorBills,
      db.payments,
      db.ledger,
    ],
    async () => {
      await Promise.all([
        db.farmers.clear(),
        db.vendors.clear(),
        db.settings.clear(),
        db.lots.clear(),
        db.slips.clear(),
        db.auctions.clear(),
        db.pattis.clear(),
        db.vendorBills.clear(),
        db.payments.clear(),
        db.ledger.clear(),
      ]);
      await db.farmers.bulkPut(payload.farmers ?? []);
      await db.vendors.bulkPut(payload.vendors ?? []);
      await db.settings.bulkPut(
        payload.settings?.length ? payload.settings : [DEFAULT_SETTINGS],
      );
      await db.lots.bulkPut(payload.lots ?? []);
      await db.slips.bulkPut(payload.slips ?? []);
      await db.auctions.bulkPut(payload.auctions ?? []);
      await db.pattis.bulkPut(payload.pattis ?? []);
      await db.vendorBills.bulkPut(payload.vendorBills ?? []);
      await db.payments.bulkPut(payload.payments ?? []);
      await db.ledger.bulkPut(payload.ledger ?? []);
    },
  );
}

export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.farmers,
      db.vendors,
      db.settings,
      db.lots,
      db.slips,
      db.auctions,
      db.pattis,
      db.vendorBills,
      db.payments,
      db.ledger,
    ],
    async () => {
      await Promise.all([
        db.farmers.clear(),
        db.vendors.clear(),
        db.settings.clear(),
        db.lots.clear(),
        db.slips.clear(),
        db.auctions.clear(),
        db.pattis.clear(),
        db.vendorBills.clear(),
        db.payments.clear(),
        db.ledger.clear(),
      ]);
      await db.settings.put(DEFAULT_SETTINGS);
    },
  );
}
