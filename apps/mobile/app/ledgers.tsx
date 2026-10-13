import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  formatINR,
  ledgerForParty,
  listParties,
  type LedgerEntry,
  type Party,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function LedgersScreen() {
  const { store, ready, refreshKey } = useAppStore();
  const [partyType, setPartyType] = useState<"farmer" | "vendor">("farmer");
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    if (!ready) return;
    void listParties(store, partyType === "farmer" ? "farmers" : "vendors").then((p) => {
      setParties(p);
      if (p[0]) setPartyId(p[0].id);
    });
  }, [store, ready, partyType, refreshKey]);

  useEffect(() => {
    if (!ready || !partyId) return;
    void ledgerForParty(store, partyType, partyId).then(setEntries);
  }, [store, ready, partyType, partyId, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Ledgers" subtitle="From real postings">
      <Panel>
        <Row
          title="Farmers"
          meta={partyType === "farmer" ? "Selected" : "Tap"}
          onPress={() => setPartyType("farmer")}
        />
        <Row
          title="Vendors"
          meta={partyType === "vendor" ? "Selected" : "Tap"}
          onPress={() => setPartyType("vendor")}
        />
        {parties.map((p) => (
          <Row
            key={p.id}
            title={p.name}
            meta={p.id === partyId ? "Selected" : p.id}
            onPress={() => setPartyId(p.id)}
          />
        ))}
      </Panel>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Entries</Text>
        {entries.map((e) => (
          <Row
            key={e.id}
            title={e.note}
            meta={`${e.date} · Dr ${formatINR(e.debit)} · Cr ${formatINR(e.credit)}`}
          />
        ))}
        {!entries.length ? <Text style={{ color: colors.muted }}>No ledger rows.</Text> : null}
      </Panel>
    </Screen>
  );
}
