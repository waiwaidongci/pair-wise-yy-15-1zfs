import type { BirdVerdict } from "../types";
import { fmtDate, fmtDateTime, RECOVERY_LABEL, speedOf } from "../lib/rules";

interface Props {
  verdict: BirdVerdict;
  onClose: () => void;
  onEdit: (id: string) => void;
}

/** 单羽档案：累计负荷、最近长训、放行原因、全部旧记录（含修订留痕） */
export default function BirdProfile({ verdict, onClose, onEdit }: Props) {
  const v = verdict;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <p>单羽档案</p>
            <h2>{v.ring}</h2>
          </div>
          <button className="ghost-btn" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="profile-summary">
          <div className="summary-box">
            <small>最近七天累计负荷</small>
            <strong className={v.blocked && v.load >= 6 ? "num-warn" : ""}>
              {v.load} 分
            </strong>
            <span>
              {v.weekFlightCount} 次训放 · {v.weekDistanceKm} km
            </span>
          </div>
          <div className="summary-box">
            <small>最近长训（≥100km）</small>
            <strong>{v.latestLong ? `${v.latestLong.distanceKm} km` : "无"}</strong>
            <span>
              {v.latestLong ? fmtDateTime(v.latestLong.flownAt) : "近七天或更早均无长训"}
            </span>
          </div>
          <div className="summary-box">
            <small>历史最佳分速</small>
            <strong>{v.bestSpeedMpm == null ? "—" : `${v.bestSpeedMpm} m/min`}</strong>
            <span>
              {v.bestFlight
                ? `${v.bestFlight.distanceKm}km · ${fmtDate(v.bestFlight.flownAt)}`
                : "暂无可计算成绩"}
            </span>
          </div>
          <div className={`summary-box ${v.blocked ? "box-rest" : "box-go"}`}>
            <small>当前放行结论</small>
            <strong>{v.blocked ? "休息队列" : "可放行"}</strong>
            <span>{v.reasonText}</span>
          </div>
        </div>

        <h3 className="section-label">全部训放与旧记录（{v.allFlights.length}）</h3>
        <div className="history-list">
          {v.allFlights.map((r) => (
            <article key={r.id} className="history-item">
              <header>
                <div>
                  <b>{fmtDateTime(r.flownAt)}</b>
                  {r.homed ? (
                    <>
                      {" "}
                      · {r.distanceKm}km · {r.minutes} 分钟 ·{" "}
                      {speedOf(r)?.toFixed(1)} m/min
                    </>
                  ) : (
                    <> · 未归巢</>
                  )}
                </div>
                <div className="history-tags">
                  <span className={`tag ${r.homed ? "tag-ok" : "tag-warn"}`}>
                    {r.homed ? "已归巢" : "未归巢"}
                  </span>
                  {r.homed && (
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
                  )}
                  <button className="ghost-btn" onClick={() => onEdit(r.id)}>
                    修订
                  </button>
                </div>
              </header>
              {r.note && <p className="history-note">{r.note}</p>}
              {r.revisions.length > 0 && (
                <details className="revisions">
                  <summary>旧记录留痕（{r.revisions.length} 次修订，仍可查）</summary>
                  <ul>
                    {r.revisions.map((rev, i) => (
                      <li key={i}>
                        <b>{fmtDateTime(rev.at)}</b> — {rev.reason}
                        <div className="rev-old">
                          旧值：{fmtDateTime(rev.flownAt)} · 距离{" "}
                          {rev.distanceKm ?? "—"}km · 分钟 {rev.minutes ?? "—"} ·{" "}
                          {RECOVERY_LABEL[rev.recovery]}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
