import type { Judgment, TrainingRecord } from "./types";

/**
 * 判定层：训放负荷与休息放行规则（纯函数，不碰存储与页面）。
 *
 * 规则：
 * - 每十公里记一分，按最近七天累计负荷；
 * - 百公里训放后两天内，只进休息队列；
 * - 累计负荷到六分，只进休息队列；
 * - 恢复未通过，只进休息队列；
 * - 休息队列中的赛鸽不参加速度和名次排行。
 */

export const KM_PER_POINT = 10;
export const LOAD_WINDOW_DAYS = 7;
export const REST_LOAD_THRESHOLD = 6;
export const LONG_TRAINING_KM = 100;
export const LONG_TRAINING_REST_DAYS = 2;

/** 单条记录的负荷分：每满十公里记一分 */
export function recordPoints(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.floor(distanceKm / KM_PER_POINT);
}

export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** today - date 的天数；未来日期返回负数 */
export function daysBetween(date: string, today: string): number {
  const a = Date.parse(`${date}T00:00:00`);
  const b = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

function byDateDesc(a: TrainingRecord, b: TrainingRecord): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

/** 均速（米/分），未归巢或无计时返回 null */
export function speedMpm(record: TrainingRecord): number | null {
  if (!record.homed || record.minutes <= 0) return null;
  return Math.round((record.distanceKm * 1000) / record.minutes);
}

/** 对单羽赛鸽做放行判定 */
export function judgePigeon(
  pigeonId: string,
  records: TrainingRecord[],
  today: string
): Judgment {
  const own = records.filter((r) => r.pigeonId === pigeonId);

  const windowRecords = own
    .filter((r) => {
      const diff = daysBetween(r.date, today);
      return diff >= 0 && diff < LOAD_WINDOW_DAYS;
    })
    .sort(byDateDesc);

  const loadPoints = windowRecords.reduce(
    (sum, r) => sum + recordPoints(r.distanceKm),
    0
  );

  const longs = own
    .filter((r) => r.distanceKm >= LONG_TRAINING_KM)
    .map((r) => ({
      date: r.date,
      distanceKm: r.distanceKm,
      daysSince: daysBetween(r.date, today),
    }))
    .filter((item) => item.daysSince >= 0)
    .sort((a, b) => a.daysSince - b.daysSince);
  const lastLongTraining = longs.length > 0 ? longs[0] : null;

  const latest = windowRecords.length > 0 ? windowRecords[0] : null;
  const lastRecovery = latest
    ? { date: latest.date, passed: latest.recoveryPassed }
    : null;

  const reasons: string[] = [];
  let rest = false;

  if (lastLongTraining && lastLongTraining.daysSince <= LONG_TRAINING_REST_DAYS) {
    rest = true;
    reasons.push(
      `百公里长训（${lastLongTraining.date}，${lastLongTraining.distanceKm}km）后第${lastLongTraining.daysSince}天，${LONG_TRAINING_REST_DAYS}天内只进休息队列`
    );
  }
  if (loadPoints >= REST_LOAD_THRESHOLD) {
    rest = true;
    reasons.push(
      `近${LOAD_WINDOW_DAYS}天累计负荷${loadPoints}分，达到${REST_LOAD_THRESHOLD}分上限`
    );
  }
  if (lastRecovery && !lastRecovery.passed) {
    rest = true;
    reasons.push(`最近训放（${lastRecovery.date}）恢复未通过`);
  }

  if (!rest) {
    reasons.push(
      `近${LOAD_WINDOW_DAYS}天累计负荷${loadPoints}分，低于${REST_LOAD_THRESHOLD}分`
    );
    reasons.push(
      lastLongTraining
        ? `最近长训${lastLongTraining.date}（已隔${lastLongTraining.daysSince}天），过了${LONG_TRAINING_REST_DAYS}天休息期`
        : "无百公里长训记录"
    );
    reasons.push(lastRecovery ? "最近恢复检查通过" : "近期无训放记录");
  }

  return {
    pigeonId,
    status: rest ? "rest" : "cleared",
    loadPoints,
    windowRecords,
    lastLongTraining,
    lastRecovery,
    reasons,
  };
}

export interface RankingEntry {
  pigeonId: string;
  best: TrainingRecord;
  bestSpeedMpm: number;
  homedCount: number;
}

/** 单羽历史最佳均速（仅归巢且有计时的记录参与） */
export function bestSpeedEntry(
  pigeonId: string,
  records: TrainingRecord[]
): RankingEntry | null {
  const homed = records.filter(
    (r) => r.pigeonId === pigeonId && speedMpm(r) !== null
  );
  if (homed.length === 0) return null;
  let best = homed[0];
  for (const r of homed) {
    if ((speedMpm(r) ?? 0) > (speedMpm(best) ?? 0)) best = r;
  }
  return {
    pigeonId,
    best,
    bestSpeedMpm: speedMpm(best) ?? 0,
    homedCount: homed.length,
  };
}
