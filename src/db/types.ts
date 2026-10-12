import type { SuitRuleSnapshot } from "../domain/suit";
import type { Money, Weight } from "../domain/money";

export type Party = {
  id: string;
  name: string;
  phone?: string;
  village?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  id: "settings";
  merchantName: string;
  merchantAddress: string;
  merchantPhone: string;
  suitDivisor: number;
  farmerCommissionPercent: number;
  vendorCommissionPercent: number;
  defaultHamaliPerBag: Money;
  defaultBhada: Money;
  defaultStationery: Money;
  defaultVendorHamaliPerBag: Money;
  defaultCessPercent: number;
  printWidthMm: 80 | 58;
  nextLotNumber: number;
  nextSlipNumber: number;
  nextPattiNumber: number;
  nextVendorBillNumber: number;
};

export type LotBag = {
  index: number;
  weightKg: Weight;
  suitKg: Weight;
  netKg: Weight;
};

export type Lot = {
  id: string;
  lotNumber: number;
  date: string;
  farmerId: string;
  farmerName: string;
  commodity: string;
  bags: LotBag[];
  bagCount: number;
  grossWeight: Weight;
  suitTotal: Weight;
  netWeight: Weight;
  suitRuleSnapshot: SuitRuleSnapshot;
  status: "open" | "auctioned" | "settled";
  slipId?: string;
  auctionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type WeightSlip = {
  id: string;
  slipNumber: number;
  lotId: string;
  printedCount: number;
  lastPrintedAt?: string;
  createdAt: string;
};

export type AuctionAllocation = {
  id: string;
  vendorId: string;
  vendorName: string;
  bagIndices: number[];
  bagCount: number;
  grossWeight: Weight;
  suitTotal: Weight;
  netWeight: Weight;
};

export type Auction = {
  id: string;
  lotId: string;
  lotNumber: number;
  date: string;
  farmerId: string;
  farmerName: string;
  ratePerKg: Money;
  bagCount: number;
  netWeight: Weight;
  saleAmount: Money;
  suitRuleSnapshot: SuitRuleSnapshot;
  allocations: AuctionAllocation[];
  finalized: true;
  createdAt: string;
};

export type PattiLine = {
  lotId: string;
  lotNumber: number;
  auctionId: string;
  netWeight: Weight;
  ratePerKg: Money;
  saleAmount: Money;
  bagCount: number;
};

export type FarmerPattiDoc = {
  id: string;
  pattiNumber: number;
  date: string;
  farmerId: string;
  farmerName: string;
  lines: PattiLine[];
  netWeight: Weight;
  saleAmount: Money;
  commissionPercent: number;
  commissionAmount: Money;
  hamali: Money;
  bhada: Money;
  stationery: Money;
  deductionsTotal: Money;
  payable: Money;
  paidAmount: Money;
  balanceAmount: Money;
  suitRuleSnapshot: SuitRuleSnapshot;
  finalized: true;
  createdAt: string;
};

export type VendorBillLine = {
  lotId: string;
  lotNumber: number;
  auctionId: string;
  allocationId: string;
  netWeight: Weight;
  ratePerKg: Money;
  baseAmount: Money;
  bagCount: number;
};

export type VendorBillDoc = {
  id: string;
  billNumber: number;
  date: string;
  vendorId: string;
  vendorName: string;
  lines: VendorBillLine[];
  netWeight: Weight;
  baseAmount: Money;
  commissionPercent: number;
  commissionAmount: Money;
  hamali: Money;
  cess: Money;
  total: Money;
  paidAmount: Money;
  balanceAmount: Money;
  suitRuleSnapshot: SuitRuleSnapshot;
  finalized: true;
  createdAt: string;
};

export type Payment = {
  id: string;
  date: string;
  partyType: "farmer" | "vendor";
  partyId: string;
  partyName: string;
  docType: "patti" | "vendor_bill";
  docId: string;
  docNumber: number;
  amount: Money;
  mode: "cash" | "upi" | "bank" | "other";
  note?: string;
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  date: string;
  partyType: "farmer" | "vendor";
  partyId: string;
  partyName: string;
  kind: "patti_payable" | "vendor_bill" | "payment";
  refType: string;
  refId: string;
  refNumber: number;
  debit: Money;
  credit: Money;
  note: string;
  createdAt: string;
};
