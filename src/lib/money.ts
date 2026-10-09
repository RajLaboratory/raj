/** All money is integer paise. */
export const rupeesToPaise = (r: number | string): number => {
  const n = typeof r === "string" ? Number(r.replace(/,/g, "")) : r;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
};

export const formatINR = (paise: number, opts: { symbol?: boolean } = {}): string => {
  const s = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
  return opts.symbol === false ? s : `₹${s}`;
};

/** Percent stored x100 (10% = 1000). Rounds half up to the nearest paisa. */
export const percentOf = (paise: number, percentX100: number): number =>
  Math.round((paise * percentX100) / 10000);
