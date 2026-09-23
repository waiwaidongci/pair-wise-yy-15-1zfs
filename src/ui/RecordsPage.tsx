import { useMemo, useState } from "react";
import { recordPoints, speedMpm } from "../domain/judgment";
import type { Judgment, Pigeon, RecordRevision, TrainingRecord } from "../domain/types";
import type { RecordDraft } from "../store/repository";

interface Props {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  revisions: RecordRevision[];
  today: string;
  onSave: (draft: RecordDraft, recordId?: string) => Judgment | null;
  onDelete: (recordId: TrainingRecord) => Judgment | null;
}

interface FormState {
  pigeonId: string;
  date: string;
  distanceKm: string;
  minutes: string;
  homed: string;
  recoveryPassed: string;
  note: string;
}

const EMPTY_FORM: Omit<FormState, "pigeonId" | "date"> = {
  distanceKm: "",
  minutes: "",
  homed: "yes",
  recoveryPassed: "pass",
  note: "",
};

export function RecordsPage({ pigeons, records, revisions, today, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    pigeonId: pigeons[0]?.id ?? "",
    date: today,
    ...EMPTY_FORM,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pigeonMap = useMemo(
    () => new Map(pigeons.map((p) => [p.id, p])),
    [pigeons]
  );
  const revisionCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const rev of revisions) {
      map.set(rev.recordId, (map.get(rev.recordId) ?? 0) + 1);
    }
    return map;
  }, [revisions]);

  const sorted = useMemo(
    () =>
      [...records].sort((a, b) =>
        a.date === b.date
          ? a.createdAt < b.createdAt
            ? 1
            : -1
          : a.date < b.date
            ? 1
            : -1
      ),
    [records]
  );

  function startEdit(record: TrainingRecord) {
    setEditingId(record.id);
    setForm({
      pigeonId: record.pigeonId,
      date: record.date,
      distanceKm: String(record.distanceKm),
      minutes: String(record.minutes),
      homed: record.homed ? "yes" : "no",
      recoveryPassed: record.recoveryPassed ? "pass" : "fail",
      note: record.note,
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ pigeonId: pigeons[0]?.id ?? "", date: today, ...EMPTY_FORM });
    setError("");
  }

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const distanceKm = Number(form.distanceKm);
    const minutes = Number(form.minutes);
    const homed = form.homed === "yes";
    if (!form.pigeonId || !form.date) {
      setError("请选择足环和放飞日期");
      return;
    }
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError("距离需为大于 0 的公里数");
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 0 || (homed && minutes <= 0)) {
      setError(homed ? "归巢记录需填写大于 0 的飞行分钟" : "分钟需为不小于 0 的数字");
      return;
    }

    const draft: RecordDraft = {
      pigeonId: form.pigeonId,
      date: form.date,
      distanceKm,
      minutes,
      homed,
      recoveryPassed: form.recoveryPassed === "pass",
      note: form.note.trim(),
    };

    const judgment = onSave(draft, editingId ?? undefined);
    const pigeon = pigeonMap.get(draft.pigeonId);
    const action = editingId ? "修改已保存" : "记录已保存";
    setNotice(
      `${action}：${pigeon?.band ?? ""} 当前判定为「${judgment?.status === "rest" ? "休息队列" : "放行"}」，累计负荷${judgment?.loadPoints ?? 0}分，后续排训按新数据重新判定。`
    );
    cancelEdit();
  }

  function handleDelete(record: TrainingRecord) {
    const pigeon = pigeonMap.get(record.pigeonId);
    if (!window.confirm(`删除 ${pigeon?.band} ${record.date} 的训放记录？旧记录仍保留在变更历史中可查。`)) return;
    const judgment = onDelete(record);
    setNotice(
      `记录已删除：${pigeon?.band ?? ""} 当前判定为「${judgment?.status === "rest" ? "休息队列" : "放行"}」，累计负荷${judgment?.loadPoints ?? 0}分。`
    );
    if (editingId === record.id) cancelEdit();
  }

  return (
    <>
      <section className="panel form-panel">
        <div className="heading">
          <div>
            <p>训放登记</p>
            <h2>{editingId ? "修改训放记录" : "新增训放记录"}</h2>
          </div>
          {editingId && <button onClick={cancelEdit}>取消修改</button>}
        </div>

        {editingId && (
          <div className="form-banner">
            正在修改历史记录：保存后后续排训立即重新判定，修改前的旧记录会保留在单羽档案的变更历史中。
          </div>
        )}
        {notice && <div className="form-notice">{notice}</div>}
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              <span>足环号</span>
              <select value={form.pigeonId} onChange={(e) => update({ pigeonId: e.target.value })}>
                {pigeons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.band}（{p.name}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>放飞日期</span>
              <input type="date" value={form.date} max={today} onChange={(e) => update({ date: e.target.value })} />
            </label>
            <label>
              <span>放飞距离（公里）</span>
              <input type="number" min="1" step="1" placeholder="如 60" value={form.distanceKm} onChange={(e) => update({ distanceKm: e.target.value })} />
            </label>
            <label>
              <span>飞行分钟</span>
              <input type="number" min="0" step="1" placeholder="归巢耗时，未归巢填 0" value={form.minutes} onChange={(e) => update({ minutes: e.target.value })} />
            </label>
            <label>
              <span>归巢情况</span>
              <select value={form.homed} onChange={(e) => update({ homed: e.target.value })}>
                <option value="yes">归巢</option>
                <option value="no">未归巢</option>
              </select>
            </label>
            <label>
              <span>恢复结论</span>
              <select value={form.recoveryPassed} onChange={(e) => update({ recoveryPassed: e.target.value })}>
                <option value="pass">恢复通过</option>
                <option value="fail">恢复未通过</option>
              </select>
            </label>
            <label className="span-2">
              <span>备注</span>
              <input placeholder="天气、地点或状态备注" value={form.note} onChange={(e) => update({ note: e.target.value })} />
            </label>
          </div>
          <div className="form-actions">
            <span className="muted">
              本次负荷：{Number.isFinite(Number(form.distanceKm)) && Number(form.distanceKm) > 0
                ? recordPoints(Number(form.distanceKm))
                : 0} 分（每10公里1分）
            </span>
            <button type="submit" className="primary">{editingId ? "保存修改并重新判定" : "保存记录"}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>全部训放记录</p>
            <h2>记录列表</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>足环 / 呼名</th>
                <th className="num">距离</th>
                <th className="num">分钟</th>
                <th className="num">均速</th>
                <th>归巢</th>
                <th>恢复</th>
                <th className="num">负荷</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const p = pigeonMap.get(r.pigeonId);
                const speed = speedMpm(r);
                const revCount = revisionCount.get(r.id);
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.date}</td>
                    <td>
                      <b>{p?.band}</b>
                      <small className="muted block">{p?.name}</small>
                    </td>
                    <td className="num">{r.distanceKm}km</td>
                    <td className="num">{r.homed ? r.minutes : "—"}</td>
                    <td className="num">{speed !== null ? `${speed.toLocaleString()}` : "—"}</td>
                    <td>{r.homed ? "归巢" : <span className="badge badge-warn">未归巢</span>}</td>
                    <td>
                      {r.recoveryPassed ? "通过" : <span className="badge badge-outline">未通过</span>}
                    </td>
                    <td className="num">{recordPoints(r.distanceKm)}分</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => startEdit(r)}>修改</button>
                        <button onClick={() => handleDelete(r)}>删除</button>
                        {revCount ? <span className="rev-count" title="含修订历史">{revCount > 1 ? `${revCount}次变更` : "有变更"}</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted empty">还没有训放记录。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
