// 数据模型：训放记录、修订留痕与鸽群档案

/** 恢复结论 */
export type Recovery = "passed" | "failed" | "none";

/** 旧版记录快照：改距离、时间或恢复结论时留存，旧记录仍可查 */
export interface Revision {
  at: string; // ISO 修订时间
  reason: string; // 修订原因
  flownAt: string; // 旧放飞时间 ISO
  distanceKm: number | null;
  minutes: number | null;
  recovery: Recovery;
}

/** 一条训放记录（足环、距离、分钟、归巢和恢复） */
export interface TrainingRecord {
  id: string;
  ring: string; // 足环号
  flownAt: string; // 放飞时间 ISO
  distanceKm: number | null; // 距离（公里），未归巢时可为空
  minutes: number | null; // 飞行分钟，未归巢时为空
  homed: boolean; // 是否归巢
  recovery: Recovery; // 恢复结论：未归巢为 none
  note?: string;
  revisions: Revision[];
  createdAt: string;
  updatedAt: string;
}

/** 允许修改的字段：改距离、时间或恢复结论后后续排训重新判定 */
export type EditableFields = Pick<
  TrainingRecord,
  "distanceKm" | "minutes" | "homed" | "recovery"
>;

/** 新增记录表单提交的载荷 */
export interface RecordDraft extends EditableFields {
  ring: string;
  flownAt: string;
  note?: string;
}

/** 单羽档案汇总（判定层输出，页面只负责展示） */
export interface BirdVerdict {
  ring: string;
  load: number; // 最近七天累计负荷（分）
  weekFlightCount: number;
  weekDistanceKm: number;
  latestLong: TrainingRecord | null; // 最近长训（>=100km）
  longRestUntil: number | null; // 长训后两天休息窗口截止（epoch ms）
  weekFlights: TrainingRecord[];
  allFlights: TrainingRecord[];
  bestSpeedMpm: number | null; // 历史最佳分速 m/min
  bestFlight: TrainingRecord | null;
  blocked: boolean; // true = 只进休息队列
  reasons: string[]; // 结构化放行/拦截原因
  reasonText: string; // 放行原因（一句话）
}
