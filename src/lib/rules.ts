// 判定层：纯函数，无 React、无存储。
// 规则：每十公里记一分，按最近七天累计；
// 百公里训放后两天内、负荷到六分或恢复未通过时，只进休息队列，
// 不参加速度和名次排行。

import type { BirdVerdict, Recovery, TrainingRecord } from "../types";

export const LONG_FLIGHT_KM = 100; // 长训门槛
export const LONG_REST_MS = 2 * 24 * 60 * 60 * 1000; // 长训后两天
export const LOAD_LIMIT = 6; // 负荷到六分进入休息队列
export const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 最近七天
export const SCORE_STEP_KM = 10; // 每十公里记一分

export const RECOVERY_LABEL: Record<Recovery, string> = {
  passed: "恢复通过",
  failed: "恢复未通过",
  none: "未归巢/未评估",
};

/** 单条记录的负荷分：每十公里一分，不足十公里按比例 */
export function scoreOf(rec: Pick<TrainingRecord, "distanceKm" | "homed">): number {
  if (!rec.homed || rec.distanceKm == null) return 0;
  return rec.distanceKm / SCORE_STEP_KM;
}

/** 分速 m/min（距离公里 * 1000 / 分钟），无数据时为 null */
export function speedOf(rec: TrainingRecord): number | null {
  if (!rec.homed || rec.distanceKm == null || !rec.minutes || rec.minutes <= 0) {
    return null;
  }
  return (rec.distanceKm * 1000) / rec.minutes;
}

export function isLongFlight(rec: TrainingRecord): boolean {
  return (rec.distanceKm ?? 0) >= LONG_FLIGHT_KM;
}

/** 判定结果同时返回结构化原因与一句话放行原因，供列表和档案展示 */
export function verdictFor(
  ring: string,
  records: TrainingRecord[],
  now: number = Date.now()
): BirdVerdict {
  const all = records
    .filter((r) => r.ring === ring)
    .sort((a, b) => b.flownAt.localeCompare(a.flownAt));

  const weekFlights = all.filter((r) => {
    const t = Date.parse(r.flownAt);
    return Number.isFinite(t) && now - t <= WINDOW_MS;
  });

  // 负荷只计已归巢的里程分，未归巢不产生里程负荷
  const load = round1(weekFlights.reduce((sum, r) => sum + scoreOf(r), 0));
  const weekDistanceKm = round1(
    weekFlights.reduce((s, r) => s + (r.homed ? r.distanceKm ?? 0 : 0), 0)
  );

  const longFlights = all.filter(isLongFlight);
  const latestLong = longFlights[0] ?? null;
  const longRestUntil = latestLong
    ? Date.parse(latestLong.flownAt) + LONG_REST_MS
    : null;

  const reasons: string[] = [];

  // 1) 百公里训放后两天内（取最近一次长训）
  const inLongRest = longRestUntil != null && longRestUntil > now;
  if (inLongRest && latestLong) {
    const days = Math.ceil((longRestUntil! - now) / (24 * 60 * 60 * 1000));
    reasons.push(
      `${latestLong.distanceKm}km 长训后两天休息期内，还差约 ${days} 天放行`
    );
  }

  // 2) 最近七天累计负荷到六分
  if (load >= LOAD_LIMIT) {
    reasons.push(`最近七天累计负荷 ${load} 分，已达 ${LOAD_LIMIT} 分上限`);
  }

  // 3) 最近一次已归巢训放恢复未通过
  const latestRecovered = all.find((r) => r.recovery !== "none");
  if (latestRecovered && latestRecovered.recovery === "failed") {
    reasons.push(`最近恢复评估未通过（${fmtDate(latestRecovered.flownAt)}）`);
  }

  // 4) 有未归巢记录且尚未恢复评估
  const pending = all.find((r) => !r.homed);
  if (pending) {
    reasons.push(`存在未归巢记录（${fmtDate(pending.flownAt)}），先确认归巢与恢复`);
  }

  const blocked = reasons.length > 0;
  const reasonText = blocked
    ? `休息队列：${reasons.join("；")}`
    : weekFlights.length > 0
      ? `最近七天 ${weekFlights.length} 次训放、负荷 ${load} 分，符合放行条件，可参加排行`
      : "近期无训放记录，状态正常，可安排训放";

  let bestSpeedMpm: number | null = null;
  let bestFlight: TrainingRecord | null = null;
  for (const r of all) {
    const v = speedOf(r);
    if (v != null && (bestSpeedMpm == null || v > bestSpeedMpm)) {
      bestSpeedMpm = v;
      bestFlight = r;
    }
  }

  return {
    ring,
    load,
    weekFlightCount: weekFlights.length,
    weekDistanceKm,
    latestLong,
    longRestUntil: inLongRest ? longRestUntil : null,
    weekFlights,
    allFlights: all,
    bestSpeedMpm: bestSpeedMpm == null ? null : round1(bestSpeedMpm),
    bestFlight,
    blocked,
    reasons,
    reasonText,
  };
}

/** 工作台排行：仅放行（未进休息队列）的赛鸽才参加速度和名次排行 */
export function buildRanking(
  records: TrainingRecord[],
  now: number = Date.now()
): Array<{ rank: number; ring: string; speedMpm: number; flight: TrainingRecord; load: number }> {
  const rings = [...new Set(records.map((r) => r.ring))];
  const rows: Array<{ ring: string; speedMpm: number; flight: TrainingRecord; load: number }> = [];
  for (const ring of rings) {
    const v = verdictFor(ring, records, now);
    if (v.blocked || v.bestSpeedMpm == null || !v.bestFlight) continue;
    rows.push({ ring, speedMpm: v.bestSpeedMpm, flight: v.bestFlight, load: v.load });
  }
  rows.sort((a, b) => b.speedMpm - a.speedMpm);
  return rows.map((row, i) => ({ rank: i + 1, ...row }));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(iso)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** datetime-local 输入框用的当前时间值，精确到分钟 */
export function nowLocalInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}
