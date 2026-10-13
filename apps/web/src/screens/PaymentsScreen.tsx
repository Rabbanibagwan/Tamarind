import { FormEvent, useMemo, useState } from "react";
import { listPattis, listPayments, listVendorBills, recordPayment } from "../db/services";
import { formatINR } from "../domain/money";
import { useLiveQuery } from "../lib/hooks";

export function PaymentsScreen() {
  const pattis = useLiveQuery(() => listPattis(), [], []);
  const bills = useLiveQuery(() => listVendorBills(), [], []);
  const payments = useLiveQuery(() => listPayments(), [], []);

  const [kind, setKind] = useState<"patti" | "vendor_bill">("patti");
  const [docId, setDocId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"cash" | "upi" | "bank" | "other">("cash");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const docs = useMemo(() => {
    if (kind === "patti") {
      return pattis
        .filter((p) => Number(p.balanceAmount) > 0)
        .map((p) => ({
          id: p.id,
          label: `Patti #${p.pattiNumber} · ${p.farmerName} · due ${formatINR(p.balanceAmount)}`,
        }));
    }
    return bills
      .filter((b) => Number(b.balanceAmount) > 0)
      .map((b) => ({
        id: b.id,
        label: `Bill #${b.billNumber} · ${b.vendorName} · due ${formatINR(b.balanceAmount)}`,
      }));
  }, [kind, pattis, bills]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const pay = await recordPayment({
        partyType: kind === "patti" ? "farmer" : "vendor",
        docType: kind,
        docId,
        amount,
        mode,
      });
      setOk(`Payment ${formatINR(pay.amount)} recorded`);
      setAmount("");
      setDocId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Payments</h1>
          <p>Partial collections against farmer pattis or vendor bills.</p>
        </div>
      </div>

      <div className="panel no-print">
        <h2>Record payment</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Against
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as "patti" | "vendor_bill");
                  setDocId("");
                }}
              >
                <option value="patti">Farmer patti</option>
                <option value="vendor_bill">Vendor bill</option>
              </select>
            </label>
            <label>
              Document
              <select value={docId} onChange={(e) => setDocId(e.target.value)} required>
                <option value="">Select…</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (₹)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </label>
            <label>
              Mode
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div className="row-actions">
            <button className="btn accent" type="submit">
              Save payment
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
        </form>
      </div>

      <div className="panel">
        <h2>Payment history</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Party</th>
              <th>Doc</th>
              <th>Amount</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td>
                  {p.partyName} ({p.partyType})
                </td>
                <td>
                  {p.docType} #{p.docNumber}
                </td>
                <td>{formatINR(p.amount)}</td>
                <td>{p.mode}</td>
              </tr>
            ))}
            {!payments.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No payments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
