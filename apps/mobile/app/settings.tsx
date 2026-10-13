import { useEffect, useState } from "react";
import { Text } from "react-native";
import { getSettings, updateSettings, type AppSettings } from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function SettingsScreen() {
  const { store, ready, bump } = useAppStore();
  const [s, setS] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void getSettings(store).then(setS);
  }, [store, ready]);

  if (!ready || !s) return <Loading />;

  return (
    <Screen title="Settings" subtitle="Suit + charges · never rewrites finalized docs">
      <Panel>
        <Field
          label="Merchant name"
          value={s.merchantName}
          onChangeText={(t) => setS({ ...s, merchantName: t })}
        />
        <Field
          label="Suit divisor (default 20 → FLOOR(w/20))"
          value={String(s.suitDivisor)}
          onChangeText={(t) => setS({ ...s, suitDivisor: Number(t) || 20 })}
          keyboardType="number-pad"
        />
        <Field
          label="Farmer commission %"
          value={String(s.farmerCommissionPercent)}
          onChangeText={(t) => setS({ ...s, farmerCommissionPercent: Number(t) || 0 })}
          keyboardType="decimal-pad"
        />
        <Field
          label="Vendor commission %"
          value={String(s.vendorCommissionPercent)}
          onChangeText={(t) => setS({ ...s, vendorCommissionPercent: Number(t) || 0 })}
          keyboardType="decimal-pad"
        />
        <Field
          label="Default bhada"
          value={s.defaultBhada}
          onChangeText={(t) => setS({ ...s, defaultBhada: t })}
          keyboardType="decimal-pad"
        />
        <Field
          label="Default stationery"
          value={s.defaultStationery}
          onChangeText={(t) => setS({ ...s, defaultStationery: t })}
          keyboardType="decimal-pad"
        />
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Changing suit divisor only affects new lots. Finalized auctions/pattis/bills keep their
          snapshotted rule.
        </Text>
        {error ? <ErrorText message={error} /> : null}
        {saved ? <Text style={{ color: colors.brand }}>Saved.</Text> : null}
        <Btn
          label="Save settings"
          onPress={async () => {
            try {
              setError(null);
              const next = await updateSettings(store, {
                merchantName: s.merchantName,
                suitDivisor: s.suitDivisor,
                farmerCommissionPercent: s.farmerCommissionPercent,
                vendorCommissionPercent: s.vendorCommissionPercent,
                defaultBhada: s.defaultBhada,
                defaultStationery: s.defaultStationery,
              });
              setS(next);
              setSaved(true);
              bump();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
    </Screen>
  );
}
