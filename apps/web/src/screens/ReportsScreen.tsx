import { useMemo } from "react";
import { listAuctions, listLots, listPattis, listVendorBills } from "../db/services";
import { d, formatINR, formatKg, money } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

export function ReportsScreen() {
  const lots = useLiveQuery(() => listLots(), [], []);
  const auctions = useLiveQuery(() => listAuctions(), [], []);
  const pattis = useLiveQuery(() => listPattis(), [], []);
  const bills = useLiveQuery(() => listVendorBills(), [], []);

  const summary = useMemo(() => {
    const totalNet = money(lots.reduce((acc, l) => acc.plus(d(l.netWeight)), d(0)));
    const totalSale = money(auctions.reduce((acc, a) => acc.plus(d(a.saleAmount)), d(0)));
    const farmerDue = money(pattis.reduce((acc, p) => acc.plus(d(p.balanceAmount)), d(0)));
    const vendorDue = money(bills.reduce((acc, b) => acc.plus(d(b.balanceAmount)), d(0)));
    return { totalNet, totalSale, farmerDue, vendorDue };
  }, [lots, auctions, pattis, bills]);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Reports</h1>
          <p>Aggregates from persisted lots, auctions, pattis, and vendor bills.</p>
        </div>
      </div>

      <div className="panel">
        <div className="grid-stats">
          <div className="stat">
            <div className="label">Lots</div>
            <div className="value">{lots.length}</div>
          </div>
          <div className="stat">
            <div className="label">Total net weight</div>
            <div className="value">{formatKg(summary.totalNet)}</div>
          </div>
          <div className="stat">
            <div className="label">Auction sale</div>
            <div className="value">{formatINR(summary.totalSale)}</div>
          </div>
          <div className="stat">
            <div className="label">Farmer outstanding</div>
            <div className="value">{formatINR(summary.farmerDue)}</div>
          </div>
          <div className="stat">
            <div className="label">Vendor outstanding</div>
            <div className="value">{formatINR(summary.vendorDue)}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Lot summary</h2>
        <table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Date</th>
              <th>Farmer</th>
              <th>Net</th>
              <th>Status</th>
              <th>Suit rule</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id}>
                <td>#{l.lotNumber}</td>
                <td>{l.date}</td>
                <td>{l.farmerName}</td>
                <td>{formatKg(l.netWeight)}</td>
                <td>{l.status}</td>
                <td className="muted">{l.suitRuleSnapshot.label}</td>
              </tr>
            ))}
            {!lots.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No data yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
