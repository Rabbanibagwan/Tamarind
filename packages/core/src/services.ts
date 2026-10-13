import { createId } from "./domain/ids";
import { d, money, mul, pctOf, sub, sumWeights, weight } from "./domain/money";
import { calculateFarmerPatti } from "./domain/patti";
import { ruleFromSettings, summarizeBags } from "./domain/suit";
import { calculateVendorBill } from "./domain/vendorBill";
import {
  ensureSettings,
  getSettings,
  updateSettings,
} from "./backup";
import type { DataStore } from "./store/types";
import type {
  Auction,
  AuctionAllocation,
  FarmerPattiDoc,
  LedgerEntry,
  Lot,
  Party,
  Payment,
  VendorBillDoc,
  WeightSlip,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Parties ---------- */

export async function upsertParty(
  store: DataStore,
  table: "farmers" | "vendors",
  input: { id?: string; name: string; phone?: string; village?: string; notes?: string },
): Promise<Party> {
  const ts = nowIso();
  const party: Party = {
    id: input.id ?? createId(table === "farmers" ? "farmer" : "vendor"),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    village: input.village?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: ts,
    updatedAt: ts,
  };
  if (input.id) {
    const existing = await store.get(table, input.id);
    if (existing) party.createdAt = existing.createdAt;
  }
  await store.put(table, party);
  return party;
}

export async function listParties(
  store: DataStore,
  table: "farmers" | "vendors",
): Promise<Party[]> {
  const rows = await store.getAll(table);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteParty(
  store: DataStore,
  table: "farmers" | "vendors",
  id: string,
): Promise<void> {
  await store.delete(table, id);
}

/* ---------- Lots / Action Diary ---------- */

export async function createLot(
  store: DataStore,
  input: {
    farmerId: string;
    date?: string;
    commodity?: string;
    bagWeights: number[];
  },
): Promise<{ lot: Lot; slip: WeightSlip }> {
  const settings = await getSettings(store);
  const farmer = await store.get("farmers", input.farmerId);
  if (!farmer) throw new Error("Farmer not found");
  if (!input.bagWeights.length) throw new Error("Add at least one bag weight");

  const suitRuleSnapshot = ruleFromSettings(settings.suitDivisor);
  const summary = summarizeBags(input.bagWeights, suitRuleSnapshot);
  const ts = nowIso();
  const lotNumber = settings.nextLotNumber;
  const slipNumber = settings.nextSlipNumber;

  const lot: Lot = {
    id: createId("lot"),
    lotNumber,
    date: input.date ?? todayDate(),
    farmerId: farmer.id,
    farmerName: farmer.name,
    commodity: input.commodity?.trim() || "Tamarind",
    bags: summary.bags.map((b, index) => ({
      index,
      weightKg: b.weightKg,
      suitKg: b.suitKg,
      netKg: b.netKg,
    })),
    bagCount: summary.bagCount,
    grossWeight: summary.grossWeight,
    suitTotal: summary.suitTotal,
    netWeight: summary.netWeight,
    suitRuleSnapshot,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  };

  const slip: WeightSlip = {
    id: createId("slip"),
    slipNumber,
    lotId: lot.id,
    printedCount: 0,
    createdAt: ts,
  };
  lot.slipId = slip.id;

  await store.transaction(async () => {
    await store.put("lots", lot);
    await store.put("slips", slip);
    await updateSettings(store, {
      nextLotNumber: lotNumber + 1,
      nextSlipNumber: slipNumber + 1,
    });
  });

  return { lot, slip };
}

export async function listLots(store: DataStore): Promise<Lot[]> {
  const lots = await store.getAll("lots");
  return lots.sort((a, b) => b.lotNumber - a.lotNumber);
}

export async function getLot(store: DataStore, id: string): Promise<Lot | undefined> {
  return store.get("lots", id);
}

export async function getSlipForLot(
  store: DataStore,
  lotId: string,
): Promise<WeightSlip | undefined> {
  const slips = await store.whereEquals("slips", "lotId", lotId);
  return slips[0];
}

/** Reprint only increments print counter — never duplicates the slip row. */
export async function recordSlipPrint(
  store: DataStore,
  slipId: string,
): Promise<WeightSlip> {
  const slip = await store.get("slips", slipId);
  if (!slip) throw new Error("Slip not found");
  const next: WeightSlip = {
    ...slip,
    printedCount: slip.printedCount + 1,
    lastPrintedAt: nowIso(),
  };
  await store.put("slips", next);
  return next;
}

/* ---------- Auction ---------- */

export async function createAuction(
  store: DataStore,
  input: {
    lotId: string;
    ratePerKg: number | string;
    allocations: Array<{ vendorId: string; bagIndices: number[] }>;
  },
): Promise<Auction> {
  const lot = await store.get("lots", input.lotId);
  if (!lot) throw new Error("Lot not found");
  if (lot.status !== "open") throw new Error("Lot already auctioned");
  if (!input.allocations.length) throw new Error("Add at least one vendor allocation");

  const used = new Set<number>();
  const allocations: AuctionAllocation[] = [];

  for (const alloc of input.allocations) {
    const vendor = await store.get("vendors", alloc.vendorId);
    if (!vendor) throw new Error("Vendor not found");
    if (!alloc.bagIndices.length) throw new Error("Allocation needs bags");
    for (const idx of alloc.bagIndices) {
      if (used.has(idx)) throw new Error(`Bag ${idx + 1} allocated twice`);
      if (idx < 0 || idx >= lot.bags.length) throw new Error(`Invalid bag index ${idx}`);
      used.add(idx);
    }
    const bags = alloc.bagIndices.map((i) => lot.bags[i]);
    const grossWeight = sumWeights(bags.map((b) => b.weightKg));
    const suitTotal = sumWeights(bags.map((b) => b.suitKg));
    const netWeight = sumWeights(bags.map((b) => b.netKg));
    allocations.push({
      id: createId("alloc"),
      vendorId: vendor.id,
      vendorName: vendor.name,
      bagIndices: [...alloc.bagIndices].sort((a, b) => a - b),
      bagCount: bags.length,
      grossWeight,
      suitTotal,
      netWeight,
    });
  }

  if (used.size !== lot.bags.length) {
    throw new Error("All bags must be allocated to vendors");
  }

  const ratePerKg = money(input.ratePerKg);
  const saleAmount = mul(lot.netWeight, ratePerKg);
  const ts = nowIso();

  const auction: Auction = {
    id: createId("auction"),
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    date: todayDate(),
    farmerId: lot.farmerId,
    farmerName: lot.farmerName,
    ratePerKg,
    bagCount: lot.bagCount,
    netWeight: lot.netWeight,
    saleAmount,
    suitRuleSnapshot: lot.suitRuleSnapshot,
    allocations,
    finalized: true,
    createdAt: ts,
  };

  await store.transaction(async () => {
    await store.put("auctions", auction);
    await store.update("lots", lot.id, {
      status: "auctioned",
      auctionId: auction.id,
      updatedAt: ts,
    });
  });

  return auction;
}

export async function listAuctions(store: DataStore): Promise<Auction[]> {
  const rows = await store.getAll("auctions");
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOpenLots(store: DataStore): Promise<Lot[]> {
  const lots = await store.whereEquals("lots", "status", "open");
  return lots.sort((a, b) => b.lotNumber - a.lotNumber);
}

/* ---------- Farmer Patti ---------- */

export async function createFarmerPatti(
  store: DataStore,
  input: {
    farmerId: string;
    auctionIds: string[];
    hamali?: number | string;
    bhada?: number | string;
    stationery?: number | string;
    commissionPercent?: number;
  },
): Promise<FarmerPattiDoc> {
  const settings = await getSettings(store);
  const farmer = await store.get("farmers", input.farmerId);
  if (!farmer) throw new Error("Farmer not found");
  if (!input.auctionIds.length) throw new Error("Select auctions");

  const auctions: Auction[] = [];
  for (const id of input.auctionIds) {
    const a = await store.get("auctions", id);
    if (!a) throw new Error("Auction not found");
    if (a.farmerId !== farmer.id) throw new Error("Auction belongs to another farmer");
    const existing = await store.filter("pattis", (p) =>
      p.lines.some((l) => l.auctionId === id),
    );
    if (existing[0]) throw new Error(`Auction lot #${a.lotNumber} already on a patti`);
    auctions.push(a);
  }

  const suitRuleSnapshot = auctions[0].suitRuleSnapshot;
  const lines = auctions.map((a) => ({
    lotId: a.lotId,
    lotNumber: a.lotNumber,
    auctionId: a.id,
    netWeight: a.netWeight,
    ratePerKg: a.ratePerKg,
    saleAmount: a.saleAmount,
    bagCount: a.bagCount,
  }));

  const netWeight = sumWeights(lines.map((l) => l.netWeight));
  const saleAmount = money(lines.reduce((acc, l) => acc.plus(d(l.saleAmount)), d(0)));
  const bagCount = lines.reduce((acc, l) => acc + l.bagCount, 0);

  const hamali =
    input.hamali !== undefined
      ? money(input.hamali)
      : mul(bagCount, settings.defaultHamaliPerBag);
  const bhada = money(input.bhada ?? settings.defaultBhada);
  const stationery = money(input.stationery ?? settings.defaultStationery);
  const commissionPercent = input.commissionPercent ?? settings.farmerCommissionPercent;

  const avgRate = d(netWeight).gt(0) ? d(saleAmount).div(d(netWeight)) : d(0);
  const calc = calculateFarmerPatti({
    netWeightKg: netWeight,
    ratePerKg: money(avgRate),
    commissionPercent,
    hamali,
    bhada,
    stationery,
    suitRuleSnapshot,
  });

  const commissionAmount = pctOf(saleAmount, commissionPercent);
  const deductionsTotal = money(
    d(commissionAmount).plus(d(hamali)).plus(d(bhada)).plus(d(stationery)),
  );
  const payable = sub(saleAmount, deductionsTotal);

  const pattiNumber = settings.nextPattiNumber;
  const ts = nowIso();
  const doc: FarmerPattiDoc = {
    id: createId("patti"),
    pattiNumber,
    date: todayDate(),
    farmerId: farmer.id,
    farmerName: farmer.name,
    lines,
    netWeight,
    saleAmount,
    commissionPercent,
    commissionAmount,
    hamali,
    bhada,
    stationery,
    deductionsTotal,
    payable,
    paidAmount: money(0),
    balanceAmount: payable,
    suitRuleSnapshot,
    finalized: true,
    createdAt: ts,
  };

  const ledger: LedgerEntry = {
    id: createId("ledger"),
    date: doc.date,
    partyType: "farmer",
    partyId: farmer.id,
    partyName: farmer.name,
    kind: "patti_payable",
    refType: "patti",
    refId: doc.id,
    refNumber: pattiNumber,
    debit: money(0),
    credit: payable,
    note: `Patti #${pattiNumber}`,
    createdAt: ts,
  };

  await store.transaction(async () => {
    await store.put("pattis", doc);
    for (const line of lines) {
      await store.update("lots", line.lotId, { status: "settled", updatedAt: ts });
    }
    await updateSettings(store, { nextPattiNumber: pattiNumber + 1 });
    await store.put("ledger", ledger);
  });

  void calc;
  return doc;
}

export async function listPattis(store: DataStore): Promise<FarmerPattiDoc[]> {
  return (await store.getAll("pattis")).sort((a, b) => b.pattiNumber - a.pattiNumber);
}

export async function unsettledAuctionsForFarmer(
  store: DataStore,
  farmerId: string,
): Promise<Auction[]> {
  const auctions = await store.whereEquals("auctions", "farmerId", farmerId);
  const result: Auction[] = [];
  for (const a of auctions) {
    const onPatti = await store.filter("pattis", (p) =>
      p.lines.some((l) => l.auctionId === a.id),
    );
    if (!onPatti[0]) result.push(a);
  }
  return result.sort((a, b) => b.lotNumber - a.lotNumber);
}

/* ---------- Vendor Bills ---------- */

export async function createVendorBill(
  store: DataStore,
  input: {
    vendorId: string;
    allocationRefs: Array<{ auctionId: string; allocationId: string }>;
    hamali?: number | string;
    cess?: number | string;
    commissionPercent?: number;
  },
): Promise<VendorBillDoc> {
  const settings = await getSettings(store);
  const vendor = await store.get("vendors", input.vendorId);
  if (!vendor) throw new Error("Vendor not found");
  if (!input.allocationRefs.length) throw new Error("Select allocations");

  const lines: VendorBillDoc["lines"] = [];
  let suitRuleSnapshot = ruleFromSettings(settings.suitDivisor);

  for (const ref of input.allocationRefs) {
    const auction = await store.get("auctions", ref.auctionId);
    if (!auction) throw new Error("Auction not found");
    const alloc = auction.allocations.find((a) => a.id === ref.allocationId);
    if (!alloc) throw new Error("Allocation not found");
    if (alloc.vendorId !== vendor.id) throw new Error("Allocation belongs to another vendor");
    const existing = await store.filter("vendorBills", (b) =>
      b.lines.some((l) => l.allocationId === ref.allocationId),
    );
    if (existing[0]) throw new Error(`Allocation already billed (lot #${auction.lotNumber})`);

    suitRuleSnapshot = auction.suitRuleSnapshot;
    const baseAmount = mul(alloc.netWeight, auction.ratePerKg);
    lines.push({
      lotId: auction.lotId,
      lotNumber: auction.lotNumber,
      auctionId: auction.id,
      allocationId: alloc.id,
      netWeight: alloc.netWeight,
      ratePerKg: auction.ratePerKg,
      baseAmount,
      bagCount: alloc.bagCount,
    });
  }

  const netWeight = sumWeights(lines.map((l) => l.netWeight));
  const baseAmount = money(lines.reduce((acc, l) => acc.plus(d(l.baseAmount)), d(0)));
  const bagCount = lines.reduce((acc, l) => acc + l.bagCount, 0);
  const commissionPercent = input.commissionPercent ?? settings.vendorCommissionPercent;
  const hamali =
    input.hamali !== undefined
      ? money(input.hamali)
      : mul(bagCount, settings.defaultVendorHamaliPerBag);
  const cess =
    input.cess !== undefined
      ? money(input.cess)
      : pctOf(baseAmount, settings.defaultCessPercent);

  const calc = calculateVendorBill({
    netWeightKg: netWeight,
    ratePerKg: d(netWeight).gt(0) ? money(d(baseAmount).div(d(netWeight))) : money(0),
    commissionPercent,
    hamali,
    cess,
    suitRuleSnapshot,
  });

  const commissionAmount = pctOf(baseAmount, commissionPercent);
  const total = money(d(baseAmount).plus(d(commissionAmount)).plus(d(hamali)).plus(d(cess)));

  const billNumber = settings.nextVendorBillNumber;
  const ts = nowIso();
  const doc: VendorBillDoc = {
    id: createId("vbill"),
    billNumber,
    date: todayDate(),
    vendorId: vendor.id,
    vendorName: vendor.name,
    lines,
    netWeight,
    baseAmount,
    commissionPercent,
    commissionAmount,
    hamali,
    cess,
    total,
    paidAmount: money(0),
    balanceAmount: total,
    suitRuleSnapshot,
    finalized: true,
    createdAt: ts,
  };

  const ledger: LedgerEntry = {
    id: createId("ledger"),
    date: doc.date,
    partyType: "vendor",
    partyId: vendor.id,
    partyName: vendor.name,
    kind: "vendor_bill",
    refType: "vendor_bill",
    refId: doc.id,
    refNumber: billNumber,
    debit: total,
    credit: money(0),
    note: `Vendor bill #${billNumber}`,
    createdAt: ts,
  };

  await store.transaction(async () => {
    await store.put("vendorBills", doc);
    await updateSettings(store, { nextVendorBillNumber: billNumber + 1 });
    await store.put("ledger", ledger);
  });

  void calc;
  return doc;
}

export async function listVendorBills(store: DataStore): Promise<VendorBillDoc[]> {
  return (await store.getAll("vendorBills")).sort((a, b) => b.billNumber - a.billNumber);
}

export async function unbilledAllocationsForVendor(
  store: DataStore,
  vendorId: string,
): Promise<Array<{ auction: Auction; allocation: AuctionAllocation }>> {
  const auctions = await store.getAll("auctions");
  const result: Array<{ auction: Auction; allocation: AuctionAllocation }> = [];
  for (const auction of auctions) {
    for (const allocation of auction.allocations) {
      if (allocation.vendorId !== vendorId) continue;
      const billed = await store.filter("vendorBills", (b) =>
        b.lines.some((l) => l.allocationId === allocation.id),
      );
      if (!billed[0]) result.push({ auction, allocation });
    }
  }
  return result.sort((a, b) => b.auction.lotNumber - a.auction.lotNumber);
}

/* ---------- Payments ---------- */

export async function recordPayment(
  store: DataStore,
  input: {
    partyType: "farmer" | "vendor";
    docType: "patti" | "vendor_bill";
    docId: string;
    amount: number | string;
    mode?: Payment["mode"];
    note?: string;
    date?: string;
  },
): Promise<Payment> {
  const amount = money(input.amount);
  if (d(amount).lte(0)) throw new Error("Amount must be positive");

  const ts = nowIso();
  let partyId = "";
  let partyName = "";
  let docNumber = 0;

  if (input.docType === "patti") {
    const doc = await store.get("pattis", input.docId);
    if (!doc) throw new Error("Patti not found");
    const nextPaid = money(d(doc.paidAmount).plus(d(amount)));
    if (d(nextPaid).gt(d(doc.payable))) throw new Error("Payment exceeds payable balance");
    partyId = doc.farmerId;
    partyName = doc.farmerName;
    docNumber = doc.pattiNumber;
    await store.update("pattis", doc.id, {
      paidAmount: nextPaid,
      balanceAmount: sub(doc.payable, nextPaid),
    });
  } else {
    const doc = await store.get("vendorBills", input.docId);
    if (!doc) throw new Error("Vendor bill not found");
    const nextPaid = money(d(doc.paidAmount).plus(d(amount)));
    if (d(nextPaid).gt(d(doc.total))) throw new Error("Payment exceeds bill balance");
    partyId = doc.vendorId;
    partyName = doc.vendorName;
    docNumber = doc.billNumber;
    await store.update("vendorBills", doc.id, {
      paidAmount: nextPaid,
      balanceAmount: sub(doc.total, nextPaid),
    });
  }

  const payment: Payment = {
    id: createId("pay"),
    date: input.date ?? todayDate(),
    partyType: input.partyType,
    partyId,
    partyName,
    docType: input.docType,
    docId: input.docId,
    docNumber,
    amount,
    mode: input.mode ?? "cash",
    note: input.note,
    createdAt: ts,
  };

  const ledger: LedgerEntry = {
    id: createId("ledger"),
    date: payment.date,
    partyType: input.partyType,
    partyId,
    partyName,
    kind: "payment",
    refType: "payment",
    refId: payment.id,
    refNumber: docNumber,
    debit: input.partyType === "farmer" ? amount : money(0),
    credit: input.partyType === "vendor" ? amount : money(0),
    note: `Payment ${amount} toward ${input.docType} #${docNumber}`,
    createdAt: ts,
  };

  await store.put("payments", payment);
  await store.put("ledger", ledger);
  return payment;
}

export async function listPayments(store: DataStore): Promise<Payment[]> {
  return (await store.getAll("payments")).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function ledgerForParty(
  store: DataStore,
  partyType: "farmer" | "vendor",
  partyId: string,
): Promise<LedgerEntry[]> {
  return (await store.whereEquals("ledger", "partyId", partyId))
    .filter((e) => e.partyType === partyType)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ---------- Dashboard ---------- */

export async function dashboardStats(store: DataStore) {
  await ensureSettings(store);
  const [farmers, vendors, lots, auctions, pattis, bills, payments] = await Promise.all([
    store.count("farmers"),
    store.count("vendors"),
    store.getAll("lots"),
    store.getAll("auctions"),
    store.getAll("pattis"),
    store.getAll("vendorBills"),
    store.getAll("payments"),
  ]);
  const openLots = lots.filter((l) => l.status === "open").length;
  const today = todayDate();
  const todaySale = money(
    auctions
      .filter((a) => a.date === today)
      .reduce((acc, a) => acc.plus(d(a.saleAmount)), d(0)),
  );
  const farmerOutstanding = money(
    pattis.reduce((acc, p) => acc.plus(d(p.balanceAmount)), d(0)),
  );
  const vendorOutstanding = money(
    bills.reduce((acc, b) => acc.plus(d(b.balanceAmount)), d(0)),
  );
  const collected = money(payments.reduce((acc, p) => acc.plus(d(p.amount)), d(0)));
  return {
    farmers,
    vendors,
    openLots,
    totalLots: lots.length,
    auctions: auctions.length,
    todaySale,
    farmerOutstanding,
    vendorOutstanding,
    collected,
    pattiCount: pattis.length,
    billCount: bills.length,
  };
}

export { weight, getSettings, updateSettings, ensureSettings };
