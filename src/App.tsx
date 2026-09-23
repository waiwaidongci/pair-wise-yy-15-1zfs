import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { judgePigeon, todayString } from "./domain/judgment";
import type { Judgment, LoftState, TrainingRecord } from "./domain/types";
import {
  applyRecordDelete,
  applyRecordSave,
  loadState,
  resetState,
  saveState,
  type RecordDraft,
} from "./store/repository";
import { OverviewPage } from "./ui/OverviewPage";
import { ProfilePage } from "./ui/ProfilePage";
import { RankingPage } from "./ui/RankingPage";
import { RecordsPage } from "./ui/RecordsPage";

type View =
  | { page: "overview" }
  | { page: "ranking" }
  | { page: "records" }
  | { page: "profile"; pigeonId: string };

const TABS: { key: View["page"]; label: string }[] = [
  { key: "overview", label: "鸽棚总览" },
  { key: "ranking", label: "休息与排行" },
  { key: "records", label: "训放记录" },
];

function App() {
  const [state, setState] = useState<LoftState>(loadState);
  const [view, setView] = useState<View>({ page: "overview" });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const today = todayString();

  /** 判定层结果由记录派生：记录一改，后续排训自动重新判定 */
  const judgments = useMemo(() => {
    const map = new Map<string, Judgment>();
    for (const p of state.pigeons) {
      map.set(p.id, judgePigeon(p.id, state.records, today));
    }
    return map;
  }, [state.pigeons, state.records, today]);

  function openProfile(pigeonId: string) {
    setView({ page: "profile", pigeonId });
  }

  function handleSave(draft: RecordDraft, recordId?: string): Judgment | null {
    const next = applyRecordSave(state, draft, recordId);
    setState(next);
    return judgePigeon(draft.pigeonId, next.records, today);
  }

  function handleDelete(record: TrainingRecord): Judgment | null {
    const next = applyRecordDelete(state, record.id);
    setState(next);
    return judgePigeon(record.pigeonId, next.records, today);
  }

  function handleReset() {
    if (!window.confirm("恢复出厂示例数据？当前所有记录与变更历史将被清除。")) return;
    setState(resetState());
    setView({ page: "overview" });
  }

  const activeTab = view.page === "profile" ? "" : view.page;
  const profilePigeon =
    view.page === "profile"
      ? state.pigeons.find((p) => p.id === view.pigeonId)
      : undefined;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62014 · 训放负荷与休息放行台</p>
        <h1>赛鸽训放负荷管理</h1>
        <span>
          每10公里记1分，按最近7天累计；百公里训放后两天内、负荷到6分或恢复未通过时，只进休息队列，不参加速度和名次排行。
          修改距离、时间或恢复结论后，后续排训重新判定，旧记录保留在单羽档案中可查。
        </span>
      </section>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "tab-active" : ""}
            onClick={() => setView({ page: tab.key } as View)}
          >
            {tab.label}
          </button>
        ))}
        <button className="reset-btn" onClick={handleReset}>恢复示例数据</button>
      </nav>

      {view.page === "overview" && (
        <OverviewPage
          pigeons={state.pigeons}
          records={state.records}
          judgments={judgments}
          today={today}
          onOpenProfile={openProfile}
        />
      )}

      {view.page === "ranking" && (
        <RankingPage
          pigeons={state.pigeons}
          records={state.records}
          judgments={judgments}
          onOpenProfile={openProfile}
        />
      )}

      {view.page === "records" && (
        <RecordsPage
          pigeons={state.pigeons}
          records={state.records}
          revisions={state.revisions}
          today={today}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {view.page === "profile" && profilePigeon && (
        <ProfilePage
          pigeon={profilePigeon}
          records={state.records}
          revisions={state.revisions}
          judgment={judgments.get(profilePigeon.id) ?? judgePigeon(profilePigeon.id, state.records, today)}
          onBack={() => setView({ page: "overview" })}
        />
      )}
    </main>
  );
}

export default App;
