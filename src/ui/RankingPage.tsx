import { useMemo } from "react";
import { bestSpeedEntry, LOAD_WINDOW_DAYS } from "../domain/judgment";
import type { Judgment, Pigeon, TrainingRecord } from "../domain/types";
import { LoadPill } from "./components";

interface Props {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  judgments: Map<string, Judgment>;
  onOpenProfile: (pigeonId: string) => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankingPage({ pigeons, records, judgments, onOpenProfile }: Props) {
  const ranking = useMemo(() => {
    return pigeons
      .map((p) => ({ pigeon: p, judgment: judgments.get(p.id) }))
      .filter((item) => item.judgment?.status === "cleared")
      .map((item) => ({ ...item, entry: bestSpeedEntry(item.pigeon.id, records) }))
      .filter((item) => item.entry !== null)
      .sort((a, b) => (b.entry?.bestSpeedMpm ?? 0) - (a.entry?.bestSpeedMpm ?? 0));
  }, [pigeons, records, judgments]);

  const resting = useMemo(
    () =>
      pigeons
        .map((p) => ({ pigeon: p, judgment: judgments.get(p.id) }))
        .filter((item) => item.judgment?.status === "rest"),
    [pigeons, judgments]
  );

  return (
    <section className="split-layout">
      <div className="panel">
        <div className="heading">
          <div>
            <p>速度排行</p>
            <h2>历史最佳均速榜</h2>
          </div>
        </div>
        <p className="rule-note">按历史最佳均速排名；休息队列中的赛鸽不参加速度和名次排行。</p>
        <table className="table">
          <thead>
            <tr>
              <th>名次</th>
              <th>足环 / 呼名</th>
              <th>血统</th>
              <th className="num">最佳均速</th>
              <th>最佳记录</th>
              <th className="num">近{LOAD_WINDOW_DAYS}天负荷</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item, index) => (
              <tr key={item.pigeon.id} onClick={() => onOpenProfile(item.pigeon.id)} className="clickable">
                <td className="rank-cell">
                  <span className="rank-no">{MEDALS[index] ?? index + 1}</span>
                </td>
                <td>
                  <b>{item.pigeon.band}</b>
                  <small className="muted block">{item.pigeon.name}</small>
                </td>
                <td>{item.pigeon.bloodline}</td>
                <td className="num strong">{item.entry?.bestSpeedMpm.toLocaleString()} m/min</td>
                <td className="muted">
                  {item.entry?.best.date} · {item.entry?.best.distanceKm}km
                  <small className="block">归巢 {item.entry?.best.minutes} 分钟 · 共{item.entry?.homedCount}趟成绩</small>
                </td>
                <td className="num"><LoadPill points={item.judgment?.loadPoints ?? 0} /></td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={6} className="muted empty">暂无可排行的赛鸽。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel rest-panel">
        <div className="heading">
          <div>
            <p>休息队列</p>
            <h2>本轮不排训</h2>
          </div>
          <span className="badge badge-rest">{resting.length} 羽</span>
        </div>
        <div className="rest-list">
          {resting.map(({ pigeon, judgment }) => (
            <article key={pigeon.id} className="rest-card" onClick={() => onOpenProfile(pigeon.id)}>
              <div className="pigeon-line">
                <b>{pigeon.band}</b>
                <span className="muted">{pigeon.name}</span>
                <LoadPill points={judgment?.loadPoints ?? 0} />
              </div>
              <ul className="reason-list">
                {judgment?.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </article>
          ))}
          {resting.length === 0 && <p className="muted empty">没有赛鸽在休息队列。</p>}
        </div>
      </div>
    </section>
  );
}
