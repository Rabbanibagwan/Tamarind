import type { AppSettings, Lot, WeightSlip as Slip } from "../db/types";
import { formatINR, formatKg } from "../domain/money";

type Props = {
  lot: Lot;
  slip: Slip;
  settings: AppSettings;
  preview?: boolean;
};

export function WeightSlipView({ lot, slip, settings, preview }: Props) {
  const widthClass = settings.printWidthMm === 58 ? "width-58" : "";
  const cls = preview ? `slip-preview ${widthClass}` : `slip-sheet ${widthClass}`;

  return (
    <div className={cls}>
      <h1>{settings.merchantName || "Tamarind Mandi"}</h1>
      {settings.merchantAddress ? <div>{settings.merchantAddress}</div> : null}
      {settings.merchantPhone ? <div>Ph: {settings.merchantPhone}</div> : null}
      <hr />
      <div>
        <strong>Weight Slip #{slip.slipNumber}</strong>
      </div>
      <div>Lot #{lot.lotNumber} · {lot.date}</div>
      <div>Farmer: {lot.farmerName}</div>
      <div>{lot.commodity}</div>
      <div style={{ marginTop: 6, fontSize: 11 }}>{lot.suitRuleSnapshot.label}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wt</th>
            <th>Suit</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {lot.bags.map((b) => (
            <tr key={b.index}>
              <td>{b.index + 1}</td>
              <td>{b.weightKg}</td>
              <td>{b.suitKg}</td>
              <td>{b.netKg}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <div>Bags: {lot.bagCount}</div>
        <div>Gross: {formatKg(lot.grossWeight)}</div>
        <div>Suit: {formatKg(lot.suitTotal)}</div>
        <div>
          <strong>Net: {formatKg(lot.netWeight)}</strong>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10 }} className="muted">
        Prints: {slip.printedCount}
        {slip.lastPrintedAt ? ` · last ${new Date(slip.lastPrintedAt).toLocaleString()}` : ""}
      </div>
      {!preview ? null : (
        <div style={{ marginTop: 6, fontSize: 10 }} className="muted">
          Reprint uses the same slip — no duplicate record.
        </div>
      )}
      <div style={{ display: "none" }}>{formatINR(0)}</div>
    </div>
  );
}
