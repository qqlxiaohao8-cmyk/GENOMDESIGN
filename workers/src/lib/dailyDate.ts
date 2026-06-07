/** GMT+8 (Asia/Shanghai) date key YYYY-MM-DD — mirrors src/lib/dailyPalette.js */
export function todayChallengeDateKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const utcMs = x.getTime() + x.getTimezoneOffset() * 60000;
  const gmt8 = new Date(utcMs + 8 * 3600000);
  const y = gmt8.getFullYear();
  const m = String(gmt8.getMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
