/**
 * 色海快捷栏：按 GMT+8 日期推算应优先展示的节日 / 时令主题标签。
 */

import { dateFromDailyPaletteKey, formatDailyPaletteDateKey } from './dailyPalette.js';

/** @typedef {{ tag: string, score: number }} SeasonalTagScore */

const MS_DAY = 86_400_000;

function thanksgivingDate(year) {
  const nov1 = new Date(year, 10, 1);
  const dow = nov1.getDay();
  const firstThu = 1 + ((4 - dow + 7) % 7);
  return new Date(year, 10, firstThu + 21);
}

function nthWeekdayOfMonth(year, monthIndex, weekday, n) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset + (n - 1) * 7);
}

function resolveDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return dateFromDailyPaletteKey(input);
  }
  return dateFromDailyPaletteKey(formatDailyPaletteDateKey(new Date()));
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / MS_DAY);
}

function peakScore(dayDiff, windowDays, base = 100) {
  if (dayDiff > windowDays) return 0;
  return Math.max(0, base - dayDiff * Math.ceil(base / (windowDays + 1)));
}

function addScore(map, tag, score) {
  if (!tag || score <= 0) return;
  map.set(tag, Math.max(map.get(tag) || 0, score));
}

/** 农历节日公历近似（每年微调；窗口内优先展示） */
const LUNAR_FESTIVAL_WINDOWS = {
  2024: {
    腊八: ['2024-01-18', '2024-01-18'],
    春节: ['2024-02-04', '2024-02-24'],
    元宵: ['2024-02-19', '2024-02-29'],
    端午: ['2024-06-06', '2024-06-16'],
    七夕: ['2024-08-01', '2024-08-15'],
    中秋: ['2024-09-10', '2024-09-22'],
    重阳: ['2024-10-09', '2024-10-13'],
  },
  2025: {
    腊八: ['2025-01-07', '2025-01-07'],
    春节: ['2025-01-22', '2025-02-12'],
    元宵: ['2025-02-05', '2025-02-19'],
    端午: ['2025-05-28', '2025-06-07'],
    七夕: ['2025-08-22', '2025-08-30'],
    中秋: ['2025-10-01', '2025-10-08'],
    重阳: ['2025-10-28', '2025-11-01'],
  },
  2026: {
    腊八: ['2026-01-26', '2026-01-26'],
    春节: ['2026-02-10', '2026-03-03'],
    元宵: ['2026-02-24', '2026-03-06'],
    端午: ['2026-06-17', '2026-06-27'],
    七夕: ['2026-08-11', '2026-08-19'],
    中秋: ['2026-09-19', '2026-09-27'],
    重阳: ['2026-10-17', '2026-10-21'],
  },
  2027: {
    腊八: ['2027-01-15', '2027-01-15'],
    春节: ['2027-01-30', '2027-02-19'],
    元宵: ['2027-02-13', '2027-02-27'],
    端午: ['2027-06-06', '2027-06-16'],
    七夕: ['2027-08-31', '2027-09-08'],
    中秋: ['2027-10-08', '2027-10-16'],
    重阳: ['2027-10-06', '2027-10-10'],
  },
};

const SOLAR_TERM_TO_TAG = {
  清明: '清明',
};

const SOLAR_TERMS = [
  { zh: '小寒', m: 1, d: 6 },
  { zh: '大寒', m: 1, d: 20 },
  { zh: '立春', m: 2, d: 4 },
  { zh: '雨水', m: 2, d: 19 },
  { zh: '惊蛰', m: 3, d: 6 },
  { zh: '春分', m: 3, d: 21 },
  { zh: '清明', m: 4, d: 5 },
  { zh: '谷雨', m: 4, d: 20 },
  { zh: '立夏', m: 5, d: 6 },
  { zh: '小满', m: 5, d: 21 },
  { zh: '芒种', m: 6, d: 6 },
  { zh: '夏至', m: 6, d: 21 },
  { zh: '小暑', m: 7, d: 7 },
  { zh: '大暑', m: 7, d: 23 },
  { zh: '立秋', m: 8, d: 8 },
  { zh: '处暑', m: 8, d: 23 },
  { zh: '白露', m: 9, d: 8 },
  { zh: '秋分', m: 9, d: 23 },
  { zh: '寒露', m: 10, d: 8 },
  { zh: '霜降', m: 10, d: 23 },
  { zh: '立冬', m: 11, d: 7 },
  { zh: '小雪', m: 11, d: 22 },
  { zh: '大雪', m: 12, d: 7 },
  { zh: '冬至', m: 12, d: 22 },
];

function inMonthDayRange(date, startM, startD, endM, endD) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const cur = m * 100 + d;
  const start = startM * 100 + startD;
  const end = endM * 100 + endD;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

function scoreLunarWindows(date, scores) {
  const y = String(date.getFullYear());
  const windows = LUNAR_FESTIVAL_WINDOWS[y];
  if (windows) {
    for (const [tag, [startKey, endKey]] of Object.entries(windows)) {
      const start = dateFromDailyPaletteKey(startKey);
      const end = dateFromDailyPaletteKey(endKey);
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      const dayDiff = Math.min(
        Math.abs(daysBetween(date, start)),
        Math.abs(daysBetween(date, end)),
        Math.abs(daysBetween(date, mid)),
      );
      const windowDays = Math.max(3, daysBetween(end, start) + 5);
      addScore(scores, tag, peakScore(dayDiff, windowDays, 95));
    }
    return;
  }

  scoreMonthRange(date, scores, '腊八', 1, 1, 1, 20, 48);
  scoreMonthRange(date, scores, '春节', 1, 15, 2, 25, 72);
  scoreMonthRange(date, scores, '元宵', 2, 1, 2, 28, 68);
  scoreMonthRange(date, scores, '端午', 5, 25, 6, 20, 70);
  scoreMonthRange(date, scores, '七夕', 8, 1, 8, 25, 66);
  scoreMonthRange(date, scores, '中秋', 9, 5, 10, 8, 74);
  scoreMonthRange(date, scores, '重阳', 10, 1, 10, 20, 62);
}

function scoreFixedDay(date, scores, tag, month, day, windowDays = 7) {
  const peak = new Date(date.getFullYear(), month - 1, day);
  scoreFixedPeak(date, scores, tag, peak, windowDays);
}

function scoreFixedPeak(date, scores, tag, peak, windowDays = 7) {
  addScore(scores, tag, peakScore(Math.abs(daysBetween(date, peak)), windowDays, 92));
}

function scoreMonthRange(date, scores, tag, startM, startD, endM, endD, base = 55) {
  if (inMonthDayRange(date, startM, startD, endM, endD)) {
    addScore(scores, tag, base);
  }
}

function scoreSolarTerms(date, scores) {
  const y = date.getFullYear();
  let nearest = null;
  let nearestDiff = Infinity;

  for (const term of SOLAR_TERMS) {
    const peak = new Date(y, term.m - 1, term.d);
    const diff = Math.abs(daysBetween(date, peak));
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = { ...term, peak };
    }
  }

  if (!nearest || nearestDiff > 4) return;

  addScore(scores, '24节气', peakScore(nearestDiff, 4, 78));
  const mapped = SOLAR_TERM_TO_TAG[nearest.zh];
  if (mapped) addScore(scores, mapped, peakScore(nearestDiff, 4, 88));
}

/**
 * @param {Date | string} [dateInput]
 * @returns {SeasonalTagScore[]}
 */
export function getSeasonalQuickTagScores(dateInput) {
  const date = resolveDate(dateInput);
  const y = date.getFullYear();
  /** @type {Map<string, number>} */
  const scores = new Map();

  scoreFixedDay(date, scores, '元旦', 1, 1, 10);
  scoreFixedDay(date, scores, '情人节', 2, 14, 10);
  scoreFixedDay(date, scores, '妇女节', 3, 8, 8);
  scoreFixedDay(date, scores, '植树节', 3, 12, 6);
  scoreFixedDay(date, scores, '愚人节', 4, 1, 4);
  scoreFixedDay(date, scores, '劳动节', 5, 1, 10);
  scoreFixedDay(date, scores, '青年节', 5, 4, 6);
  scoreFixedDay(date, scores, '护士节', 5, 12, 5);
  scoreFixedDay(date, scores, '儿童节', 6, 1, 8);
  scoreFixedDay(date, scores, '国庆节', 10, 1, 14);
  scoreFixedDay(date, scores, '抗战纪念日', 9, 3, 5);
  scoreFixedDay(date, scores, '国家公祭日', 12, 13, 5);
  scoreFixedDay(date, scores, '万圣节', 10, 31, 7);
  scoreFixedDay(date, scores, '圣诞节', 12, 25, 14);

  scoreFixedPeak(date, scores, '母亲节', nthWeekdayOfMonth(y, 4, 0, 2), 8);
  scoreFixedPeak(date, scores, '父亲节', nthWeekdayOfMonth(y, 5, 0, 3), 8);

  const tg = thanksgivingDate(y);
  addScore(
    scores,
    '感恩节',
    peakScore(Math.abs(daysBetween(date, tg)), 7, 88),
  );

  scoreLunarWindows(date, scores);

  scoreSolarTerms(date, scores);

  scoreMonthRange(date, scores, '考试季', 5, 20, 6, 20, 62);
  scoreMonthRange(date, scores, '考试季', 12, 10, 1, 20, 52);
  scoreMonthRange(date, scores, '毕业季', 5, 1, 7, 20, 58);
  scoreMonthRange(date, scores, '开学季', 8, 25, 9, 20, 60);
  scoreMonthRange(date, scores, '寒暑假', 7, 1, 8, 31, 54);
  scoreMonthRange(date, scores, '寒暑假', 1, 15, 2, 28, 50);
  scoreMonthRange(date, scores, '读书季', 4, 15, 4, 30, 48);
  scoreMonthRange(date, scores, '读书季', 9, 1, 10, 15, 46);
  scoreMonthRange(date, scores, '年终', 12, 1, 12, 31, 52);

  scoreMonthRange(date, scores, '青春校园', 3, 1, 6, 30, 40);
  scoreMonthRange(date, scores, '校园青春', 3, 1, 6, 30, 38);
  scoreMonthRange(date, scores, '运动会', 4, 1, 11, 30, 36);
  scoreMonthRange(date, scores, '音乐节', 5, 1, 10, 31, 34);
  scoreMonthRange(date, scores, '海洋', 6, 1, 8, 31, 32);
  scoreMonthRange(date, scores, '森林', 3, 1, 5, 31, 30);

  return [...scores.entries()]
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag, 'zh-Hans'));
}

/**
 * @param {Date | string} [dateInput]
 * @param {number} [limit]
 * @returns {string[]}
 */
export function getSeasonalQuickTags(dateInput, limit = 4) {
  return getSeasonalQuickTagScores(dateInput)
    .slice(0, limit)
    .map(({ tag }) => tag);
}
