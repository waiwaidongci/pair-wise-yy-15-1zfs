import { useMemo, useState } from "react";
import { LOAD_WINDOW_DAYS, REST_LOAD_THRESHOLD, daysBetween } from "../domain/judgment";
import type { Judgment, Pigeon, TrainingRecord } from "../domain/types";
import { LoadBar, LoadPill, StatusBadge, formatLongTraining } from "./components";

type Filter = "all" | "cleared" | "rest" | "unhomed";

interface Props {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  judgments: Map<string, Judgment>;
  today: string;
  onOpenProfile: (pigeonId: string) => void;
}

export function OverviewPage({ pigeons, records, judgments, today, onOpenProfile }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    let cleared = 0;
    let rest = 0;
    for (const p of pigeons) {
      const j = judgments.get(p.id);
      if (j?.status === "rest") rest += 1;
      else cleared += 1;
    }
    const unhomed = records.filter(
      (r) => !r.homed && daysBetween(r.date, today) >= 0 && daysBetween(r.date, today) < LOAD_WINDOW_DAYS
    ).length;
    return { cleared, rest, unhomed };
  }, [pigeons, records, judgments, today]);

  const hasUnhomed = (pigeonId: string) =>
    records.some(
      (r) =>
        r.pigeonId === pigeonId &&
        !r.homed &&
        daysBetween(r.date, today) >= 0 &&
        daysBetween(r.date, today) < LOAD_WINDOW_DAYS
    );

  const visible = pigeons.filter((p) => {
    const j = judgments.get(p.id);
    if (filter === "cleared") return j?.status === "cleared";
    if (filter === "rest") return j?.status === "rest";
    if (filter === "unhomed") return hasUnhomed(p.id);
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "cleared", label: "放行中" },
    { key: "rest", label: "休息队列" },
    { key: "unhomed", label: "近7天未归巢" },
  ];

  return (
    <>
      <section className="metrics">
        <article>
          <small>在棚赛鸽</small>
          <strong>{pigeons.length}</strong>
        </article>
        <article>
          <small>可放行</small>
          <strong>{stats.cleared}</strong>
        </article>
        <article>
          <small>休息队列</small>
          <strong>{stats.rest}</strong>
        </article>
        <article>
          <small>近{LOAD_WINDOW_DAYS}天未归巢</small>
          <strong>{stats.unhomed}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>鸽棚总览</p>
            <h2>负荷与放行列表</h2>
          </div>
          <div className="chips">
            {filters.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? "chip-active" : ""}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="rule-note">
          每10公里记1分，按近{LOAD_WINDOW_DAYS}天累计；负荷到{REST_LOAD_THRESHOLD}分、百公里长训后两天内或恢复未通过，只进休息队列。
        </p>

        <div className="pigeon-rows">
          {visible.map((p) => {
            const j = judgments.get(p.id);
            if (!j) return null;
            const unhomed = hasUnhomed(p.id);
            return (
              <article key={p.id} className="pigeon-row" onClick={() => onOpenProfile(p.id)}>
                <div className="pigeon-main">
                  <div className="pigeon-line">
                    <b>{p.band}</b>
                    <span className="muted">{p.name} · {p.bloodline}</span>
                    {unhomed && <span className="badge badge-warn">未归巢</span>}
                  </div>
                  <p className="reason" title={j.reasons.join("；")}>
                    判定说明：{j.reasons.join("；")}
                  </p>
                </div>
                <div className="pigeon-stat">
                  <small>近{LOAD_WINDOW_DAYS}天累计负荷</small>
                  <LoadPill points={j.loadPoints} />
                  <LoadBar points={j.loadPoints} />
                </div>
                <div className="pigeon-stat wide">
                  <small>最近长训</small>
                  <span className="mono">{formatLongTraining(j)}</span>
                </div>
                <div className="pigeon-stat">
                  <small>放行结论</small>
                  <StatusBadge status={j.status} />
                </div>
              </article>
            );
          })}
          {visible.length === 0 && <p className="muted empty">当前筛选下没有赛鸽。</p>}
        </div>
      </section>
    </>
  );
}
