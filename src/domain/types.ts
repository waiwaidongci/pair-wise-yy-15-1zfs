/** 数据模型：鸽棚、训放记录、修订历史与判定结果 */

export interface Pigeon {
  id: string;
  /** 足环号 */
  band: string;
  /** 呼名 */
  name: string;
  /** 血统 */
  bloodline: string;
}

export interface TrainingRecord {
  id: string;
  pigeonId: string;
  /** 放飞日期 YYYY-MM-DD */
  date: string;
  /** 放飞距离（公里） */
  distanceKm: number;
  /** 飞行分钟，未归巢记 0 */
  minutes: number;
  /** 是否归巢 */
  homed: boolean;
  /** 恢复检查是否通过 */
  recoveryPassed: boolean;
  note: string;
  createdAt: string;
}

export type ChangeType = "create" | "update" | "delete";

/** 修订历史：改距离、时间或恢复结论后，旧记录仍可查 */
export interface RecordRevision {
  id: string;
  recordId: string;
  pigeonId: string;
  changedAt: string;
  changeType: ChangeType;
  before: TrainingRecord | null;
  after: TrainingRecord | null;
  /** 改动摘要，如「距离 60→80km；恢复 通过→未通过」 */
  summary: string;
}

export interface LoftState {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  revisions: RecordRevision[];
}

export type ClearanceStatus = "cleared" | "rest";

/** 单羽放行判定结果 */
export interface Judgment {
  pigeonId: string;
  status: ClearanceStatus;
  /** 最近七天累计负荷分 */
  loadPoints: number;
  /** 计入负荷的窗口内记录 */
  windowRecords: TrainingRecord[];
  /** 最近一次百公里长训 */
  lastLongTraining: {
    date: string;
    distanceKm: number;
    daysSince: number;
  } | null;
  /** 窗口内最近一次恢复结论 */
  lastRecovery: {
    date: string;
    passed: boolean;
  } | null;
  /** 放行/休息原因说明 */
  reasons: string[];
}
