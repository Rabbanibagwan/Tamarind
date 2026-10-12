import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, updateSettings } from "./database";
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
import { suitForBag } from "../domain/suit";

async function resetDb() {
  await db.delete();
  await db.open();
}

describe("persisted workflow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("canonical lot → auction → patti 3640 + vendor bill 4416", async () => {
    const farmer = await upsertParty("farmers", { name: "Ramesh" });
    const vendor = await upsertParty("vendors", { name: "Kiran Traders" });

    // 10 × 44 kg → net 420 with default suit
    const bags = Array.from({ length: 10 }, () => 44);
    const { lot, slip } = await createLot({ farmerId: farmer.id, bagWeights: bags });
    expect(lot.netWeight).toBe("420.000");
    expect(lot.suitRuleSnapshot.divisor).toBe(20);

    const auction = await createAuction({
      lotId: lot.id,
      ratePerKg: "10",
      allocations: [
        { vendorId: vendor.id, bagIndices: lot.bags.map((b) => b.index) },
      ],
    });
    expect(auction.saleAmount).toBe("4200.00");

    const patti = await createFarmerPatti({
      farmerId: farmer.id,
      auctionIds: [auction.id],
      hamali: "80",
      bhada: "40",
      stationery: "20",
    });
    expect(patti.payable).toBe("3640.00");
    expect(patti.bhada).toBe("40.00");

    const bill = await createVendorBill({
      vendorId: vendor.id,
      allocationRefs: [
        { auctionId: auction.id, allocationId: auction.allocations[0].id },
      ],
      hamali: "100",
      cess: "32",
    });
    expect(bill.total).toBe("4416.00");

    // reprint does not duplicate slip
    const before = await getSlipForLot(lot.id);
    expect(before?.id).toBe(slip.id);
    await recordSlipPrint(slip.id);
    await recordSlipPrint(slip.id);
    const after = await getSlipForLot(lot.id);
    expect(after?.id).toBe(slip.id);
    expect(after?.printedCount).toBe(2);
    const slipCount = await db.slips.where("lotId").equals(lot.id).count();
    expect(slipCount).toBe(1);

    // partial payments
    await recordPayment({
      partyType: "farmer",
      docType: "patti",
      docId: patti.id,
      amount: "1000",
    });
    await recordPayment({
      partyType: "farmer",
      docType: "patti",
      docId: patti.id,
      amount: "1640",
    });
    const patti2 = await db.pattis.get(patti.id);
    expect(patti2?.balanceAmount).toBe("1000.00");

    // settings change does not alter finalized suit snapshot / amounts
    await updateSettings({ suitDivisor: 14 });
    expect(suitForBag(42, patti.suitRuleSnapshot)).toBe("2.000");
    const still = await db.pattis.get(patti.id);
    expect(still?.payable).toBe("3640.00");
    expect(still?.suitRuleSnapshot.divisor).toBe(20);
  });

  it("multi-lot patti applies bhada once; split vendors", async () => {
    const farmer = await upsertParty("farmers", { name: "Sita" });
    const v1 = await upsertParty("vendors", { name: "V1" });
    const v2 = await upsertParty("vendors", { name: "V2" });

    const lot1 = await createLot({
      farmerId: farmer.id,
      bagWeights: Array.from({ length: 5 }, () => 44),
    });
    const lot2 = await createLot({
      farmerId: farmer.id,
      bagWeights: Array.from({ length: 5 }, () => 44),
    });

    const a1 = await createAuction({
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
    const a2 = await createAuction({
      lotId: lot2.lot.id,
      ratePerKg: 10,
      allocations: [
        { vendorId: v1.id, bagIndices: lot2.lot.bags.map((b) => b.index) },
      ],
    });

    const patti = await createFarmerPatti({
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
