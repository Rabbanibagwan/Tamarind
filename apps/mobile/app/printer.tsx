import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useAppStore } from "../src/state/StoreContext";
import type { PrinterDevice } from "../src/print/types";
import { Btn, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function PrinterScreen() {
  const { printer, ready } = useAppStore();
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [status, setStatus] = useState(printer.getStatus());
  const [selected, setSelected] = useState(printer.getSelected());
  const cap = printer.getCapability();

  useEffect(() => {
    setStatus(printer.getStatus());
    setSelected(printer.getSelected());
  }, [printer]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Thermal Printer" subtitle="ESC/POS · select / status / test / reprint">
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Status: {status}</Text>
        <Text style={{ color: colors.muted }}>
          Platform: {cap.platform} · Classic: {cap.classicSupported ? "yes" : "no"} · BLE:{" "}
          {cap.bleSupported ? "yes" : "no"}
        </Text>
        {cap.notes.map((n) => (
          <Text key={n} style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
            {n}
          </Text>
        ))}
        <Btn
          label="Scan printers"
          onPress={async () => {
            const found = await printer.scan();
            setDevices(found);
            setStatus(printer.getStatus());
          }}
        />
        {devices.map((d) => (
          <Row
            key={d.id}
            title={d.name}
            meta={`${d.address} · ${d.transport}${selected?.id === d.id ? " · selected" : ""}`}
            onPress={async () => {
              await printer.connect(d);
              setSelected(printer.getSelected());
              setStatus(printer.getStatus());
            }}
          />
        ))}
        <Btn
          label="Test print"
          variant="secondary"
          onPress={async () => {
            await printer.testPrint();
            setStatus(printer.getStatus());
          }}
        />
        <Btn
          label="Disconnect"
          variant="danger"
          onPress={async () => {
            await printer.disconnect();
            setSelected(null);
            setStatus(printer.getStatus());
          }}
        />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
          Reprints always reuse the same document id (slip / patti / bill). No duplicate bills are
          created by printing.
        </Text>
      </Panel>
    </Screen>
  );
}
