import { todayString } from "../domain/judgment";
import type {
  LoftState,
  RecordRevision,
  TrainingRecord,
} from "../domain/types";

/**
 * 保存层：localStorage 持久化 + 记录增删改。
 * 每次改动都写入修订历史，旧记录仍可查；判定结果由判定层重新计算。
 */

const STORAGE_KEY = "hxyfront-62014/loft-state-v1";

export interface RecordDraft {
  pigeonId: string;
  date: string;
  distanceKm: number;
  minutes: number;
  homed: boolean;
  recoveryPassed: boolean;
  note: string;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (Array.isArray(parsed.pigeons) && Array.isArray(parsed.records)) {
        return {
          pigeons: parsed.pigeons,
          records: parsed.records,
          revisions: Array.isArray(parsed.revisions) ? parsed.revisions : [],
        };
      }
    }
  } catch {
    // 存储不可用时退回种子数据
  }
  return seedState();
}

export function saveState(state: LoftState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储失败不阻塞页面
  }
}

export function resetState(): LoftState {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

function fmtBool(value: boolean, yes: string, no: string): string {
  return value ? yes : no;
}

/** 生成改动摘要，如「距离 60→80km；恢复 通过→未通过」 */
export function summarizeChanges(
  before: TrainingRecord,
  after: TrainingRecord
): string {
  const parts: string[] = [];
  if (before.date !== after.date) parts.push(`日期 ${before.date}→${after.date}`);
  if (before.distanceKm !== after.distanceKm)
    parts.push(`距离 ${before.distanceKm}→${after.distanceKm}km`);
  if (before.minutes !== after.minutes)
    parts.push(`分钟 ${before.minutes}→${after.minutes}`);
  if (before.homed !== after.homed)
    parts.push(
      `归巢 ${fmtBool(before.homed, "归巢", "未归巢")}→${fmtBool(after.homed, "归巢", "未归巢")}`
    );
  if (before.recoveryPassed !== after.recoveryPassed)
    parts.push(
      `恢复 ${fmtBool(before.recoveryPassed, "通过", "未通过")}→${fmtBool(after.recoveryPassed, "通过", "未通过")}`
    );
  if (before.pigeonId !== after.pigeonId) parts.push("足环变更");
  return parts.length > 0 ? parts.join("；") : "无字段变化";
}

/** 新增或更新训放记录，同时写入修订历史 */
export function applyRecordSave(
  state: LoftState,
  draft: RecordDraft,
  recordId?: string
): LoftState {
  const now = new Date().toISOString();

  if (recordId) {
    const before = state.records.find((r) => r.id === recordId);
    if (!before) return state;
    const after: TrainingRecord = { ...before, ...draft };
    const revision: RecordRevision = {
      id: uid(),
      recordId,
      pigeonId: draft.pigeonId,
      changedAt: now,
      changeType: "update",
      before,
      after,
      summary: summarizeChanges(before, after),
    };
    return {
      ...state,
      records: state.records.map((r) => (r.id === recordId ? after : r)),
      revisions: [revision, ...state.revisions],
    };
  }

  const record: TrainingRecord = { id: uid(), createdAt: now, ...draft };
  const revision: RecordRevision = {
    id: uid(),
    recordId: record.id,
    pigeonId: record.pigeonId,
    changedAt: now,
    changeType: "create",
    before: null,
    after: record,
    summary: `新增 ${record.date} ${record.distanceKm}km 训放记录`,
  };
  return {
    ...state,
    records: [record, ...state.records],
    revisions: [revision, ...state.revisions],
  };
}

/** 删除记录：正文移除，修订历史保留旧记录可查 */
export function applyRecordDelete(
  state: LoftState,
  recordId: string
): LoftState {
  const before = state.records.find((r) => r.id === recordId);
  if (!before) return state;
  const revision: RecordRevision = {
    id: uid(),
    recordId,
    pigeonId: before.pigeonId,
    changedAt: new Date().toISOString(),
    changeType: "delete",
    before,
    after: null,
    summary: `删除 ${before.date} ${before.distanceKm}km 训放记录`,
  };
  return {
    ...state,
    records: state.records.filter((r) => r.id !== recordId),
    revisions: [revision, ...state.revisions],
  };
}

/** 种子数据：日期相对今天生成，保证各判定分支都有样例 */
function seedState(): LoftState {
  const today = todayString();
  const d = (offset: number): string => {
    const t = new Date(`${today}T00:00:00`);
    t.setDate(t.getDate() - offset);
    return todayString(t);
  };

  const pigeons = [
    { id: "p-001839", band: "CHN-2024-001839", name: "蓝箭", bloodline: "詹森系" },
    { id: "p-002114", band: "CHN-2024-002114", name: "灰影", bloodline: "凡龙系" },
    { id: "p-008771", band: "CHN-2023-008771", name: "老班鸠", bloodline: "慕利门系" },
    { id: "p-003320", band: "CHN-2024-003320", name: "白眉", bloodline: "杨阿腾系" },
    { id: "p-005566", band: "CHN-2023-005566", name: "小点子", bloodline: "詹森系" },
    { id: "p-007008", band: "CHN-2024-007008", name: "西风", bloodline: "凡龙系" },
    { id: "p-000215", band: "CHN-2025-000215", name: "春苗", bloodline: "杨阿腾系" },
  ];

  const now = new Date().toISOString();
  const rec = (
    id: string,
    pigeonId: string,
    date: string,
    distanceKm: number,
    minutes: number,
    homed: boolean,
    recoveryPassed: boolean,
    note = ""
  ): TrainingRecord => ({
    id,
    pigeonId,
    date,
    distanceKm,
    minutes,
    homed,
    recoveryPassed,
    note,
    createdAt: now,
  });

  const records: TrainingRecord[] = [
    // 蓝箭：昨天百公里长训 → 两天内休息
    rec("r-01", "p-001839", d(1), 100, 92, true, true, "百公里拉练"),
    rec("r-02", "p-001839", d(9), 60, 55, true, true),
    // 灰影：近七天两趟30km → 负荷6分休息
    rec("r-03", "p-002114", d(2), 30, 29, true, true),
    rec("r-04", "p-002114", d(5), 30, 27, true, true),
    // 老班鸠：恢复未通过 → 休息（负荷也到6分）
    rec("r-05", "p-008771", d(3), 60, 58, true, false, "归巢后状态差"),
    // 白眉：低负荷 → 放行
    rec("r-06", "p-003320", d(2), 20, 18, true, true),
    // 小点子：负荷4分 → 放行
    rec("r-07", "p-005566", d(6), 40, 39, true, true),
    // 西风：负荷5分 → 放行
    rec("r-08", "p-007008", d(4), 50, 47, true, true),
    rec("r-09", "p-007008", d(12), 80, 74, true, true),
    // 春苗：未归巢且恢复未通过 → 休息
    rec("r-10", "p-000215", d(2), 30, 0, false, false, "当日未归"),
  ];

  return { pigeons, records, revisions: [] };
}
