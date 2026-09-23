// 保存层：localStorage 持久化 + 修订留痕。
// 判定只读这份数据；改距离、时间或恢复结论时保存旧值快照，旧记录仍可查。

import type { EditableFields, RecordDraft, Revision, TrainingRecord } from "../types";

const STORAGE_KEY = "pigeon-loft-training-v1";

export interface StoreState {
  records: TrainingRecord[];
}

export function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as StoreState;
    if (!Array.isArray(parsed.records)) return seedState();
    return { records: parsed.records.map(withRevisions) };
  } catch {
    return seedState();
  }
}

export function saveState(state: StoreState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let seq = 0;
export function makeId(): string {
  seq += 1;
  return `r-${Date.now().toString(36)}-${seq}`;
}

export function createRecord(draft: RecordDraft): TrainingRecord {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    ring: draft.ring.trim().toUpperCase(),
    flownAt: new Date(draft.flownAt).toISOString(),
    distanceKm: draft.homed ? numOrNull(draft.distanceKm) : null,
    minutes: draft.homed ? numOrNull(draft.minutes) : null,
    homed: draft.homed,
    recovery: draft.homed ? draft.recovery : "none",
    note: draft.note?.trim() || undefined,
    revisions: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** 修订关键判定字段时留存旧值，供单羽档案查看 */
export function reviseRecord(
  rec: TrainingRecord,
  patch: Partial<EditableFields> & { note?: string; flownAt?: string }
): TrainingRecord {
  const nextFlownAt = patch.flownAt ? new Date(patch.flownAt).toISOString() : rec.flownAt;
  const nextDistance = patch.homed === false ? null : (patch.distanceKm ?? rec.distanceKm);
  const nextMinutes = patch.homed === false ? null : (patch.minutes ?? rec.minutes);
  const nextHomed = patch.homed ?? rec.homed;
  const nextRecovery = nextHomed ? (patch.recovery ?? rec.recovery) : "none";

  const changed =
    nextFlownAt !== rec.flownAt ||
    nextDistance !== rec.distanceKm ||
    nextMinutes !== rec.minutes ||
    nextHomed !== rec.homed ||
    nextRecovery !== rec.recovery;

  const revisions = [...rec.revisions];
  if (changed) {
    const rev: Revision = {
      at: new Date().toISOString(),
      reason: describeChange(rec, {
        flownAt: nextFlownAt,
        distanceKm: nextDistance,
        minutes: nextMinutes,
        homed: nextHomed,
        recovery: nextRecovery,
      }),
      flownAt: rec.flownAt,
      distanceKm: rec.distanceKm,
      minutes: rec.minutes,
      recovery: rec.recovery,
    };
    revisions.push(rev);
  }

  return {
    ...rec,
    flownAt: nextFlownAt,
    distanceKm: nextDistance,
    minutes: nextMinutes,
    homed: nextHomed,
    recovery: nextRecovery,
    note: patch.note !== undefined ? patch.note.trim() || undefined : rec.note,
    revisions,
    updatedAt: new Date().toISOString(),
  };
}

function describeChange(
  before: TrainingRecord,
  after: EditableFields & { flownAt: string }
): string {
  const parts: string[] = [];
  if (after.flownAt !== before.flownAt) {
    parts.push(`放飞时间 ${before.flownAt} → ${after.flownAt}`);
  }
  if (after.distanceKm !== before.distanceKm) {
    parts.push(`距离 ${before.distanceKm ?? "—"}km → ${after.distanceKm ?? "—"}km`);
  }
  if (after.minutes !== before.minutes) {
    parts.push(`分钟 ${before.minutes ?? "—"} → ${after.minutes ?? "—"}`);
  }
  if (after.homed !== before.homed) {
    parts.push(`归巢 ${before.homed ? "是" : "否"} → ${after.homed ? "是" : "否"}`);
  }
  if (after.recovery !== before.recovery) {
    parts.push(`恢复结论 ${before.recovery} → ${after.recovery}`);
  }
  return parts.join("；") || "字段修订";
}

function numOrNull(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return v;
}

function withRevisions(r: TrainingRecord): TrainingRecord {
  return { ...r, revisions: Array.isArray(r.revisions) ? r.revisions : [] };
}

/** 内置几条训放样例（相对今天排布，便于直接看到负荷与休息判定） */
function seedState(): StoreState {
  const iso = (d: Date) => d.toISOString();
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const at = (offsetDays: number, h: number, m: number) => {
    const d = new Date(now - offsetDays * day);
    d.setHours(h, m, 0, 0);
    return iso(d);
  };

  const records: TrainingRecord[] = [
    {
      id: makeId(),
      ring: "CHN-24-001839",
      flownAt: at(1, 7, 30),
      distanceKm: 110,
      minutes: 95,
      homed: true,
      recovery: "passed",
      note: "百公里长训，晴",
      revisions: [],
      createdAt: at(1, 9, 0),
      updatedAt: at(1, 9, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-001839",
      flownAt: at(4, 7, 0),
      distanceKm: 50,
      minutes: 46,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(4, 8, 30),
      updatedAt: at(4, 8, 30),
    },
    {
      id: makeId(),
      ring: "CHN-24-002114",
      flownAt: at(2, 7, 15),
      distanceKm: 40,
      minutes: 42,
      homed: true,
      recovery: "failed",
      note: "归巢延迟，肌肉恢复不佳",
      revisions: [],
      createdAt: at(2, 9, 0),
      updatedAt: at(2, 9, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-002114",
      flownAt: at(5, 7, 0),
      distanceKm: 30,
      minutes: 27,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(5, 8, 0),
      updatedAt: at(5, 8, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-003620",
      flownAt: at(3, 7, 0),
      distanceKm: 20,
      minutes: 17,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(3, 8, 0),
      updatedAt: at(3, 8, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-003620",
      flownAt: at(5, 6, 50),
      distanceKm: 20,
      minutes: 18,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(5, 8, 0),
      updatedAt: at(5, 8, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-003620",
      flownAt: at(6, 6, 40),
      distanceKm: 30,
      minutes: 26,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(6, 8, 0),
      updatedAt: at(6, 8, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-004502",
      flownAt: at(2, 7, 10),
      distanceKm: 40,
      minutes: 35,
      homed: true,
      recovery: "passed",
      note: "状态稳定",
      revisions: [],
      createdAt: at(2, 9, 0),
      updatedAt: at(2, 9, 0),
    },
    {
      id: makeId(),
      ring: "CHN-24-005233",
      flownAt: at(3, 7, 5),
      distanceKm: 25,
      minutes: 20,
      homed: true,
      recovery: "passed",
      revisions: [],
      createdAt: at(3, 8, 30),
      updatedAt: at(3, 8, 30),
    },
    {
      id: makeId(),
      ring: "CHN-23-008771",
      flownAt: at(1, 8, 0),
      distanceKm: null,
      minutes: null,
      homed: false,
      recovery: "none",
      note: "80km 放飞未归巢，待查",
      revisions: [],
      createdAt: at(1, 12, 0),
      updatedAt: at(1, 12, 0),
    },
  ];

  return { records };
}
