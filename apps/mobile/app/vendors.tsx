import { useEffect, useState } from "react";
import { Text } from "react-native";
import { deleteParty, listParties, upsertParty, type Party } from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function VendorsScreen() {
  const { store, ready, bump, refreshKey } = useAppStore();
  const [rows, setRows] = useState<Party[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void listParties(store, "vendors").then(setRows);
  }, [store, ready, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Vendors" subtitle="Master data">
      <Panel>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Save vendor"
          onPress={async () => {
            try {
              setError(null);
              if (!name.trim()) throw new Error("Name required");
              await upsertParty(store, "vendors", { name, phone });
              setName("");
              setPhone("");
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
            meta={r.phone || r.id}
            onPress={async () => {
              await deleteParty(store, "vendors", r.id);
              bump();
            }}
          />
        ))}
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tap a row to delete.</Text>
      </Panel>
    </Screen>
  );
}
