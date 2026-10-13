import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createAuction,
  listOpenLots,
  listParties,
} from "../db/services";
import { useLiveQuery } from "../lib/hooks";
import { formatINR, formatKg } from "../domain/money";
import { listAuctions } from "../db/services";

type AllocDraft = { vendorId: string; bagIndices: number[] };

export function AuctionScreen() {
  const openLots = useLiveQuery(() => listOpenLots(), [], []);
  const vendors = useLiveQuery(() => listParties("vendors"), [], []);
  const auctions = useLiveQuery(() => listAuctions(), [], []);

  const [lotId, setLotId] = useState("");
  const [rate, setRate] = useState("10");
  const [allocations, setAllocations] = useState<AllocDraft[]>([
    { vendorId: "", bagIndices: [] },
  ]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const lot = useMemo(() => openLots.find((l) => l.id === lotId), [openLots, lotId]);

  useEffect(() => {
    if (lot) {
      setAllocations([{ vendorId: "", bagIndices: lot.bags.map((b) => b.index) }]);
    }
  }, [lotId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleBag(allocIdx: number, bagIndex: number) {
    setAllocations((prev) =>
      prev.map((a, i) => {
        if (i !== allocIdx) {
          return { ...a, bagIndices: a.bagIndices.filter((x) => x !== bagIndex) };
        }
        const has = a.bagIndices.includes(bagIndex);
        return {
          ...a,
          bagIndices: has
            ? a.bagIndices.filter((x) => x !== bagIndex)
            : [...a.bagIndices, bagIndex].sort((x, y) => x - y),
        };
      }),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      if (!lotId) throw new Error("Select a lot");
      await createAuction({
        lotId,
        ratePerKg: rate,
        allocations: allocations.filter((a) => a.vendorId && a.bagIndices.length),
      });
      setOk("Auction saved and finalized.");
      setLotId("");
      setAllocations([{ vendorId: "", bagIndices: [] }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Auction</h1>
          <p>Set rate and split bags across vendors. Allocations must cover every bag.</p>
        </div>
      </div>

      <div className="panel no-print">
        <h2>Enter auction</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Open lot
              <select value={lotId} onChange={(e) => setLotId(e.target.value)} required>
                <option value="">Select…</option>
                {openLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    #{l.lotNumber} · {l.farmerName} · net {l.netWeight} kg
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rate (₹/kg)
              <input value={rate} onChange={(e) => setRate(e.target.value)} required />
            </label>
          </div>

          {lot ? (
            <div style={{ marginTop: "1rem" }}>
              <p className="muted">
                Lot #{lot.lotNumber}: {lot.bagCount} bags · gross {formatKg(lot.grossWeight)} ·
                suit {formatKg(lot.suitTotal)} · net {formatKg(lot.netWeight)} · rule{" "}
                {lot.suitRuleSnapshot.label}
              </p>
              {allocations.map((alloc, idx) => (
                <div key={idx} className="panel" style={{ boxShadow: "none", marginTop: "0.75rem" }}>
                  <div className="form-grid">
                    <label>
                      Vendor {idx + 1}
                      <select
                        value={alloc.vendorId}
                        onChange={(e) =>
                          setAllocations((prev) =>
                            prev.map((a, i) =>
                              i === idx ? { ...a, vendorId: e.target.value } : a,
                            ),
                          )
                        }
                      >
                        <option value="">Select…</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="bag-list">
                    {lot.bags.map((b) => {
                      const checked = alloc.bagIndices.includes(b.index);
                      return (
                        <label key={b.index} className="bag-pill" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBag(idx, b.index)}
                          />{" "}
                          Bag {b.index + 1}: {b.weightKg} → net {b.netKg}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="row-actions">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    setAllocations((prev) => [...prev, { vendorId: "", bagIndices: [] }])
                  }
                >
                  Add vendor split
                </button>
                <button className="btn accent" type="submit">
                  Finalize auction
                </button>
              </div>
            </div>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
        </form>
      </div>

      <div className="panel">
        <h2>Recent auctions</h2>
        <table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Date</th>
              <th>Farmer</th>
              <th>Rate</th>
              <th>Net</th>
              <th>Sale</th>
              <th>Vendors</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a) => (
              <tr key={a.id}>
                <td>#{a.lotNumber}</td>
                <td>{a.date}</td>
                <td>{a.farmerName}</td>
                <td>{formatINR(a.ratePerKg)}/kg</td>
                <td>{formatKg(a.netWeight)}</td>
                <td>{formatINR(a.saleAmount)}</td>
                <td>
                  {a.allocations.map((al) => (
                    <div key={al.id}>
                      {al.vendorName}: {formatKg(al.netWeight)}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {!auctions.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No auctions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
