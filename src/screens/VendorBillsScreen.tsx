import { FormEvent, useEffect, useState } from "react";
import { getSettings } from "../db/database";
import {
  createVendorBill,
  listParties,
  listVendorBills,
  unbilledAllocationsForVendor,
} from "../db/services";
import type { Auction, AuctionAllocation } from "../db/types";
import { formatINR, formatKg } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

type Row = { auction: Auction; allocation: AuctionAllocation };

export function VendorBillsScreen() {
  const vendors = useLiveQuery(() => listParties("vendors"), [], []);
  const bills = useLiveQuery(() => listVendorBills(), [], []);
  const settings = useLiveQuery(() => getSettings(), [], null);

  const [vendorId, setVendorId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hamali, setHamali] = useState("");
  const [cess, setCess] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!vendorId) {
      setRows([]);
      setSelected([]);
      return;
    }
    void unbilledAllocationsForVendor(vendorId).then(setRows);
  }, [vendorId, bills]);

  useEffect(() => {
    if (settings) setCess("");
  }, [settings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const refs = rows
        .filter((r) => selected.includes(r.allocation.id))
        .map((r) => ({ auctionId: r.auction.id, allocationId: r.allocation.id }));
      const doc = await createVendorBill({
        vendorId,
        allocationRefs: refs,
        hamali: hamali || undefined,
        cess: cess || undefined,
      });
      setOk(`Bill #${doc.billNumber} · total ${formatINR(doc.total)}`);
      setSelected([]);
      setRows(await unbilledAllocationsForVendor(vendorId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Vendor Bills</h1>
          <p>2% commission add-on · hamali · cess. Same suit snapshot as the auctioned lot.</p>
        </div>
      </div>

      <div className="panel no-print">
        <h2>Create bill</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Vendor
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Select…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hamali (₹ total)
              <input
                value={hamali}
                onChange={(e) => setHamali(e.target.value)}
                placeholder="auto from bags"
              />
            </label>
            <label>
              Cess (₹)
              <input value={cess} onChange={(e) => setCess(e.target.value)} placeholder="0" />
            </label>
          </div>
          <table style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th />
                <th>Lot</th>
                <th>Bags</th>
                <th>Net</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.allocation.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.allocation.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, r.allocation.id]
                            : prev.filter((id) => id !== r.allocation.id),
                        )
                      }
                    />
                  </td>
                  <td>#{r.auction.lotNumber}</td>
                  <td>{r.allocation.bagCount}</td>
                  <td>{formatKg(r.allocation.netWeight)}</td>
                  <td>{formatINR(r.auction.ratePerKg)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No unbilled allocations for this vendor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="row-actions">
            <button className="btn accent" type="submit" disabled={!selected.length}>
              Finalize bill
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
        </form>
      </div>

      <div className="panel">
        <h2>Vendor bills</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Base</th>
              <th>Comm</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>{b.billNumber}</td>
                <td>{b.date}</td>
                <td>{b.vendorName}</td>
                <td>{formatINR(b.baseAmount)}</td>
                <td>
                  {b.commissionPercent}% · {formatINR(b.commissionAmount)}
                </td>
                <td>{formatINR(b.total)}</td>
                <td>{formatINR(b.paidAmount)}</td>
                <td>{formatINR(b.balanceAmount)}</td>
              </tr>
            ))}
            {!bills.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  No vendor bills yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
