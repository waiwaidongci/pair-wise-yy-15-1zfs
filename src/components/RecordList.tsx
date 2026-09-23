import type { TrainingRecord } from "../types";
import { fmtDateTime, RECOVERY_LABEL, speedOf } from "../lib/rules";

interface Props {
  records: TrainingRecord[]; // 已按时间倒序
  onEdit: (rec: TrainingRecord) => void;
  onOpenBird: (ring: string) => void;
}

/** 训放记录列表：展示累计负荷由总览/档案承担，这里展示每条记录与修订痕迹 */
export default function RecordList({ records, onEdit, onOpenBird }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>全部记录</p>
          <h2>训放台账（{records.length}）</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table className="grid-table record-table">
          <thead>
            <tr>
              <th>放飞时间</th>
              <th>足环号</th>
              <th>距离</th>
              <th>分钟</th>
              <th>分速 m/min</th>
              <th>归巢 / 恢复</th>
              <th>修订</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const speed = speedOf(r);
              return (
                <tr key={r.id} className={r.homed ? "" : "row-warn"}>
                  <td>{fmtDateTime(r.flownAt)}</td>
                  <td>
                    <button className="link-btn" onClick={() => onOpenBird(r.ring)}>
                      {r.ring}
                    </button>
                    {r.note ? <small className="row-note">{r.note}</small> : null}
                  </td>
                  <td>{r.homed ? `${r.distanceKm} km` : "—"}</td>
                  <td>{r.homed ? r.minutes : "—"}</td>
                  <td>{speed == null ? "—" : speed.toFixed(1)}</td>
                  <td>
                    <span className={`tag ${r.homed ? "tag-ok" : "tag-warn"}`}>
                      {r.homed ? "已归巢" : "未归巢"}
                    </span>
                    {r.homed ? (
                      <span
                        className={`tag ${
                          r.recovery === "passed"
                            ? "tag-ok"
                            : r.recovery === "failed"
                              ? "tag-bad"
                              : "tag-idle"
                        }`}
                      >
                        {RECOVERY_LABEL[r.recovery]}
                      </span>
                    ) : null}
                  </td>
                  <td>{r.revisions.length > 0 ? `${r.revisions.length} 次` : "—"}</td>
                  <td>
                    <button className="ghost-btn" onClick={() => onEdit(r)}>
                      修订
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-foot">
        改距离、时间或恢复结论后，旧值自动留痕，可在单羽档案中逐条查看；后续排训按新值重新判定。
      </p>
    </section>
  );
}
