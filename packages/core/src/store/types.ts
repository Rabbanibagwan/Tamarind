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
} from "../types";

export type CollectionName =
  | "farmers"
  | "vendors"
  | "settings"
  | "lots"
  | "slips"
  | "auctions"
  | "pattis"
  | "vendorBills"
  | "payments"
  | "ledger";

export type CollectionRowMap = {
  farmers: Party;
  vendors: Party;
  settings: AppSettings;
  lots: Lot;
  slips: WeightSlip;
  auctions: Auction;
  pattis: FarmerPattiDoc;
  vendorBills: VendorBillDoc;
  payments: Payment;
  ledger: LedgerEntry;
};

/**
 * Platform-agnostic persistence. Web = Dexie/IndexedDB; Mobile = SQLite.
 * Implementations must support nested `transaction` calls (SQLite/Dexie).
 */
export interface DataStore {
  get<C extends CollectionName>(
    collection: C,
    id: string,
  ): Promise<CollectionRowMap[C] | undefined>;

  put<C extends CollectionName>(
    collection: C,
    row: CollectionRowMap[C],
  ): Promise<void>;

  update<C extends CollectionName>(
    collection: C,
    id: string,
    patch: Partial<CollectionRowMap[C]>,
  ): Promise<void>;

  delete(collection: CollectionName, id: string): Promise<void>;

  getAll<C extends CollectionName>(collection: C): Promise<CollectionRowMap[C][]>;

  clear(collection: CollectionName): Promise<void>;

  bulkPut<C extends CollectionName>(
    collection: C,
    rows: CollectionRowMap[C][],
  ): Promise<void>;

  count(collection: CollectionName): Promise<number>;

  /** Filter in-memory over a collection (fine for single-merchant scale). */
  filter<C extends CollectionName>(
    collection: C,
    predicate: (row: CollectionRowMap[C]) => boolean,
  ): Promise<CollectionRowMap[C][]>;

  whereEquals<C extends CollectionName>(
    collection: C,
    field: keyof CollectionRowMap[C] & string,
    value: unknown,
  ): Promise<CollectionRowMap[C][]>;

  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const ALL_COLLECTIONS: CollectionName[] = [
  "farmers",
  "vendors",
  "settings",
  "lots",
  "slips",
  "auctions",
  "pattis",
  "vendorBills",
  "payments",
  "ledger",
];
