import { d, money, mul, pctOf, type Money, type Weight } from "./money";
import type { SuitRuleSnapshot } from "./suit";

export type VendorBillInput = {
  netWeightKg: Weight | string | number;
  ratePerKg: Money | string | number;
  commissionPercent: number;
  hamali: Money | string | number;
  cess: Money | string | number;
  suitRuleSnapshot: SuitRuleSnapshot;
};

export type VendorBillResult = {
  baseAmount: Money;
  commissionAmount: Money;
  hamali: Money;
  cess: Money;
  total: Money;
  suitRuleSnapshot: SuitRuleSnapshot;
};

/**
 * Vendor Bill:
 * base = allocated net × rate
 * commission = base × commission% (default 2% add-on)
 * total = base + commission + hamali + cess
 */
export function calculateVendorBill(input: VendorBillInput): VendorBillResult {
  const baseAmount = mul(input.netWeightKg, input.ratePerKg);
  const commissionAmount = pctOf(baseAmount, input.commissionPercent);
  const hamali = money(input.hamali);
  const cess = money(input.cess);
  const total = money(
    d(baseAmount).plus(d(commissionAmount)).plus(d(hamali)).plus(d(cess)),
  );
  return {
    baseAmount,
    commissionAmount,
    hamali,
    cess,
    total,
    suitRuleSnapshot: input.suitRuleSnapshot,
  };
}

/** Canonical fixture: base ₹4200 → vendor bill ₹4416 */
export const VENDOR_BILL_FIXTURE = {
  netWeightKg: "420.000",
  ratePerKg: "10.00",
  commissionPercent: 2,
  hamali: "100.00",
  cess: "32.00",
  expectedTotal: "4416.00",
  expectedBase: "4200.00",
} as const;
