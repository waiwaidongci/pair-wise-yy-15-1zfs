import { useEffect, useState } from "react";
import type { Recovery, TrainingRecord } from "../types";
import { fmtDateTime, RECOVERY_LABEL } from "../lib/rules";

interface Props {
  record: TrainingRecord;
  onSave: (
    id: string,
    patch: {
      flownAt: string;
      distanceKm: number | null;
      minutes: number | null;
      homed: boolean;
      recovery: Recovery;
      note?: string;
    }
  ) => void;
  onClose: () => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

/** 修订弹窗：改距离、时间或恢复结论后保存旧值，后续排训重新判定 */
export default function EditModal({ record, onSave, onClose }: Props) {
  const [flownAt, setFlownAt] = useState(toLocalInput(record.flownAt));
  const [distanceKm, setDistanceKm] = useState(
    record.distanceKm == null ? "" : String(record.distanceKm)
  );
  const [minutes, setMinutes] = useState(
    record.minutes == null ? "" : String(record.minutes)
  );
  const [homed, setHomed] = useState(record.homed);
  const [recovery, setRecovery] = useState<Recovery>(record.recovery);
  const [note, setNote] = useState(record.note ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!homed) {
      setDistanceKm("");
      setMinutes("");
      setRecovery("none");
    }
  }, [homed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!flownAt) return setError("请选择放飞时间");
    if (homed) {
      const d = Number(distanceKm);
      const m = Number(minutes);
      if (!(d > 0)) return setError("归巢记录需要有效距离");
      if (!(m > 0)) return setError("归巢记录需要有效分钟数");
      onSave(record.id, {
        flownAt,
        distanceKm: d,
        minutes: m,
        homed: true,
        recovery,
        note,
      });
    } else {
      onSave(record.id, {
        flownAt,
        distanceKm: null,
        minutes: null,
        homed: false,
        recovery: "none",
        note,
      });
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="heading">
          <div>
            <p>修订记录</p>
            <h2>{record.ring}</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            取消
          </button>
        </div>

        <p className="panel-hint">
          原记录：{fmtDateTime(record.flownAt)} ·{" "}
          {record.homed
            ? `${record.distanceKm}km / ${record.minutes} 分钟 / ${RECOVERY_LABEL[record.recovery]}`
            : "未归巢"}
          。修改保存后旧值自动留痕，后续排训按新值重新判定。
        </p>

        <div className="field-grid">
          <label>
            <span>放飞时间</span>
            <input
              type="datetime-local"
              value={flownAt}
              onChange={(e) => setFlownAt(e.target.value)}
            />
          </label>
          <label>
            <span>是否归巢</span>
            <select
              value={homed ? "true" : "false"}
              onChange={(e) => setHomed(e.target.value === "true")}
            >
              <option value="true">已归巢</option>
              <option value="false">未归巢</option>
            </select>
          </label>
          <label className={homed ? "" : "disabled-field"}>
            <span>距离（公里）</span>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!homed}
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </label>
          <label className={homed ? "" : "disabled-field"}>
            <span>飞行分钟</span>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!homed}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className={homed ? "" : "disabled-field"}>
            <span>恢复结论</span>
            <select
              disabled={!homed}
              value={recovery}
              onChange={(e) => setRecovery(e.target.value as Recovery)}
            >
              <option value="passed">恢复通过</option>
              <option value="failed">恢复未通过</option>
              <option value="none">尚未评估</option>
            </select>
          </label>
          <label className="field-wide">
            <span>备注</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="primary" type="submit">
            保存修订（旧值留痕）
          </button>
        </div>
      </form>
    </div>
  );
}
