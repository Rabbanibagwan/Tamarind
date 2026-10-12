import { FormEvent, useMemo, useState } from "react";
import { WeightSlipView } from "../components/WeightSlip";
import { getSettings } from "../db/database";
import {
  createLot,
  getSlipForLot,
  listLots,
  listParties,
  recordSlipPrint,
} from "../db/services";
import type { Lot, WeightSlip } from "../db/types";
import { formatKg } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

export function DiaryScreen() {
  const farmers = useLiveQuery(() => listParties("farmers"), [], []);
  const lots = useLiveQuery(() => listLots(), [], []);
  const settings = useLiveQuery(() => getSettings(), [], null);

  const [farmerId, setFarmerId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bagInput, setBagInput] = useState("");
  const [bags, setBags] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [slip, setSlip] = useState<WeightSlip | null>(null);

  const selectedLot: Lot | undefined = useMemo(
    () => lots.find((l) => l.id === selectedLotId),
    [lots, selectedLotId],
  );

  function addBag() {
    const n = Number(bagInput);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a positive bag weight (kg)");
      return;
    }
    setBags((prev) => [...prev, n]);
    setBagInput("");
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!farmerId) throw new Error("Select a farmer");
      const { lot, slip: created } = await createLot({
        farmerId,
        date,
        bagWeights: bags,
      });
      setBags([]);
      setSelectedLotId(lot.id);
      setSlip(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function openSlip(lot: Lot) {
    const s = await getSlipForLot(lot.id);
    setSelectedLotId(lot.id);
    setSlip(s ?? null);
  }

  async function printSlip() {
    if (!slip) return;
    await recordSlipPrint(slip.id);
    const refreshed = await getSlipForLot(slip.lotId);
    setSlip(refreshed ?? slip);
    window.print();
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Action Diary</h1>
          <p>Record lots with per-bag weights. Suit is snapshotted from Settings.</p>
        </div>
      </div>

      <div className="split-2 no-print">
        <div className="panel">
          <h2>New lot</h2>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <label>
                Farmer
                <select
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
            <div className="form-grid" style={{ marginTop: "0.75rem" }}>
              <label>
                Bag weight (kg)
                <input
                  value={bagInput}
                  onChange={(e) => setBagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBag();
                    }
                  }}
                  placeholder="e.g. 42"
                />
              </label>
            </div>
            <div className="row-actions">
              <button className="btn secondary" type="button" onClick={addBag}>
                Add bag
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setBags([])}
                disabled={!bags.length}
              >
                Clear bags
              </button>
              <button className="btn accent" type="submit" disabled={!bags.length}>
                Save lot + slip
              </button>
            </div>
            <div className="bag-list">
              {bags.map((w, i) => (
                <span className="bag-pill" key={`${i}-${w}`}>
                  #{i + 1}: {w} kg
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginLeft: 6, padding: "0.1rem 0.4rem" }}
                    onClick={() => setBags((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </div>

        <div className="panel">
          <h2>Weight slip</h2>
          {selectedLot && slip && settings ? (
            <>
              <WeightSlipView lot={selectedLot} slip={slip} settings={settings} preview />
              <div className="row-actions">
                <button className="btn accent" type="button" onClick={() => void printSlip()}>
                  Print / Reprint
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Select a lot to preview its weight slip.</p>
          )}
        </div>
      </div>

      <div className="panel no-print">
        <h2>Lots</h2>
        <table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Date</th>
              <th>Farmer</th>
              <th>Bags</th>
              <th>Gross</th>
              <th>Suit</th>
              <th>Net</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>#{lot.lotNumber}</td>
                <td>{lot.date}</td>
                <td>{lot.farmerName}</td>
                <td>{lot.bagCount}</td>
                <td>{formatKg(lot.grossWeight)}</td>
                <td>{formatKg(lot.suitTotal)}</td>
                <td>{formatKg(lot.netWeight)}</td>
                <td>
                  <span className={`chip ${lot.status === "open" ? "warn" : ""}`}>
                    {lot.status}
                  </span>
                </td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => void openSlip(lot)}>
                    Slip
                  </button>
                </td>
              </tr>
            ))}
            {!lots.length ? (
              <tr>
                <td colSpan={9} className="muted">
                  No lots yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedLot && slip && settings ? (
        <div className="print-only">
          <WeightSlipView lot={selectedLot} slip={slip} settings={settings} />
        </div>
      ) : null}
    </>
  );
}
