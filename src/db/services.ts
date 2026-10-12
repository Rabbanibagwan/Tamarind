import { createId } from "../domain/ids";
import { d, money, mul, pctOf, sub, sumWeights, weight } from "../domain/money";
import { calculateFarmerPatti } from "../domain/patti";
import { ruleFromSettings, summarizeBags } from "../domain/suit";
import { calculateVendorBill } from "../domain/vendorBill";
import { db, ensureSettings, getSettings, updateSettings } from "./database";
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
    const existing = await db[table].get(input.id);
    if (existing) party.createdAt = existing.createdAt;
  }
  await db[table].put(party);
  return party;
}

export async function listParties(table: "farmers" | "vendors"): Promise<Party[]> {
  return db[table].orderBy("name").toArray();
}

export async function deleteParty(table: "farmers" | "vendors", id: string): Promise<void> {
  await db[table].delete(id);
}

/* ---------- Lots / Action Diary ---------- */

export async function createLot(input: {
  farmerId: string;
  date?: string;
  commodity?: string;
  bagWeights: number[];
}): Promise<{ lot: Lot; slip: WeightSlip }> {
  const settings = await getSettings();
  const farmer = await db.farmers.get(input.farmerId);
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

  await db.transaction("rw", db.lots, db.slips, db.settings, async () => {
    await db.lots.put(lot);
    await db.slips.put(slip);
    await updateSettings({
      nextLotNumber: lotNumber + 1,
      nextSlipNumber: slipNumber + 1,
    });
  });

  return { lot, slip };
}

export async function listLots(): Promise<Lot[]> {
  const lots = await db.lots.toArray();
  return lots.sort((a, b) => b.lotNumber - a.lotNumber);
}

export async function getLot(id: string): Promise<Lot | undefined> {
  return db.lots.get(id);
}

export async function getSlipForLot(lotId: string): Promise<WeightSlip | undefined> {
  return db.slips.where("lotId").equals(lotId).first();
}

/** Reprint only increments print counter — never duplicates the slip row. */
export async function recordSlipPrint(slipId: string): Promise<WeightSlip> {
  const slip = await db.slips.get(slipId);
  if (!slip) throw new Error("Slip not found");
  const next: WeightSlip = {
    ...slip,
    printedCount: slip.printedCount + 1,
    lastPrintedAt: nowIso(),
  };
  await db.slips.put(next);
  return next;
}

/* ---------- Auction ---------- */

export async function createAuction(input: {
  lotId: string;
  ratePerKg: number | string;
  allocations: Array<{ vendorId: string; bagIndices: number[] }>;
}): Promise<Auction> {
  const lot = await db.lots.get(input.lotId);
  if (!lot) throw new Error("Lot not found");
  if (lot.status !== "open") throw new Error("Lot already auctioned");
  if (!input.allocations.length) throw new Error("Add at least one vendor allocation");

  const used = new Set<number>();
  const allocations: AuctionAllocation[] = [];

  for (const alloc of input.allocations) {
    const vendor = await db.vendors.get(alloc.vendorId);
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

  await db.transaction("rw", db.auctions, db.lots, async () => {
    await db.auctions.put(auction);
    await db.lots.update(lot.id, {
      status: "auctioned",
      auctionId: auction.id,
      updatedAt: ts,
    });
  });

  return auction;
}

export async function listAuctions(): Promise<Auction[]> {
  const rows = await db.auctions.toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOpenLots(): Promise<Lot[]> {
  return (await db.lots.where("status").equals("open").toArray()).sort(
    (a, b) => b.lotNumber - a.lotNumber,
  );
}

/* ---------- Farmer Patti ---------- */

export async function createFarmerPatti(input: {
  farmerId: string;
  auctionIds: string[];
  hamali?: number | string;
  bhada?: number | string;
  stationery?: number | string;
  commissionPercent?: number;
}): Promise<FarmerPattiDoc> {
  const settings = await getSettings();
  const farmer = await db.farmers.get(input.farmerId);
  if (!farmer) throw new Error("Farmer not found");
  if (!input.auctionIds.length) throw new Error("Select auctions");

  const auctions: Auction[] = [];
  for (const id of input.auctionIds) {
    const a = await db.auctions.get(id);
    if (!a) throw new Error("Auction not found");
    if (a.farmerId !== farmer.id) throw new Error("Auction belongs to another farmer");
    const existing = await db.pattis
      .filter((p) => p.lines.some((l) => l.auctionId === id))
      .first();
    if (existing) throw new Error(`Auction lot #${a.lotNumber} already on a patti`);
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
  // Bhada once per patti (not per lot)
  const bhada = money(input.bhada ?? settings.defaultBhada);
  const stationery = money(input.stationery ?? settings.defaultStationery);
  const commissionPercent = input.commissionPercent ?? settings.farmerCommissionPercent;

  // Weighted average rate for display calc via aggregate
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

  // Prefer summing line sales for saleAmount fidelity
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

  await db.transaction("rw", db.pattis, db.lots, db.settings, db.ledger, async () => {
    await db.pattis.put(doc);
    for (const line of lines) {
      await db.lots.update(line.lotId, { status: "settled", updatedAt: ts });
    }
    await updateSettings({ nextPattiNumber: pattiNumber + 1 });
    await db.ledger.put(ledger);
  });

  void calc;
  return doc;
}

export async function listPattis(): Promise<FarmerPattiDoc[]> {
  return (await db.pattis.toArray()).sort((a, b) => b.pattiNumber - a.pattiNumber);
}

export async function unsettledAuctionsForFarmer(farmerId: string): Promise<Auction[]> {
  const auctions = await db.auctions.where("farmerId").equals(farmerId).toArray();
  const result: Auction[] = [];
  for (const a of auctions) {
    const onPatti = await db.pattis
      .filter((p) => p.lines.some((l) => l.auctionId === a.id))
      .first();
    if (!onPatti) result.push(a);
  }
  return result.sort((a, b) => b.lotNumber - a.lotNumber);
}

/* ---------- Vendor Bills ---------- */

export async function createVendorBill(input: {
  vendorId: string;
  allocationRefs: Array<{ auctionId: string; allocationId: string }>;
  hamali?: number | string;
  cess?: number | string;
  commissionPercent?: number;
}): Promise<VendorBillDoc> {
  const settings = await getSettings();
  const vendor = await db.vendors.get(input.vendorId);
  if (!vendor) throw new Error("Vendor not found");
  if (!input.allocationRefs.length) throw new Error("Select allocations");

  const lines: VendorBillDoc["lines"] = [];
  let suitRuleSnapshot = ruleFromSettings(settings.suitDivisor);

  for (const ref of input.allocationRefs) {
    const auction = await db.auctions.get(ref.auctionId);
    if (!auction) throw new Error("Auction not found");
    const alloc = auction.allocations.find((a) => a.id === ref.allocationId);
    if (!alloc) throw new Error("Allocation not found");
    if (alloc.vendorId !== vendor.id) throw new Error("Allocation belongs to another vendor");
    const existing = await db.vendorBills
      .filter((b) => b.lines.some((l) => l.allocationId === ref.allocationId))
      .first();
    if (existing) throw new Error(`Allocation already billed (lot #${auction.lotNumber})`);

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

  await db.transaction("rw", db.vendorBills, db.settings, db.ledger, async () => {
    await db.vendorBills.put(doc);
    await updateSettings({ nextVendorBillNumber: billNumber + 1 });
    await db.ledger.put(ledger);
  });

  void calc;
  return doc;
}

export async function listVendorBills(): Promise<VendorBillDoc[]> {
  return (await db.vendorBills.toArray()).sort((a, b) => b.billNumber - a.billNumber);
}

export async function unbilledAllocationsForVendor(vendorId: string): Promise<
  Array<{
    auction: Auction;
    allocation: AuctionAllocation;
  }>
> {
  const auctions = await db.auctions.toArray();
  const result: Array<{ auction: Auction; allocation: AuctionAllocation }> = [];
  for (const auction of auctions) {
    for (const allocation of auction.allocations) {
      if (allocation.vendorId !== vendorId) continue;
      const billed = await db.vendorBills
        .filter((b) => b.lines.some((l) => l.allocationId === allocation.id))
        .first();
      if (!billed) result.push({ auction, allocation });
    }
  }
  return result.sort((a, b) => b.auction.lotNumber - a.auction.lotNumber);
}

/* ---------- Payments ---------- */

export async function recordPayment(input: {
  partyType: "farmer" | "vendor";
  docType: "patti" | "vendor_bill";
  docId: string;
  amount: number | string;
  mode?: Payment["mode"];
  note?: string;
  date?: string;
}): Promise<Payment> {
  const amount = money(input.amount);
  if (d(amount).lte(0)) throw new Error("Amount must be positive");

  const ts = nowIso();
  let partyId = "";
  let partyName = "";
  let docNumber = 0;

  if (input.docType === "patti") {
    const doc = await db.pattis.get(input.docId);
    if (!doc) throw new Error("Patti not found");
    const nextPaid = money(d(doc.paidAmount).plus(d(amount)));
    if (d(nextPaid).gt(d(doc.payable))) throw new Error("Payment exceeds payable balance");
    partyId = doc.farmerId;
    partyName = doc.farmerName;
    docNumber = doc.pattiNumber;
    await db.pattis.update(doc.id, {
      paidAmount: nextPaid,
      balanceAmount: sub(doc.payable, nextPaid),
    });
  } else {
    const doc = await db.vendorBills.get(input.docId);
    if (!doc) throw new Error("Vendor bill not found");
    const nextPaid = money(d(doc.paidAmount).plus(d(amount)));
    if (d(nextPaid).gt(d(doc.total))) throw new Error("Payment exceeds bill balance");
    partyId = doc.vendorId;
    partyName = doc.vendorName;
    docNumber = doc.billNumber;
    await db.vendorBills.update(doc.id, {
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

  await db.payments.put(payment);
  await db.ledger.put(ledger);
  return payment;
}

export async function listPayments(): Promise<Payment[]> {
  return (await db.payments.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function ledgerForParty(
  partyType: "farmer" | "vendor",
  partyId: string,
): Promise<LedgerEntry[]> {
  return (await db.ledger.where("partyId").equals(partyId).toArray())
    .filter((e) => e.partyType === partyType)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ---------- Dashboard ---------- */

export async function dashboardStats() {
  await ensureSettings();
  const [farmers, vendors, lots, auctions, pattis, bills, payments] = await Promise.all([
    db.farmers.count(),
    db.vendors.count(),
    db.lots.toArray(),
    db.auctions.toArray(),
    db.pattis.toArray(),
    db.vendorBills.toArray(),
    db.payments.toArray(),
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

export { weight };
