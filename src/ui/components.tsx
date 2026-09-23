import type { ClearanceStatus, Judgment, Pigeon, TrainingRecord } from "../domain/types";
import { REST_LOAD_THRESHOLD } from "../domain/judgment";

export function StatusBadge({ status }: { status: ClearanceStatus }) {
  return status === "cleared" ? (
    <span className="badge badge-clear">放行</span>
  ) : (
    <span className="badge badge-rest">休息队列</span>
  );
}

export function LoadPill({ points }: { points: number }) {
  return (
    <span className={points >= REST_LOAD_THRESHOLD ? "load load-hot" : "load"}>
      {points}分
    </span>
  );
}

export function LoadBar({ points }: { points: number }) {
  const pct = Math.min(100, (points / REST_LOAD_THRESHOLD) * 100);
  return (
    <div className="loadbar" title={`累计负荷 ${points} 分，${REST_LOAD_THRESHOLD} 分进入休息队列`}>
      <div className={points >= REST_LOAD_THRESHOLD ? "loadbar-fill hot" : "loadbar-fill"} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PigeonTag({ pigeon }: { pigeon: Pigeon }) {
  return (
    <span className="pigeon-tag">
      <b>{pigeon.band}</b>
      <small>{pigeon.name} · {pigeon.bloodline}</small>
    </span>
  );
}

export function formatLongTraining(j: Judgment): string {
  if (!j.lastLongTraining) return "无百公里长训";
  return `${j.lastLongTraining.distanceKm}km · ${j.lastLongTraining.date}（第${j.lastLongTraining.daysSince}天）`;
}

export function recordLine(r: TrainingRecord | null): string {
  if (!r) return "（无记录）";
  return [
    `${r.distanceKm}km`,
    r.homed ? `${r.minutes}分钟归巢` : "未归巢",
    `恢复${r.recoveryPassed ? "通过" : "未通过"}`,
  ].join(" · ");
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
