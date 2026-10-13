import { useEffect, useState } from "react";
import { Text } from "react-native";
import { deleteParty, listParties, upsertParty, type Party } from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function FarmersScreen() {
  const { store, ready, bump, refreshKey } = useAppStore();
  const [rows, setRows] = useState<Party[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void listParties(store, "farmers").then(setRows);
  }, [store, ready, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Farmers" subtitle="Master data">
      <Panel>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Village" value={village} onChangeText={setVillage} />
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Save farmer"
          onPress={async () => {
            try {
              setError(null);
              if (!name.trim()) throw new Error("Name required");
              await upsertParty(store, "farmers", { name, phone, village });
              setName("");
              setPhone("");
              setVillage("");
              bump();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
      <Panel>
        {rows.map((r) => (
          <Row
            key={r.id}
            title={r.name}
            meta={[r.village, r.phone].filter(Boolean).join(" · ") || r.id}
            onPress={async () => {
              await deleteParty(store, "farmers", r.id);
              bump();
            }}
          />
        ))}
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tap a row to delete.</Text>
      </Panel>
    </Screen>
  );
}
