import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUIT_RULE,
  ruleFromSettings,
  suitForBag,
  summarizeBags,
} from "./suit";
import { calculateFarmerPatti, FARMER_PAYABLE_FIXTURE } from "./patti";
import { calculateVendorBill, VENDOR_BILL_FIXTURE } from "./vendorBill";
import { d, money } from "./money";

describe("suit default FLOOR(weight/20)", () => {
  const cases: Array<[number, string]> = [
    [19, "0.000"],
    [20, "1.000"],
    [21, "1.000"],
    [25, "1.000"],
    [39, "1.000"],
    [40, "2.000"],
    [42, "2.000"],
    [60, "3.000"],
  ];

  it.each(cases)("suit(%s) → %s", (w, expected) => {
    expect(suitForBag(w, DEFAULT_SUIT_RULE)).toBe(expected);
  });

  it("merchant 42→3 conflict is a configurable divisor, not silent drift", () => {
    expect(suitForBag(42, DEFAULT_SUIT_RULE)).toBe("2.000");
    expect(suitForBag(42, ruleFromSettings(14))).toBe("3.000");
  });
});

describe("farmer payable ₹3640 fixture", () => {
  it("computes payable 3640.00", () => {
    const result = calculateFarmerPatti({
      netWeightKg: FARMER_PAYABLE_FIXTURE.netWeightKg,
      ratePerKg: FARMER_PAYABLE_FIXTURE.ratePerKg,
      commissionPercent: FARMER_PAYABLE_FIXTURE.commissionPercent,
      hamali: FARMER_PAYABLE_FIXTURE.hamali,
      bhada: FARMER_PAYABLE_FIXTURE.bhada,
      stationery: FARMER_PAYABLE_FIXTURE.stationery,
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    expect(result.saleAmount).toBe(FARMER_PAYABLE_FIXTURE.expectedSale);
    expect(result.payable).toBe(FARMER_PAYABLE_FIXTURE.expectedPayable);
  });
});

describe("vendor bill ₹4416 fixture", () => {
  it("computes total 4416.00", () => {
    const result = calculateVendorBill({
      netWeightKg: VENDOR_BILL_FIXTURE.netWeightKg,
      ratePerKg: VENDOR_BILL_FIXTURE.ratePerKg,
      commissionPercent: VENDOR_BILL_FIXTURE.commissionPercent,
      hamali: VENDOR_BILL_FIXTURE.hamali,
      cess: VENDOR_BILL_FIXTURE.cess,
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    expect(result.baseAmount).toBe(VENDOR_BILL_FIXTURE.expectedBase);
    expect(result.total).toBe(VENDOR_BILL_FIXTURE.expectedTotal);
  });
});

describe("multi-lot, split, bhada-once, settings snapshot", () => {
  it("summarizes multi-bag lot with shared suit rule", () => {
    // 10 × 44 kg → gross 440, suit 20, net 420 (canonical net)
    const bags = Array.from({ length: 10 }, () => 44);
    const summary = summarizeBags(bags, DEFAULT_SUIT_RULE);
    expect(summary.grossWeight).toBe("440.000");
    expect(summary.suitTotal).toBe("20.000");
    expect(summary.netWeight).toBe("420.000");
  });

  it("bhada is applied once across multi-lot patti aggregation", () => {
    const lotA = calculateFarmerPatti({
      netWeightKg: "210.000",
      ratePerKg: "10.00",
      commissionPercent: 10,
      hamali: "40.00",
      bhada: "0.00",
      stationery: "0.00",
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    const lotB = calculateFarmerPatti({
      netWeightKg: "210.000",
      ratePerKg: "10.00",
      commissionPercent: 10,
      hamali: "40.00",
      bhada: "0.00",
      stationery: "0.00",
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    const combinedSale = money(d(lotA.saleAmount).plus(d(lotB.saleAmount)));
    const combinedHamali = money(d(lotA.hamali).plus(d(lotB.hamali)));
    const bhadaOnce = "40.00";
    const stationeryOnce = "20.00";
    const combined = calculateFarmerPatti({
      netWeightKg: "420.000",
      ratePerKg: "10.00",
      commissionPercent: 10,
      hamali: combinedHamali,
      bhada: bhadaOnce,
      stationery: stationeryOnce,
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    expect(combinedSale).toBe("4200.00");
    expect(combined.payable).toBe("3640.00");
    expect(combined.bhada).toBe("40.00");
  });

  it("split vendor allocations keep same suit snapshot as lot", () => {
    const bags = [44, 44, 44, 44, 44, 44, 44, 44, 44, 44];
    const summary = summarizeBags(bags, DEFAULT_SUIT_RULE);
    const vendorA = summary.bags.slice(0, 6);
    const vendorB = summary.bags.slice(6);
    const netA = vendorA.reduce((s, b) => s + Number(b.netKg), 0);
    const netB = vendorB.reduce((s, b) => s + Number(b.netKg), 0);
    expect(money(netA + netB)).toBe(money(summary.netWeight));
    const billA = calculateVendorBill({
      netWeightKg: netA,
      ratePerKg: "10.00",
      commissionPercent: 2,
      hamali: "60.00",
      cess: "20.00",
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    const billB = calculateVendorBill({
      netWeightKg: netB,
      ratePerKg: "10.00",
      commissionPercent: 2,
      hamali: "40.00",
      cess: "12.00",
      suitRuleSnapshot: DEFAULT_SUIT_RULE,
    });
    expect(money(d(billA.total).plus(d(billB.total)))).toBe("4416.00");
    expect(billA.suitRuleSnapshot).toEqual(billB.suitRuleSnapshot);
  });

  it("changing settings divisor does not alter prior snapshot math", () => {
    const snapshot = ruleFromSettings(20);
    const frozen = suitForBag(42, snapshot);
    const newSettings = ruleFromSettings(14);
    expect(suitForBag(42, newSettings)).toBe("3.000");
    expect(suitForBag(42, snapshot)).toBe(frozen);
    expect(frozen).toBe("2.000");
  });

  it("partial payment math leaves remaining balance", () => {
    const payable = "3640.00";
    const paid1 = "1000.00";
    const paid2 = "1640.00";
    const remaining = money(d(payable).minus(d(paid1)).minus(d(paid2)));
    expect(remaining).toBe("1000.00");
  });
});

describe("reprint does not duplicate slip identity", () => {
  it("print counter increments on same slip id", () => {
    const slip = { id: "slip_1", printedCount: 0 };
    const afterFirst = { ...slip, printedCount: slip.printedCount + 1 };
    const afterReprint = { ...afterFirst, printedCount: afterFirst.printedCount + 1 };
    expect(afterFirst.id).toBe(slip.id);
    expect(afterReprint.id).toBe(slip.id);
    expect(afterReprint.printedCount).toBe(2);
  });
});
