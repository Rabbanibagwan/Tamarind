import { money } from "./domain/money";
import type { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  merchantName: "Tamarind Mandi",
  merchantAddress: "",
  merchantPhone: "",
  suitDivisor: 20,
  farmerCommissionPercent: 10,
  vendorCommissionPercent: 2,
  defaultHamaliPerBag: money(8),
  defaultBhada: money(40),
  defaultStationery: money(20),
  defaultVendorHamaliPerBag: money(10),
  defaultCessPercent: 0,
  printWidthMm: 80,
  nextLotNumber: 1,
  nextSlipNumber: 1,
  nextPattiNumber: 1,
  nextVendorBillNumber: 1,
};
