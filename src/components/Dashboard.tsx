import type { BirdVerdict, TrainingRecord } from "../types";
import { buildRanking, fmtDate, fmtDateTime } from "../lib/rules";

interface Props {
  verdicts: BirdVerdict[];
  records: TrainingRecord[];
  now: number;
  onOpenBird: (ring: string) => void;
}

/** 鸽棚总览：累计负荷、休息队列、速度与名次排行（休息队列不参加排行） */
export default function Dashboard({ verdicts, records, now, onOpenBird }: Props) {
  const ranking = buildRanking(records, now);
  const resting = verdicts.filter((v) => v.blocked);
  const flying = verdicts.filter((v) => !v.blocked);
  const homedCount = records.filter((r) => r.homed).length;
  const homedRate = records.length ? Math.round((homedCount / records.length) * 100) : 0;
  const missing = new Set(records.filter((r) => !r.homed).map((r) => r.ring)).size;

  return (
    <>
      <section className="metrics">
        <article>
          <small>在棚赛鸽</small>
          <strong>{verdicts.length}</strong>
        </article>
        <article>
          <small>休息队列</small>
          <strong className={resting.length ? "num-warn" : ""}>{resting.length}</strong>
        </article>
        <article>
          <small>归巢率（全部记录）</small>
          <strong>{homedRate}%</strong>
        </article>
        <article>
          <small>未归巢在追</small>
          <strong className={missing ? "num-warn" : ""}>{missing}</strong>
        </article>
      </section>

      <section className="workspace dashboard-grid">
        <section className="panel queue-panel">
          <div className="heading">
            <div>
              <p>放行台</p>
              <h2>休息队列（{resting.length}）</h2>
            </div>
          </div>
          <p className="panel-hint">
            百公里训放后两天内、最近七天负荷 ≥ 6 分、恢复未通过或有未归巢记录的赛鸽，
            只进休息队列，不参加速度和名次排行。
          </p>
          <div className="bird-cards">
            {resting.length === 0 && <p className="empty">当前没有需要休息的赛鸽。</p>}
            {resting.map((v) => (
              <BirdCard key={v.ring} v={v} onOpenBird={onOpenBird} blocked />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>放行台</p>
              <h2>可放行（{flying.length}）</h2>
            </div>
          </div>
          <div className="bird-cards">
            {flying.length === 0 && <p className="empty">暂无符合放行条件的赛鸽。</p>}
            {flying.map((v) => (
              <BirdCard key={v.ring} v={v} onOpenBird={onOpenBird} blocked={false} />
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>训放成绩</p>
            <h2>速度与名次排行</h2>
          </div>
        </div>
        <p className="panel-hint">
          取每羽历史最佳分速排名；休息队列中的赛鸽已自动排除。
        </p>
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环号</th>
                <th>最佳分速 m/min</th>
                <th>出自训放</th>
                <th>七天负荷</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.ring}>
                  <td>
                    <span className={`rank rank-${row.rank}`}>{row.rank}</span>
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => onOpenBird(row.ring)}>
                      {row.ring}
                    </button>
                  </td>
                  <td>{row.speedMpm.toFixed(1)}</td>
                  <td>
                    {fmtDateTime(row.flight.flownAt)} · {row.flight.distanceKm}km
                  </td>
                  <td>{row.load} 分</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    当前可排行赛鸽为空。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BirdCard({
  v,
  blocked,
  onOpenBird,
}: {
  v: BirdVerdict;
  blocked: boolean;
  onOpenBird: (ring: string) => void;
}) {
  return (
    <article className={`bird-card ${blocked ? "is-rest" : "is-go"}`}>
      <div className="bird-card-head">
        <button className="link-btn ring-link" onClick={() => onOpenBird(v.ring)}>
          {v.ring}
        </button>
        <span className={`tag ${blocked ? "tag-bad" : "tag-ok"}`}>
          {blocked ? "休息" : "放行"}
        </span>
      </div>
      <div className="bird-stats">
        <span>
          七天负荷 <b>{v.load}</b> 分
        </span>
        <span>
          最近长训{" "}
          <b>{v.latestLong ? `${v.latestLong.distanceKm}km · ${fmtDate(v.latestLong.flownAt)}` : "无"}</b>
        </span>
      </div>
      <ul className="reason-list">
        {(blocked ? v.reasons : [v.reasonText]).map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </article>
  );
}
