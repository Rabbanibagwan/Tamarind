import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  createFarmerPatti,
  formatINR,
  listParties,
  listPattis,
  unsettledAuctionsForFarmer,
  type Auction,
  type FarmerPattiDoc,
  type Party,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";
import { formatSlipLines } from "../src/print/printer";

export default function PattiScreen() {
  const { store, printer, ready, bump, refreshKey } = useAppStore();
  const [farmers, setFarmers] = useState<Party[]>([]);
  const [pattis, setPattis] = useState<FarmerPattiDoc[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [farmerId, setFarmerId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [hamali, setHamali] = useState("80");
  const [bhada, setBhada] = useState("40");
  const [stationery, setStationery] = useState("20");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void Promise.all([listParties(store, "farmers"), listPattis(store)]).then(([f, p]) => {
      setFarmers(f);
      setPattis(p);
      if (!farmerId && f[0]) setFarmerId(f[0].id);
    });
  }, [store, ready, refreshKey, farmerId]);

  useEffect(() => {
    if (!ready || !farmerId) return;
    void unsettledAuctionsForFarmer(store, farmerId).then((a) => {
      setAuctions(a);
      setSelected(a.map((x) => x.id));
    });
  }, [store, ready, farmerId, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Farmer Patti" subtitle="Bhada once · suit snapshot frozen">
      <Panel>
        {farmers.map((f) => (
          <Row
            key={f.id}
            title={f.name}
            meta={f.id === farmerId ? "Selected" : f.village || f.id}
            onPress={() => setFarmerId(f.id)}
          />
        ))}
        <Text style={{ fontWeight: "600", color: colors.ink }}>Unsettled auctions</Text>
        {auctions.map((a) => {
          const on = selected.includes(a.id);
          return (
            <Row
              key={a.id}
              title={`Lot #${a.lotNumber} · ${formatINR(a.saleAmount)}`}
              meta={on ? "Included" : "Tap to toggle"}
              onPress={() =>
                setSelected((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))
              }
            />
          );
        })}
        <Field label="Hamali" value={hamali} onChangeText={setHamali} keyboardType="decimal-pad" />
        <Field label="Bhada (once)" value={bhada} onChangeText={setBhada} keyboardType="decimal-pad" />
        <Field
          label="Stationery"
          value={stationery}
          onChangeText={setStationery}
          keyboardType="decimal-pad"
        />
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Create patti"
          onPress={async () => {
            try {
              setError(null);
              const doc = await createFarmerPatti(store, {
                farmerId,
                auctionIds: selected,
                hamali,
                bhada,
                stationery,
              });
              bump();
              await printer.print({
                kind: "patti",
                documentId: doc.id,
                title: `Patti #${doc.pattiNumber}`,
                lines: formatSlipLines({
                  merchantName: "Tamarind Mandi",
                  title: `PATTI #${doc.pattiNumber}`,
                  documentId: doc.id,
                  body: [
                    doc.farmerName,
                    `Payable ${doc.payable}`,
                    `Bhada ${doc.bhada} (once)`,
                    `Suit ÷${doc.suitRuleSnapshot.divisor}`,
                  ],
                }),
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Pattis</Text>
        {pattis.map((p) => (
          <Row
            key={p.id}
            title={`#${p.pattiNumber} · ${p.farmerName}`}
            meta={`Payable ${formatINR(p.payable)} · bal ${formatINR(p.balanceAmount)}`}
            onPress={async () => {
              await printer.print({
                kind: "patti",
                documentId: p.id,
                title: `Patti #${p.pattiNumber}`,
                lines: formatSlipLines({
                  merchantName: "Tamarind Mandi",
                  title: `PATTI #${p.pattiNumber}`,
                  documentId: p.id,
                  reprint: true,
                  body: [p.farmerName, `Payable ${p.payable}`, `Bal ${p.balanceAmount}`],
                }),
              });
            }}
          />
        ))}
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tap to reprint (same id, no duplicate).</Text>
      </Panel>
    </Screen>
  );
}
