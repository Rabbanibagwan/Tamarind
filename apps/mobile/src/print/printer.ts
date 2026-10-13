import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { encodeText, formatSlipLines } from "./escpos";
import type {
  PrinterCapability,
  PrinterConnectionStatus,
  PrinterDevice,
  PrintJob,
  ThermalPrinter,
} from "./types";

const SELECTED_KEY = "tamarind.printer.selected";

function isExpoGo(): boolean {
  // appOwnership === 'expo' means Expo Go
  return Constants.appOwnership === "expo";
}

function capability(): PrinterCapability {
  const platform =
    Platform.OS === "android"
      ? "android"
      : Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "web"
          ? "web"
          : "unknown";

  const expoGoLimitation = isExpoGo();
  const notes: string[] = [];

  if (expoGoLimitation) {
    notes.push(
      "Expo Go cannot load Bluetooth Classic native modules. Use a development build (npx expo run:android / EAS) for real ESC/POS printing.",
    );
  }

  if (platform === "android") {
    notes.push(
      "Android: ESC/POS over Bluetooth Classic (SPP) is the primary path in a custom/dev client.",
    );
  } else if (platform === "ios") {
    notes.push(
      "iOS: Bluetooth Classic SPP is generally unavailable. BLE or MFi printers only; many cheap mandi printers are Classic-only.",
    );
  }

  return {
    platform,
    classicSupported: platform === "android" && !expoGoLimitation,
    bleSupported: !expoGoLimitation && (platform === "ios" || platform === "android"),
    expoGoLimitation,
    notes,
  };
}

/**
 * Safe printer implementation:
 * - In Expo Go / unsupported environments: mock transport with clear status.
 * - Dev-build hook points documented for wiring react-native-bluetooth-classic.
 * Never creates duplicate billing documents on reprint — print is output-only.
 */
export function createThermalPrinter(): ThermalPrinter {
  let status: PrinterConnectionStatus = "disconnected";
  let selected: PrinterDevice | null = null;
  let lastPrintedDocId: string | null = null;

  const api: ThermalPrinter = {
    getCapability: capability,

    getStatus() {
      const cap = capability();
      if (cap.expoGoLimitation || (!cap.classicSupported && !cap.bleSupported)) {
        if (status === "connected") return status;
        return cap.expoGoLimitation ? "needs_dev_build" : "unsupported";
      }
      return status;
    },

    getSelected() {
      return selected;
    },

    async scan() {
      const cap = capability();
      status = "scanning";
      if (cap.expoGoLimitation || !cap.classicSupported) {
        status = cap.expoGoLimitation ? "needs_dev_build" : "unsupported";
        // Mock devices for UI rehearsal only
        return [
          {
            id: "mock-58mm",
            name: "Mock Thermal 58mm (preview)",
            address: "00:00:00:00:00:01",
            transport: "mock",
          },
        ];
      }
      // Dev-build: integrate Bluetooth Classic discovery here.
      status = "disconnected";
      return [];
    },

    async connect(device) {
      status = "connecting";
      selected = device;
      await AsyncStorage.setItem(SELECTED_KEY, JSON.stringify(device));
      status = "connected";
    },

    async disconnect() {
      selected = null;
      status = "disconnected";
      await AsyncStorage.removeItem(SELECTED_KEY);
    },

    async testPrint() {
      await api.print({
        kind: "test",
        documentId: "test",
        title: "Printer test",
        lines: formatSlipLines({
          merchantName: "Tamarind Mandi",
          title: "TEST PRINT",
          documentId: "test",
          body: ["If you see this, the printer path works."],
        }),
      });
    },

    async print(job: PrintJob) {
      // Reprint safety: same documentId is allowed; we do not persist a new bill/slip.
      lastPrintedDocId = job.documentId;
      const bytes = encodeText(job.lines);
      if (!selected || selected.transport === "mock" || capability().expoGoLimitation) {
        // Preview path: succeed without native BT write
        console.info(
          `[printer] mock print ${job.kind} doc=${job.documentId} bytes=${bytes.length} last=${lastPrintedDocId}`,
        );
        return;
      }
      // Dev-build: write `bytes` to connected Classic SPP socket.
      console.info(`[printer] native print ${job.kind} doc=${job.documentId}`);
    },
  };

  // Restore selection
  void AsyncStorage.getItem(SELECTED_KEY).then((raw) => {
    if (!raw) return;
    try {
      selected = JSON.parse(raw) as PrinterDevice;
      status = "connected";
    } catch {
      /* ignore */
    }
  });

  return api;
}

export { formatSlipLines };
