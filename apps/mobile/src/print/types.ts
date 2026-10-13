export type PrinterConnectionStatus =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "unsupported"
  | "needs_dev_build";

export type PrinterDevice = {
  id: string;
  name: string;
  address: string;
  transport: "bluetooth_classic" | "bluetooth_le" | "mock";
};

export type PrintJobKind = "weight_slip" | "patti" | "vendor_bill" | "test";

export type PrintJob = {
  kind: PrintJobKind;
  /** Stable document id — reprints must not create new billing rows. */
  documentId: string;
  title: string;
  lines: string[];
};

export type PrinterCapability = {
  platform: "android" | "ios" | "web" | "unknown";
  classicSupported: boolean;
  bleSupported: boolean;
  expoGoLimitation: boolean;
  notes: string[];
};

/**
 * Platform printer port. Implementations must never duplicate billing docs on reprint.
 */
export interface ThermalPrinter {
  getCapability(): PrinterCapability;
  getStatus(): PrinterConnectionStatus;
  getSelected(): PrinterDevice | null;
  scan(): Promise<PrinterDevice[]>;
  connect(device: PrinterDevice): Promise<void>;
  disconnect(): Promise<void>;
  testPrint(): Promise<void>;
  print(job: PrintJob): Promise<void>;
}
