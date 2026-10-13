import { beforeEach, describe, expect, it } from "vitest";
import { updateSettings } from "./backup";
import {
  createAuction,
  createFarmerPatti,
  createLot,
  createVendorBill,
  getSlipForLot,
  recordPayment,
  recordSlipPrint,
  upsertParty,
} from "./services";
import { createMemoryStore } from "./store/memory";
import type { DataStore } from "./store/types";
import { suitForBag } from "./domain/suit";

describe("persisted workflow (memory store)", () => {
  let store: DataStore;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("canonical lot → auction → patti 3640 + vendor bill 4416", async () => {
    const farmer = await upsertParty(store, "farmers", { name: "Ramesh" });
    const vendor = await upsertParty(store, "vendors", { name: "Kiran Traders" });

    const bags = Array.from({ length: 10 }, () => 44);
    const { lot, slip } = await createLot(store, { farmerId: farmer.id, bagWeights: bags });
    expect(lot.netWeight).toBe("420.000");
    expect(lot.suitRuleSnapshot.divisor).toBe(20);

    const auction = await createAuction(store, {
      lotId: lot.id,
      ratePerKg: "10",
      allocations: [{ vendorId: vendor.id, bagIndices: lot.bags.map((b) => b.index) }],
    });
    expect(auction.saleAmount).toBe("4200.00");

    const patti = await createFarmerPatti(store, {
      farmerId: farmer.id,
      auctionIds: [auction.id],
      hamali: "80",
      bhada: "40",
      stationery: "20",
    });
    expect(patti.payable).toBe("3640.00");
    expect(patti.bhada).toBe("40.00");

    const bill = await createVendorBill(store, {
      vendorId: vendor.id,
      allocationRefs: [
        { auctionId: auction.id, allocationId: auction.allocations[0].id },
      ],
      hamali: "100",
      cess: "32",
    });
    expect(bill.total).toBe("4416.00");

    const before = await getSlipForLot(store, lot.id);
    expect(before?.id).toBe(slip.id);
    await recordSlipPrint(store, slip.id);
    await recordSlipPrint(store, slip.id);
    const after = await getSlipForLot(store, lot.id);
    expect(after?.id).toBe(slip.id);
    expect(after?.printedCount).toBe(2);
    const slips = await store.whereEquals("slips", "lotId", lot.id);
    expect(slips).toHaveLength(1);

    await recordPayment(store, {
      partyType: "farmer",
      docType: "patti",
      docId: patti.id,
      amount: "1000",
    });
    await recordPayment(store, {
      partyType: "farmer",
      docType: "patti",
      docId: patti.id,
      amount: "1640",
    });
    const patti2 = await store.get("pattis", patti.id);
    expect(patti2?.balanceAmount).toBe("1000.00");

    await updateSettings(store, { suitDivisor: 14 });
    expect(suitForBag(42, patti.suitRuleSnapshot)).toBe("2.000");
    const still = await store.get("pattis", patti.id);
    expect(still?.payable).toBe("3640.00");
    expect(still?.suitRuleSnapshot.divisor).toBe(20);
  });

  it("multi-lot patti applies bhada once; split vendors", async () => {
    const farmer = await upsertParty(store, "farmers", { name: "Sita" });
    const v1 = await upsertParty(store, "vendors", { name: "V1" });
    const v2 = await upsertParty(store, "vendors", { name: "V2" });

    const lot1 = await createLot(store, {
      farmerId: farmer.id,
      bagWeights: Array.from({ length: 5 }, () => 44),
    });
    const lot2 = await createLot(store, {
      farmerId: farmer.id,
      bagWeights: Array.from({ length: 5 }, () => 44),
    });

    const a1 = await createAuction(store, {
      lotId: lot1.lot.id,
      ratePerKg: 10,
      allocations: [
        {
          vendorId: v1.id,
          bagIndices: lot1.lot.bags.slice(0, 3).map((b) => b.index),
        },
        {
          vendorId: v2.id,
          bagIndices: lot1.lot.bags.slice(3).map((b) => b.index),
        },
      ],
    });
    const a2 = await createAuction(store, {
      lotId: lot2.lot.id,
      ratePerKg: 10,
      allocations: [
        { vendorId: v1.id, bagIndices: lot2.lot.bags.map((b) => b.index) },
      ],
    });

    const patti = await createFarmerPatti(store, {
      farmerId: farmer.id,
      auctionIds: [a1.id, a2.id],
      hamali: "80",
      bhada: "40",
      stationery: "20",
    });
    expect(patti.lines).toHaveLength(2);
    expect(patti.bhada).toBe("40.00");
    expect(patti.payable).toBe("3640.00");
  });
});
