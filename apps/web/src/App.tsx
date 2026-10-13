import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuctionScreen } from "./screens/AuctionScreen";
import { BackupScreen } from "./screens/BackupScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { DiaryScreen } from "./screens/DiaryScreen";
import { FarmersScreen } from "./screens/FarmersScreen";
import { LedgersScreen } from "./screens/LedgersScreen";
import { PattiScreen } from "./screens/PattiScreen";
import { PaymentsScreen } from "./screens/PaymentsScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { VendorBillsScreen } from "./screens/VendorBillsScreen";
import { VendorsScreen } from "./screens/VendorsScreen";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardScreen />} />
        <Route path="farmers" element={<FarmersScreen />} />
        <Route path="vendors" element={<VendorsScreen />} />
        <Route path="diary" element={<DiaryScreen />} />
        <Route path="auction" element={<AuctionScreen />} />
        <Route path="patti" element={<PattiScreen />} />
        <Route path="vendor-bills" element={<VendorBillsScreen />} />
        <Route path="payments" element={<PaymentsScreen />} />
        <Route path="ledgers" element={<LedgersScreen />} />
        <Route path="reports" element={<ReportsScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="backup" element={<BackupScreen />} />
      </Route>
    </Routes>
  );
}
