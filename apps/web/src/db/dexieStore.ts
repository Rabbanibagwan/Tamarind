import Dexie, { type Table } from "dexie";
import type {
  AppSettings,
  Auction,
  CollectionName,
  CollectionRowMap,
  DataStore,
  FarmerPattiDoc,
  LedgerEntry,
  Lot,
  Party,
  Payment,
  VendorBillDoc,
  WeightSlip,
} from "@tamarind/core";

class TamarindDB extends Dexie {
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

export const dexieDb = new TamarindDB();

function tableFor(collection: CollectionName): Table<CollectionRowMap[typeof collection], string> {
  return dexieDb[collection] as Table<CollectionRowMap[typeof collection], string>;
}

export function createDexieStore(): DataStore {
  return {
    async get(collection, id) {
      return (await tableFor(collection).get(id)) as never;
    },
    async put(collection, row) {
      await tableFor(collection).put(row as never);
    },
    async update(collection, id, patch) {
      await tableFor(collection).update(id, patch as never);
    },
    async delete(collection, id) {
      await tableFor(collection).delete(id);
    },
    async getAll(collection) {
      return (await tableFor(collection).toArray()) as never;
    },
    async clear(collection) {
      await tableFor(collection).clear();
    },
    async bulkPut(collection, rows) {
      await tableFor(collection).bulkPut(rows as never);
    },
    async count(collection) {
      return tableFor(collection).count();
    },
    async filter(collection, predicate) {
      return (await tableFor(collection).filter(predicate as never).toArray()) as never;
    },
    async whereEquals(collection, field, value) {
      return (await tableFor(collection)
        .where(field)
        .equals(value as never)
        .toArray()) as never;
    },
    async transaction(fn) {
      return dexieDb.transaction(
        "rw",
        [
          dexieDb.farmers,
          dexieDb.vendors,
          dexieDb.settings,
          dexieDb.lots,
          dexieDb.slips,
          dexieDb.auctions,
          dexieDb.pattis,
          dexieDb.vendorBills,
          dexieDb.payments,
          dexieDb.ledger,
        ],
        fn,
      );
    },
  };
}

export const store = createDexieStore();
