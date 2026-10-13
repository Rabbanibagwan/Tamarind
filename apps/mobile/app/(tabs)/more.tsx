import { Link } from "expo-router";
import { Text } from "react-native";
import { Panel, Screen } from "../../src/ui/primitives";
import { colors } from "../../src/theme";

const links = [
  ["/farmers", "Farmers"],
  ["/vendors", "Vendors"],
  ["/patti", "Farmer Patti"],
  ["/vendor-bills", "Vendor Bills"],
  ["/payments", "Payments"],
  ["/ledgers", "Ledgers"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
  ["/backup", "Backup / Restore"],
  ["/printer", "Thermal Printer"],
] as const;

export default function MoreScreen() {
  return (
    <Screen title="More" subtitle="Masters, billing, money, settings">
      <Panel>
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#D0DBD4",
              color: colors.brand,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {label}
          </Link>
        ))}
        <Text style={{ color: colors.muted, marginTop: 12, fontSize: 13 }}>
          Web app remains available via Vite. This mobile app uses the same shared billing rules.
        </Text>
      </Panel>
    </Screen>
  );
}
