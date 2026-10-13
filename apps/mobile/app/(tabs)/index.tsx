import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { dashboardStats, formatINR } from "@tamarind/core";
import { useAppStore } from "../../src/state/StoreContext";
import { Loading, Panel, Screen } from "../../src/ui/primitives";
import { colors, spacing } from "../../src/theme";

export default function DashboardScreen() {
  const { store, ready, refreshKey } = useAppStore();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardStats>> | null>(null);

  useEffect(() => {
    if (!ready) return;
    void dashboardStats(store).then(setStats);
  }, [store, ready, refreshKey]);

  if (!ready || !stats) return <Loading />;

  const cards = [
    ["Farmers", String(stats.farmers)],
    ["Vendors", String(stats.vendors)],
    ["Open lots", String(stats.openLots)],
    ["Auctions", String(stats.auctions)],
    ["Today sale", formatINR(stats.todaySale)],
    ["Farmer due", formatINR(stats.farmerOutstanding)],
    ["Vendor due", formatINR(stats.vendorOutstanding)],
    ["Collected", formatINR(stats.collected)],
  ] as const;

  return (
    <Screen title="Dashboard" subtitle="Daily mandi ops · local SQLite">
      <Panel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {cards.map(([label, value]) => (
            <View
              key={label}
              style={{
                width: "47%",
                backgroundColor: colors.brandSoft,
                borderRadius: 12,
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
              <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 4 }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      </Panel>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Quick links</Text>
        <Link href="/farmers" style={{ color: colors.brand, paddingVertical: 6 }}>
          Farmers
        </Link>
        <Link href="/vendors" style={{ color: colors.brand, paddingVertical: 6 }}>
          Vendors
        </Link>
        <Link href="/patti" style={{ color: colors.brand, paddingVertical: 6 }}>
          Farmer Patti
        </Link>
        <Link href="/vendor-bills" style={{ color: colors.brand, paddingVertical: 6 }}>
          Vendor Bills
        </Link>
        <Link href="/printer" style={{ color: colors.brand, paddingVertical: 6 }}>
          Thermal printer
        </Link>
      </Panel>
    </Screen>
  );
}
