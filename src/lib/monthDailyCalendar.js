import { dateFromDailyPaletteKey, getTodayColor } from './dailyPalette';

export function monthKeyFromDateKey(dateKey) {
  return String(dateKey || '').slice(0, 7);
}

export function dateKeyForDay(monthKey, day) {
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

export function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = String(dateKey).split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function buildWeekStrip(dateKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDateKey(dateKey, i - 6);
    const daily = getTodayColor(dateFromDailyPaletteKey(key));
    return {
      dateKey: key,
      day: parseInt(key.slice(8), 10),
      hex: daily.hex,
      name: daily.name,
      isToday: i === 6,
    };
  });
}

export function previewMonthParticipation(monthKey, todayDay) {
  const map = {};
  for (let d = 1; d < todayDay; d += 1) {
    if ((d * 7 + 3) % 5 === 0) continue;
    const key = dateKeyForDay(monthKey, d);
    let winnerRank = 0;
    if (d % 11 === 0) winnerRank = 1;
    else if (d % 13 === 0) winnerRank = 2;
    else if (d % 17 === 0) winnerRank = 3;
    map[key] = { participated: true, winnerRank };
  }
  return map;
}

export function participationFromVault(items = []) {
  const map = {};
  for (const item of items) {
    const snap = item?.extractionSnapshot || {};
    const date = snap.challengeDate || item?.dailyDateKey;
    if (!date) continue;
    const winner = snap.winnerRank
      || (Array.isArray(item.keywords) && item.keywords.includes('每日色卡') ? 1 : 0);
    const prev = map[date];
    map[date] = {
      participated: true,
      winnerRank: winner || prev?.winnerRank || 0,
    };
  }
  return map;
}

export function buildMonthCalendar(dateKey) {
  const key = String(dateKey || '');
  const [year, month, todayDay] = key.split('-').map((n) => parseInt(n, 10));
  const monthKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const last = new Date(year, month, 0).getDate();
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < lead; i += 1) {
    cells.push({ empty: true, key: `lead-${i}` });
  }

  for (let day = 1; day <= last; day += 1) {
    const dayKey = dateKeyForDay(monthKey, day);
    const daily = getTodayColor(dateFromDailyPaletteKey(dayKey));
    cells.push({
      empty: false,
      key: dayKey,
      day,
      dateKey: dayKey,
      hex: daily.hex,
      name: daily.name,
      isToday: day === todayDay,
      isFuture: day > todayDay,
    });
  }

  return {
    year,
    month,
    monthKey,
    todayDay,
    cells,
  };
}
