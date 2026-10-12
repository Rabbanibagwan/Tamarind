import { useLiveQuery } from "../lib/hooks";
import { dashboardStats } from "../db/services";
import { formatINR } from "../domain/money";

export function DashboardScreen() {
  const stats = useLiveQuery(
    () => dashboardStats(),
    [],
    {
      farmers: 0,
      vendors: 0,
      openLots: 0,
      totalLots: 0,
      auctions: 0,
      todaySale: "0.00",
      farmerOutstanding: "0.00",
      vendorOutstanding: "0.00",
      collected: "0.00",
      pattiCount: 0,
      billCount: 0,
    },
  );

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Dashboard</h1>
          <p>Live mandi activity from local persistent data.</p>
        </div>
      </div>
      <div className="panel">
        <div className="grid-stats">
          <div className="stat">
            <div className="label">Farmers</div>
            <div className="value">{stats.farmers}</div>
          </div>
          <div className="stat">
            <div className="label">Vendors</div>
            <div className="value">{stats.vendors}</div>
          </div>
          <div className="stat">
            <div className="label">Open lots</div>
            <div className="value">{stats.openLots}</div>
          </div>
          <div className="stat">
            <div className="label">Auctions</div>
            <div className="value">{stats.auctions}</div>
          </div>
          <div className="stat">
            <div className="label">Today sale</div>
            <div className="value">{formatINR(stats.todaySale)}</div>
          </div>
          <div className="stat">
            <div className="label">Farmer payable due</div>
            <div className="value">{formatINR(stats.farmerOutstanding)}</div>
          </div>
          <div className="stat">
            <div className="label">Vendor due</div>
            <div className="value">{formatINR(stats.vendorOutstanding)}</div>
          </div>
          <div className="stat">
            <div className="label">Payments booked</div>
            <div className="value">{formatINR(stats.collected)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
