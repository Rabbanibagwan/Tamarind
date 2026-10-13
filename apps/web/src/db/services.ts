/**
 * Web-bound services: same API as before, backed by shared @tamarind/core + Dexie.
 */
import * as core from "@tamarind/core";
import { store } from "./dexieStore";

export async function upsertParty(
  table: "farmers" | "vendors",
  input: { id?: string; name: string; phone?: string; village?: string; notes?: string },
) {
  return core.upsertParty(store, table, input);
}

export async function listParties(table: "farmers" | "vendors") {
  return core.listParties(store, table);
}

export async function deleteParty(table: "farmers" | "vendors", id: string) {
  return core.deleteParty(store, table, id);
}

export async function createLot(input: {
  farmerId: string;
  date?: string;
  commodity?: string;
  bagWeights: number[];
}) {
  return core.createLot(store, input);
}

export async function listLots() {
  return core.listLots(store);
}

export async function getLot(id: string) {
  return core.getLot(store, id);
}

export async function getSlipForLot(lotId: string) {
  return core.getSlipForLot(store, lotId);
}

export async function recordSlipPrint(slipId: string) {
  return core.recordSlipPrint(store, slipId);
}

export async function createAuction(input: {
  lotId: string;
  ratePerKg: number | string;
  allocations: Array<{ vendorId: string; bagIndices: number[] }>;
}) {
  return core.createAuction(store, input);
}

export async function listAuctions() {
  return core.listAuctions(store);
}

export async function listOpenLots() {
  return core.listOpenLots(store);
}

export async function createFarmerPatti(input: {
  farmerId: string;
  auctionIds: string[];
  hamali?: number | string;
  bhada?: number | string;
  stationery?: number | string;
  commissionPercent?: number;
}) {
  return core.createFarmerPatti(store, input);
}

export async function listPattis() {
  return core.listPattis(store);
}

export async function unsettledAuctionsForFarmer(farmerId: string) {
  return core.unsettledAuctionsForFarmer(store, farmerId);
}

export async function createVendorBill(input: {
  vendorId: string;
  allocationRefs: Array<{ auctionId: string; allocationId: string }>;
  hamali?: number | string;
  cess?: number | string;
  commissionPercent?: number;
}) {
  return core.createVendorBill(store, input);
}

export async function listVendorBills() {
  return core.listVendorBills(store);
}

export async function unbilledAllocationsForVendor(vendorId: string) {
  return core.unbilledAllocationsForVendor(store, vendorId);
}

export async function recordPayment(input: {
  partyType: "farmer" | "vendor";
  docType: "patti" | "vendor_bill";
  docId: string;
  amount: number | string;
  mode?: core.Payment["mode"];
  note?: string;
  date?: string;
}) {
  return core.recordPayment(store, input);
}

export async function listPayments() {
  return core.listPayments(store);
}

export async function ledgerForParty(
  partyType: "farmer" | "vendor",
  partyId: string,
) {
  return core.ledgerForParty(store, partyType, partyId);
}

export async function dashboardStats() {
  return core.dashboardStats(store);
}

export { weight } from "@tamarind/core";
