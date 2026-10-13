import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  dashboardStats,
  formatINR,
  listAuctions,
  listLots,
  listPattis,
  listVendorBills,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Loading, Panel, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function ReportsScreen() {
  const { store, ready, refreshKey } = useAppStore();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const [stats, lots, auctions, pattis, bills] = await Promise.all([
        dashboardStats(store),
        listLots(store),
        listAuctions(store),
        listPattis(store),
        listVendorBills(store),
      ]);
      const lines = [
        `Lots: ${lots.length} (open ${stats.openLots})`,
        `Auctions: ${auctions.length}`,
        `Today sale: ${formatINR(stats.todaySale)}`,
        `Pattis: ${pattis.length} · farmer due ${formatINR(stats.farmerOutstanding)}`,
        `Vendor bills: ${bills.length} · vendor due ${formatINR(stats.vendorOutstanding)}`,
        `Collected: ${formatINR(stats.collected)}`,
      ];
      setText(lines.join("\n"));
    })();
  }, [store, ready, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Reports" subtitle="Daily sales · outstanding · lot summary">
      <Panel>
        <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 24 }}>{text || "…"}</Text>
      </Panel>
    </Screen>
  );
}
