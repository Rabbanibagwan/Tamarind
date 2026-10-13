import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  createLot,
  formatKg,
  listLots,
  listParties,
  type Lot,
  type Party,
} from "@tamarind/core";
import { useAppStore } from "../../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../../src/ui/primitives";
import { colors } from "../../src/theme";

export default function DiaryScreen() {
  const { store, ready, bump, refreshKey } = useAppStore();
  const [farmers, setFarmers] = useState<Party[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [farmerId, setFarmerId] = useState("");
  const [bagCount, setBagCount] = useState("10");
  const [weights, setWeights] = useState<string[]>(Array(10).fill("44"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void Promise.all([listParties(store, "farmers"), listLots(store)]).then(([f, l]) => {
      setFarmers(f);
      setLots(l);
      if (!farmerId && f[0]) setFarmerId(f[0].id);
    });
  }, [store, ready, refreshKey, farmerId]);

  useEffect(() => {
    const n = Math.max(1, Math.min(50, Number(bagCount) || 1));
    setWeights((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("");
      return next.slice(0, n);
    });
  }, [bagCount]);

  if (!ready) return <Loading />;

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const bagWeights = weights.map((w) => Number(w)).filter((n) => Number.isFinite(n) && n > 0);
      if (!farmerId) throw new Error("Select a farmer");
      if (bagWeights.length !== weights.length) throw new Error("Enter a weight for every bag");
      const { lot } = await createLot(store, { farmerId, bagWeights });
      bump();
      router.push(`/slip/${lot.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Action Diary"
      subtitle="Lot serial ≠ bag count · N weights for N bags"
    >
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>New lot</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Suit uses current Settings divisor and is snapshotted on the lot.
        </Text>
        <Field
          label="Farmer id (pick from list below)"
          value={farmerId}
          onChangeText={setFarmerId}
          autoCapitalize="none"
        />
        <View style={{ gap: 4 }}>
          {farmers.map((f) => (
            <Row
              key={f.id}
              title={f.name}
              meta={f.id === farmerId ? "Selected" : f.village || f.phone || f.id}
              onPress={() => setFarmerId(f.id)}
            />
          ))}
        </View>
        <Field
          label="Bag count (N)"
          value={bagCount}
          onChangeText={setBagCount}
          keyboardType="number-pad"
        />
        {weights.map((w, i) => (
          <Field
            key={i}
            label={`Bag ${i + 1} weight (kg)`}
            value={w}
            onChangeText={(t) => {
              const next = [...weights];
              next[i] = t;
              setWeights(next);
            }}
            keyboardType="decimal-pad"
          />
        ))}
        {error ? <ErrorText message={error} /> : null}
        <Btn label={busy ? "Saving…" : "Create lot + weight slip"} onPress={onCreate} disabled={busy} />
      </Panel>

      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Lots</Text>
        {lots.map((lot) => (
          <Row
            key={lot.id}
            title={`Lot #${lot.lotNumber} · ${lot.farmerName}`}
            meta={`${lot.bagCount} bags · net ${formatKg(lot.netWeight)} · ${lot.status} · suit÷${lot.suitRuleSnapshot.divisor}`}
            onPress={() => router.push(`/slip/${lot.id}`)}
          />
        ))}
        {!lots.length ? <Text style={{ color: colors.muted }}>No lots yet.</Text> : null}
      </Panel>
    </Screen>
  );
}
