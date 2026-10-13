import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../src/state/StoreContext";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.brand },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="farmers" options={{ title: "Farmers" }} />
        <Stack.Screen name="vendors" options={{ title: "Vendors" }} />
        <Stack.Screen name="patti" options={{ title: "Farmer Patti" }} />
        <Stack.Screen name="vendor-bills" options={{ title: "Vendor Bills" }} />
        <Stack.Screen name="payments" options={{ title: "Payments" }} />
        <Stack.Screen name="ledgers" options={{ title: "Ledgers" }} />
        <Stack.Screen name="reports" options={{ title: "Reports" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="backup" options={{ title: "Backup / Restore" }} />
        <Stack.Screen name="printer" options={{ title: "Thermal Printer" }} />
        <Stack.Screen name="slip/[lotId]" options={{ title: "Weight Slip" }} />
      </Stack>
    </StoreProvider>
  );
}
