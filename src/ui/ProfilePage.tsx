import { useMemo } from "react";
import {
  LOAD_WINDOW_DAYS,
  LONG_TRAINING_KM,
  LONG_TRAINING_REST_DAYS,
  REST_LOAD_THRESHOLD,
  recordPoints,
  speedMpm,
} from "../domain/judgment";
import type { Judgment, Pigeon, RecordRevision, TrainingRecord } from "../domain/types";
import { LoadBar, LoadPill, StatusBadge, formatDateTime, recordLine } from "./components";

interface Props {
  pigeon: Pigeon;
  records: TrainingRecord[];
  revisions: RecordRevision[];
  judgment: Judgment;
  onBack: () => void;
}

const CHANGE_LABEL: Record<RecordRevision["changeType"], string> = {
  create: "新增",
  update: "修改",
  delete: "删除",
};

export function ProfilePage({ pigeon, records, revisions, judgment, onBack }: Props) {
  const own = useMemo(
    () =>
      records
        .filter((r) => r.pigeonId === pigeon.id)
        .sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1
        ),
    [records, pigeon.id]
  );

  const ownRevisions = useMemo(
    () =>
      revisions
        .filter((rev) => rev.pigeonId === pigeon.id)
        .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1)),
    [revisions, pigeon.id]
  );

  return (
    <div className="profile">
      <div className="panel profile-head">
        <button className="back" onClick={onBack}>← 返回列表</button>
        <div className="profile-title">
          <div>
            <p>单羽赛鸽档案</p>
            <h2>{pigeon.band} · {pigeon.name}</h2>
            <span className="muted">{pigeon.bloodline} · 训放记录 {own.length} 条</span>
          </div>
          <StatusBadge status={judgment.status} />
        </div>
      </div>

      <section className="profile-cards">
        <article className="panel">
          <small>近{LOAD_WINDOW_DAYS}天累计负荷</small>
          <div className="stat-line">
            <strong className={judgment.loadPoints >= REST_LOAD_THRESHOLD ? "hot-text" : ""}>
              {judgment.loadPoints}
            </strong>
            <span className="muted">分 / 上限 {REST_LOAD_THRESHOLD} 分</span>
          </div>
          <LoadBar points={judgment.loadPoints} />
          <p className="muted small">窗口内 {judgment.windowRecords.length} 趟训放参与计分</p>
        </article>

        <article className="panel">
          <small>最近长训（≥{LONG_TRAINING_KM}km）</small>
          {judgment.lastLongTraining ? (
            <>
              <div className="stat-line">
                <strong>{judgment.lastLongTraining.distanceKm}</strong>
                <span className="muted">km · {judgment.lastLongTraining.date}</span>
              </div>
              <p className="muted small">
                距今第 {judgment.lastLongTraining.daysSince} 天，
                {judgment.lastLongTraining.daysSince <= LONG_TRAINING_REST_DAYS
                  ? `仍在${LONG_TRAINING_REST_DAYS}天休息期内`
                  : `已过${LONG_TRAINING_REST_DAYS}天休息期`}
              </p>
            </>
          ) : (
            <div className="stat-line"><strong className="muted">无</strong></div>
          )}
        </article>

        <article className="panel">
          <small>放行原因</small>
          <ul className={`reason-list ${judgment.status === "rest" ? "rest-reasons" : "clear-reasons"}`}>
            {judgment.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>训放历史</p>
            <h2>{pigeon.name} 的全部训放</h2>
          </div>
          <LoadPill points={judgment.loadPoints} />
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th className="num">距离</th>
                <th className="num">分钟</th>
                <th className="num">均速</th>
                <th>归巢</th>
                <th>恢复</th>
                <th>负荷</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {own.map((r) => {
                const speed = speedMpm(r);
                const inWindow = judgment.windowRecords.some((w) => w.id === r.id);
                return (
                  <tr key={r.id} className={inWindow ? "" : "dim-row"}>
                    <td className="mono">{r.date}{inWindow && <small className="block muted">计入近7天</small>}</td>
                    <td className="num">{r.distanceKm}km</td>
                    <td className="num">{r.homed ? r.minutes : "—"}</td>
                    <td className="num">{speed !== null ? speed.toLocaleString() : "—"}</td>
                    <td>{r.homed ? "归巢" : <span className="badge badge-warn">未归巢</span>}</td>
                    <td>{r.recoveryPassed ? "通过" : <span className="badge badge-outline">未通过</span>}</td>
                    <td className="num">{recordPoints(r.distanceKm)}分</td>
                    <td className="muted">{r.note || "—"}</td>
                  </tr>
                );
              })}
              {own.length === 0 && (
                <tr><td colSpan={8} className="muted empty">还没有训放记录。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>变更历史</p>
            <h2>旧记录仍可查</h2>
          </div>
          <span className="muted">{ownRevisions.length} 条</span>
        </div>
        <div className="rev-list">
          {ownRevisions.map((rev) => (
            <article key={rev.id} className="rev-item">
              <div className="rev-head">
                <span className={`badge badge-rev-${rev.changeType}`}>{CHANGE_LABEL[rev.changeType]}</span>
                <b>{rev.summary}</b>
                <small className="muted">{formatDateTime(rev.changedAt)}</small>
              </div>
              {rev.before && (
                <p className="rev-line rev-before">原记录：{rev.before.date} · {recordLine(rev.before)}</p>
              )}
              {rev.after && (
                <p className="rev-line rev-after">新记录：{rev.after.date} · {recordLine(rev.after)}</p>
              )}
            </article>
          ))}
          {ownRevisions.length === 0 && <p className="muted empty">还没有修订记录；修改距离、分钟或恢复结论后会留存在这里。</p>}
        </div>
      </section>
    </div>
  );
}
