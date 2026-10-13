import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  createAuction,
  formatINR,
  formatKg,
  listOpenLots,
  listParties,
  type Lot,
  type Party,
} from "@tamarind/core";
import { useAppStore } from "../../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../../src/ui/primitives";
import { colors } from "../../src/theme";

export default function AuctionScreen() {
  const { store, ready, bump, refreshKey } = useAppStore();
  const [lots, setLots] = useState<Lot[]>([]);
  const [vendors, setVendors] = useState<Party[]>([]);
  const [lotId, setLotId] = useState("");
  const [rate, setRate] = useState("10");
  const [vendorId, setVendorId] = useState("");
  const [splitVendorId, setSplitVendorId] = useState("");
  const [splitAfter, setSplitAfter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void Promise.all([listOpenLots(store), listParties(store, "vendors")]).then(([l, v]) => {
      setLots(l);
      setVendors(v);
      if (!lotId && l[0]) setLotId(l[0].id);
      if (!vendorId && v[0]) setVendorId(v[0].id);
    });
  }, [store, ready, refreshKey, lotId, vendorId]);

  if (!ready) return <Loading />;

  const lot = lots.find((l) => l.id === lotId);

  async function onAuction() {
    setError(null);
    setBusy(true);
    try {
      if (!lot) throw new Error("Select an open lot");
      if (!vendorId) throw new Error("Select a vendor");
      const indices = lot.bags.map((b) => b.index);
      let allocations: Array<{ vendorId: string; bagIndices: number[] }>;
      if (splitVendorId && splitAfter) {
        const cut = Number(splitAfter);
        if (!Number.isFinite(cut) || cut <= 0 || cut >= indices.length) {
          throw new Error("Split after N bags must be between 1 and bagCount-1");
        }
        allocations = [
          { vendorId, bagIndices: indices.slice(0, cut) },
          { vendorId: splitVendorId, bagIndices: indices.slice(cut) },
        ];
      } else {
        allocations = [{ vendorId, bagIndices: indices }];
      }
      await createAuction(store, { lotId: lot.id, ratePerKg: rate, allocations });
      bump();
      setLotId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Auction" subtitle="Rate + bag-split allocation across vendors">
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Open lots</Text>
        {lots.map((l) => (
          <Row
            key={l.id}
            title={`Lot #${l.lotNumber} · ${l.farmerName}`}
            meta={`${l.bagCount} bags · net ${formatKg(l.netWeight)}${l.id === lotId ? " · selected" : ""}`}
            onPress={() => setLotId(l.id)}
          />
        ))}
        {!lots.length ? <Text style={{ color: colors.muted }}>No open lots.</Text> : null}
      </Panel>

      <Panel>
        <Field label="Rate ₹/kg" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
        <Text style={{ fontWeight: "600", color: colors.ink }}>Primary vendor</Text>
        {vendors.map((v) => (
          <Row
            key={v.id}
            title={v.name}
            meta={v.id === vendorId ? "Selected" : v.phone || v.id}
            onPress={() => setVendorId(v.id)}
          />
        ))}
        <Text style={{ fontWeight: "600", color: colors.ink, marginTop: 8 }}>
          Optional 2-way bag split
        </Text>
        <Field
          label="Split after N bags (leave blank = all to primary)"
          value={splitAfter}
          onChangeText={setSplitAfter}
          keyboardType="number-pad"
        />
        {vendors
          .filter((v) => v.id !== vendorId)
          .map((v) => (
            <Row
              key={v.id}
              title={v.name}
              meta={v.id === splitVendorId ? "2nd vendor selected" : "Tap to set 2nd vendor"}
              onPress={() => setSplitVendorId(v.id)}
            />
          ))}
        {lot ? (
          <View>
            <Text style={{ color: colors.muted }}>
              Preview sale ≈ {formatINR(Number(lot.netWeight) * Number(rate || 0))}
            </Text>
          </View>
        ) : null}
        {error ? <ErrorText message={error} /> : null}
        <Btn label={busy ? "Saving…" : "Finalize auction"} onPress={onAuction} disabled={busy} />
      </Panel>
    </Screen>
  );
}
