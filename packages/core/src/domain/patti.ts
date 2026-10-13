import { d, money, mul, pctOf, sub, type Money, type Weight } from "./money";
import type { SuitRuleSnapshot } from "./suit";

export type FarmerPattiInput = {
  netWeightKg: Weight | string | number;
  ratePerKg: Money | string | number;
  commissionPercent: number;
  hamali: Money | string | number;
  bhada: Money | string | number;
  stationery: Money | string | number;
  /** Suit rule that was in force when the underlying lots were recorded. */
  suitRuleSnapshot: SuitRuleSnapshot;
};

export type FarmerPattiResult = {
  saleAmount: Money;
  commissionAmount: Money;
  hamali: Money;
  bhada: Money;
  stationery: Money;
  deductionsTotal: Money;
  payable: Money;
  suitRuleSnapshot: SuitRuleSnapshot;
};

/**
 * Farmer Patti (पट्टी):
 * sale = net × rate
 * commission = sale × commission% (default 10%)
 * payable = sale − commission − hamali − bhada − stationery
 * Bhada is applied once by the caller (aggregate across lots before calling).
 */
export function calculateFarmerPatti(input: FarmerPattiInput): FarmerPattiResult {
  const saleAmount = mul(input.netWeightKg, input.ratePerKg);
  const commissionAmount = pctOf(saleAmount, input.commissionPercent);
  const hamali = money(input.hamali);
  const bhada = money(input.bhada);
  const stationery = money(input.stationery);
  const deductionsTotal = money(
    d(commissionAmount).plus(d(hamali)).plus(d(bhada)).plus(d(stationery)),
  );
  const payable = sub(saleAmount, deductionsTotal);
  return {
    saleAmount,
    commissionAmount,
    hamali,
    bhada,
    stationery,
    deductionsTotal,
    payable,
    suitRuleSnapshot: input.suitRuleSnapshot,
  };
}

/** Canonical fixture: net 420 kg @ ₹10 → payable ₹3640 */
export const FARMER_PAYABLE_FIXTURE = {
  netWeightKg: "420.000",
  ratePerKg: "10.00",
  commissionPercent: 10,
  hamali: "80.00",
  bhada: "40.00",
  stationery: "20.00",
  expectedPayable: "3640.00",
  expectedSale: "4200.00",
} as const;
