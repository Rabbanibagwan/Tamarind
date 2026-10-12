import Decimal from "decimal.js";
import { d, weight, type Weight } from "./money";

/** Snapshot of the suit rule preserved on each lot / transaction. */
export type SuitRuleSnapshot = {
  mode: "floor_divisor";
  divisor: number;
  label: string;
};

export const DEFAULT_SUIT_RULE: SuitRuleSnapshot = {
  mode: "floor_divisor",
  divisor: 20,
  label: "FLOOR(weight / 20) kg per bag",
};

/**
 * Default merchant suit: FLOOR(weightKg / divisor) per bag.
 * Examples (divisor 20): 19→0, 20→1, 21→1, 25→1, 39→1, 40→2, 42→2, 60→3.
 * A merchant wanting 42→3 must change the rule in Settings (e.g. divisor 14).
 */
export function suitForBag(
  weightKg: Decimal.Value,
  rule: SuitRuleSnapshot = DEFAULT_SUIT_RULE,
): Weight {
  const w = d(weightKg);
  if (w.lte(0)) return weight(0);
  if (rule.mode !== "floor_divisor") {
    throw new Error(`Unsupported suit rule mode: ${(rule as SuitRuleSnapshot).mode}`);
  }
  const divisor = rule.divisor > 0 ? rule.divisor : 20;
  return weight(w.div(divisor).floor());
}

export function netWeightForBag(
  weightKg: Decimal.Value,
  rule: SuitRuleSnapshot = DEFAULT_SUIT_RULE,
): Weight {
  return weight(d(weightKg).minus(d(suitForBag(weightKg, rule))));
}

export function summarizeBags(
  bagWeights: Decimal.Value[],
  rule: SuitRuleSnapshot = DEFAULT_SUIT_RULE,
): {
  bagCount: number;
  grossWeight: Weight;
  suitTotal: Weight;
  netWeight: Weight;
  bags: Array<{ weightKg: Weight; suitKg: Weight; netKg: Weight }>;
} {
  const bags = bagWeights.map((w) => {
    const weightKg = weight(w);
    const suitKg = suitForBag(w, rule);
    const netKg = weight(d(weightKg).minus(d(suitKg)));
    return { weightKg, suitKg, netKg };
  });
  const grossWeight = weight(
    bags.reduce((acc, b) => acc.plus(d(b.weightKg)), new Decimal(0)),
  );
  const suitTotal = weight(
    bags.reduce((acc, b) => acc.plus(d(b.suitKg)), new Decimal(0)),
  );
  const netWeight = weight(d(grossWeight).minus(d(suitTotal)));
  return { bagCount: bags.length, grossWeight, suitTotal, netWeight, bags };
}

export function ruleFromSettings(divisor: number): SuitRuleSnapshot {
  const safe = Number.isFinite(divisor) && divisor > 0 ? divisor : 20;
  return {
    mode: "floor_divisor",
    divisor: safe,
    label: `FLOOR(weight / ${safe}) kg per bag`,
  };
}
