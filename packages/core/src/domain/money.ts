import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type Money = string;
export type Weight = string;

export function d(value: Decimal.Value): Decimal {
  return new Decimal(value ?? 0);
}

export function money(value: Decimal.Value): Money {
  return d(value).toFixed(2);
}

export function weight(value: Decimal.Value): Weight {
  return d(value).toFixed(3);
}

export function add(...values: Decimal.Value[]): Money {
  return money(values.reduce<Decimal>((acc, v) => acc.plus(d(v)), d(0)));
}

export function sub(a: Decimal.Value, b: Decimal.Value): Money {
  return money(d(a).minus(d(b)));
}

export function mul(a: Decimal.Value, b: Decimal.Value): Money {
  return money(d(a).times(d(b)));
}

export function pctOf(base: Decimal.Value, percent: Decimal.Value): Money {
  return money(d(base).times(d(percent)).div(100));
}

export function sumWeights(values: Decimal.Value[]): Weight {
  return weight(values.reduce<Decimal>((acc, v) => acc.plus(d(v)), d(0)));
}

export function formatINR(value: Decimal.Value): string {
  const n = d(value).toFixed(2);
  const [whole, frac] = n.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₹${withCommas}.${frac}`;
}

export function formatKg(value: Decimal.Value): string {
  return `${d(value).toFixed(3)} kg`;
}
