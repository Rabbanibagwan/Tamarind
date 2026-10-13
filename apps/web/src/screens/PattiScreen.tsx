import { FormEvent, useEffect, useState } from "react";
import { getSettings } from "../db/database";
import {
  createFarmerPatti,
  listParties,
  listPattis,
  unsettledAuctionsForFarmer,
} from "../db/services";
import type { Auction } from "../db/types";
import { formatINR, formatKg } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

export function PattiScreen() {
  const farmers = useLiveQuery(() => listParties("farmers"), [], []);
  const pattis = useLiveQuery(() => listPattis(), [], []);
  const settings = useLiveQuery(() => getSettings(), [], null);

  const [farmerId, setFarmerId] = useState("");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hamali, setHamali] = useState("");
  const [bhada, setBhada] = useState("");
  const [stationery, setStationery] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!farmerId) {
      setAuctions([]);
      setSelected([]);
      return;
    }
    void unsettledAuctionsForFarmer(farmerId).then(setAuctions);
  }, [farmerId, pattis]);

  useEffect(() => {
    if (settings) {
      setBhada(settings.defaultBhada);
      setStationery(settings.defaultStationery);
    }
  }, [settings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const doc = await createFarmerPatti({
        farmerId,
        auctionIds: selected,
        hamali: hamali || undefined,
        bhada: bhada || undefined,
        stationery: stationery || undefined,
      });
      setOk(`Patti #${doc.pattiNumber} created · payable ${formatINR(doc.payable)}`);
      setSelected([]);
      setAuctions(await unsettledAuctionsForFarmer(farmerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Farmer Patti</h1>
          <p>
            10% commission default · hamali · bhada once · stationery. Suit rule locked from lots.
          </p>
        </div>
      </div>

      <div className="panel no-print">
        <h2>Create patti</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Farmer
              <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} required>
                <option value="">Select…</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hamali (₹ total)
              <input
                value={hamali}
                onChange={(e) => setHamali(e.target.value)}
                placeholder="auto from bags × rate"
              />
            </label>
            <label>
              Bhada once (₹)
              <input value={bhada} onChange={(e) => setBhada(e.target.value)} />
            </label>
            <label>
              Stationery (₹)
              <input value={stationery} onChange={(e) => setStationery(e.target.value)} />
            </label>
          </div>
          <table style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th />
                <th>Lot</th>
                <th>Net</th>
                <th>Rate</th>
                <th>Sale</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, a.id]
                            : prev.filter((id) => id !== a.id),
                        )
                      }
                    />
                  </td>
                  <td>#{a.lotNumber}</td>
                  <td>{formatKg(a.netWeight)}</td>
                  <td>{formatINR(a.ratePerKg)}</td>
                  <td>{formatINR(a.saleAmount)}</td>
                </tr>
              ))}
              {!auctions.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No unsettled auctions for this farmer.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="row-actions">
            <button className="btn accent" type="submit" disabled={!selected.length}>
              Finalize patti
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
        </form>
      </div>

      <div className="panel">
        <h2>Pattis</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Farmer</th>
              <th>Sale</th>
              <th>Comm</th>
              <th>Bhada</th>
              <th>Payable</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {pattis.map((p) => (
              <tr key={p.id}>
                <td>{p.pattiNumber}</td>
                <td>{p.date}</td>
                <td>{p.farmerName}</td>
                <td>{formatINR(p.saleAmount)}</td>
                <td>
                  {p.commissionPercent}% · {formatINR(p.commissionAmount)}
                </td>
                <td>{formatINR(p.bhada)}</td>
                <td>{formatINR(p.payable)}</td>
                <td>{formatINR(p.paidAmount)}</td>
                <td>{formatINR(p.balanceAmount)}</td>
              </tr>
            ))}
            {!pattis.length ? (
              <tr>
                <td colSpan={9} className="muted">
                  No pattis yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
