import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  formatKg,
  getLot,
  getSettings,
  getSlipForLot,
  recordSlipPrint,
  type Lot,
  type WeightSlip,
} from "@tamarind/core";
import { useAppStore } from "../../src/state/StoreContext";
import { Btn, ErrorText, Loading, Panel, Screen } from "../../src/ui/primitives";
import { colors } from "../../src/theme";
import { formatSlipLines } from "../../src/print/printer";

export default function SlipScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { store, printer, ready, bump } = useAppStore();
  const [lot, setLot] = useState<Lot | null>(null);
  const [slip, setSlip] = useState<WeightSlip | null>(null);
  const [merchant, setMerchant] = useState("Tamarind Mandi");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !lotId) return;
    void (async () => {
      const [l, s, settings] = await Promise.all([
        getLot(store, lotId),
        getSlipForLot(store, lotId),
        getSettings(store),
      ]);
      setLot(l ?? null);
      setSlip(s ?? null);
      setMerchant(settings.merchantName);
    })();
  }, [store, ready, lotId]);

  if (!ready || !lot || !slip) return <Loading />;

  async function print(reprint: boolean) {
    try {
      setError(null);
      await printer.print({
        kind: "weight_slip",
        documentId: slip!.id,
        title: `Slip #${slip!.slipNumber}`,
        lines: formatSlipLines({
          merchantName: merchant,
          title: `WEIGHT SLIP #${slip!.slipNumber}`,
          documentId: slip!.id,
          reprint,
          body: [
            `Lot #${lot!.lotNumber}`,
            lot!.farmerName,
            `Bags ${lot!.bagCount}`,
            `Gross ${lot!.grossWeight}`,
            `Suit ${lot!.suitTotal} (÷${lot!.suitRuleSnapshot.divisor})`,
            `Net ${lot!.netWeight}`,
            ...lot!.bags.map(
              (b) => `B${b.index + 1} ${b.weightKg} suit ${b.suitKg} net ${b.netKg}`,
            ),
          ],
        }),
      });
      const next = await recordSlipPrint(store, slip!.id);
      setSlip(next);
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen title={`Slip #${slip.slipNumber}`} subtitle={`Lot #${lot.lotNumber} · same id on reprint`}>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>{lot.farmerName}</Text>
        <Text style={{ color: colors.muted }}>
          {lot.bagCount} bags · gross {formatKg(lot.grossWeight)} · suit {formatKg(lot.suitTotal)} ·
          net {formatKg(lot.netWeight)}
        </Text>
        <Text style={{ color: colors.muted }}>
          Suit snapshot ÷{lot.suitRuleSnapshot.divisor} · printed {slip.printedCount}×
        </Text>
        {lot.bags.map((b) => (
          <Text key={b.index} style={{ color: colors.ink }}>
            Bag {b.index + 1}: {b.weightKg} → suit {b.suitKg} → net {b.netKg}
          </Text>
        ))}
        {error ? <ErrorText message={error} /> : null}
        <Btn label="Print / reprint slip" onPress={() => print(slip.printedCount > 0)} />
      </Panel>
    </Screen>
  );
}
