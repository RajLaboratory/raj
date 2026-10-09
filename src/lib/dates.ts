export const TZ = "Asia/Kolkata";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...o });

/** 27/09/2026 */
export const formatDate = (d: Date | string) =>
  fmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));

/** 27/09/2026, 02:35 pm */
export const formatDateTime = (d: Date | string) =>
  fmt({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d));

/** Start of today in IST, returned as a UTC Date (IST = UTC+05:30, no DST). */
export const startOfTodayIST = (now = new Date()): Date => {
  const ist = new Date(now.getTime() + 330 * 60_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 330 * 60_000);
};
