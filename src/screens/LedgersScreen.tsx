import { useMemo, useState } from "react";
import { db } from "../db/database";
import { listParties } from "../db/services";
import { d, formatINR, money } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

export function LedgersScreen() {
  const farmers = useLiveQuery(() => listParties("farmers"), [], []);
  const vendors = useLiveQuery(() => listParties("vendors"), [], []);
  const [partyType, setPartyType] = useState<"farmer" | "vendor">("farmer");
  const [partyId, setPartyId] = useState("");

  const parties = partyType === "farmer" ? farmers : vendors;

  const entries = useLiveQuery(
    async () => {
      if (!partyId) return [];
      return (await db.ledger.where("partyId").equals(partyId).toArray())
        .filter((e) => e.partyType === partyType)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    [partyType, partyId],
    [],
  );

  const balance = useMemo(() => {
    let bal = d(0);
    for (const e of entries) {
      // Farmer: credit = payable, debit = payment → balance owed to farmer
      // Vendor: debit = bill, credit = payment → balance owed by vendor
      bal = bal.plus(d(e.credit)).minus(d(e.debit));
    }
    return money(bal);
  }, [entries]);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Ledgers</h1>
          <p>Party-wise running ledger from pattis, bills, and payments.</p>
        </div>
      </div>

      <div className="panel no-print">
        <div className="form-grid">
          <label>
            Party type
            <select
              value={partyType}
              onChange={(e) => {
                setPartyType(e.target.value as "farmer" | "vendor");
                setPartyId("");
              }}
            >
              <option value="farmer">Farmer</option>
              <option value="vendor">Vendor</option>
            </select>
          </label>
          <label>
            Party
            <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select…</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {partyId ? (
          <p style={{ marginTop: "0.75rem" }}>
            Running balance: <strong>{formatINR(balance)}</strong>
            <span className="muted">
              {" "}
              ({partyType === "farmer" ? "positive = payable to farmer" : "positive = receivable from vendor"})
            </span>
          </p>
        ) : null}
      </div>

      <div className="panel">
        <h2>Entries</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Kind</th>
              <th>Ref</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td>{e.kind}</td>
                <td>
                  {e.refType} #{e.refNumber}
                </td>
                <td>{formatINR(e.debit)}</td>
                <td>{formatINR(e.credit)}</td>
                <td>{e.note}</td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  Select a party to view ledger.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
