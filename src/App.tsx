import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Recovery, TrainingRecord } from "./types";
import {
  createRecord,
  loadState,
  reviseRecord,
  saveState,
} from "./lib/storage";
import { verdictFor } from "./lib/rules";
import RecordForm from "./components/RecordForm";
import Dashboard from "./components/Dashboard";
import RecordList from "./components/RecordList";
import BirdProfile from "./components/BirdProfile";
import EditModal from "./components/EditModal";

interface NewDraft {
  ring: string;
  flownAt: string;
  distanceKm: number | null;
  minutes: number | null;
  homed: boolean;
  recovery: Recovery;
  note?: string;
}

type RevisePatch = Omit<NewDraft, "ring">;

function App() {
  // 保存层状态：页面不直接改写，统一经 createRecord / reviseRecord
  const [records, setRecords] = useState<TrainingRecord[]>(() => loadState().records);
  const [profileRing, setProfileRing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // 每分钟刷新一次“两天内/七天”窗口判定

  useEffect(() => {
    saveState({ records });
  }, [records]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const now = useMemo(() => {
    void tick;
    return Date.now();
  }, [tick, records]);

  // 判定层：每次数据或时间窗口变化重新计算，页面只消费结论
  const verdicts = useMemo(() => {
    const rings = [...new Set(records.map((r) => r.ring))].sort();
    return rings.map((ring) => verdictFor(ring, records, now));
  }, [records, now]);

  const knownRings = useMemo(
    () => [...new Set(records.map((r) => r.ring))].sort(),
    [records]
  );

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) =>
        b.flownAt.localeCompare(a.flownAt) || b.createdAt.localeCompare(a.createdAt)
      ),
    [records]
  );

  function handleAdd(draft: NewDraft) {
    setRecords((prev) => [...prev, createRecord(draft)]);
  }

  function handleRevise(id: string, patch: RevisePatch) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? reviseRecord(r, {
              flownAt: patch.flownAt,
              distanceKm: patch.distanceKm,
              minutes: patch.minutes,
              homed: patch.homed,
              recovery: patch.recovery,
              note: patch.note,
            })
          : r
      )
    );
  }

  const profileVerdict = profileRing
    ? verdicts.find((v) => v.ring === profileRing) ?? null
    : null;
  const editingRecord = editingId
    ? records.find((r) => r.id === editingId) ?? null
    : null;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62014 · 训放负荷与休息放行台</p>
        <h1>赛鸽训放记录</h1>
        <span>
          记录足环、距离、分钟、归巢和恢复。每 10 公里记 1 分按最近七天累计；百公里训放后两天内、
          负荷到 6 分或恢复未通过时只进休息队列，不参加速度和名次排行。改距离、时间或恢复结论后，
          旧值留痕仍可查，后续排训自动重新判定。
        </span>
      </section>

      <Dashboard
        verdicts={verdicts}
        records={records}
        now={now}
        onOpenBird={setProfileRing}
      />

      <section className="workspace form-workspace">
        <RecordForm knownRings={knownRings} onSubmit={handleAdd} />
      </section>

      <RecordList
        records={sortedRecords}
        onEdit={(r) => setEditingId(r.id)}
        onOpenBird={setProfileRing}
      />

      {profileVerdict && (
        <BirdProfile
          verdict={profileVerdict}
          onClose={() => setProfileRing(null)}
          onEdit={(id) => {
            setProfileRing(null);
            setEditingId(id);
          }}
        />
      )}

      {editingRecord && (
        <EditModal
          record={editingRecord}
          onClose={() => setEditingId(null)}
          onSave={handleRevise}
        />
      )}
    </main>
  );
}

export default App;
