import { useState } from "react";
import type { Recovery } from "../types";
import { nowLocalInput } from "../lib/rules";

interface Props {
  knownRings: string[];
  onSubmit: (draft: {
    ring: string;
    flownAt: string;
    distanceKm: number | null;
    minutes: number | null;
    homed: boolean;
    recovery: Recovery;
    note?: string;
  }) => void;
}

const EMPTY = {
  ring: "",
  flownAt: nowLocalInput(),
  distanceKm: "",
  minutes: "",
  homed: "true",
  recovery: "passed" as Recovery,
  note: "",
};

/** 新增训放记录：足环、距离、分钟、归巢和恢复 */
export default function RecordForm({ knownRings, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const homed = form.homed === "true";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ring = form.ring.trim().toUpperCase();
    if (!ring) return setError("请填写足环号");
    if (!form.flownAt) return setError("请选择放飞时间");
    if (homed) {
      const distance = Number(form.distanceKm);
      const minutes = Number(form.minutes);
      if (!(distance > 0)) return setError("归巢记录需要有效的放飞距离（公里）");
      if (!(minutes > 0)) return setError("归巢记录需要有效的飞行分钟数");
      onSubmit({
        ring,
        flownAt: form.flownAt,
        distanceKm: distance,
        minutes,
        homed: true,
        recovery: form.recovery,
        note: form.note,
      });
    } else {
      onSubmit({
        ring,
        flownAt: form.flownAt,
        distanceKm: null,
        minutes: null,
        homed: false,
        recovery: "none",
        note: form.note,
      });
    }
    setForm(EMPTY);
    setError("");
  }

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="heading">
        <div>
          <p>训放登记</p>
          <h2>新增训放记录</h2>
        </div>
        <button className="primary" type="submit">
          保存记录
        </button>
      </div>

      <div className="field-grid">
        <label>
          <span>足环号 *</span>
          <input
            list="known-rings"
            value={form.ring}
            placeholder="如 CHN-24-001839"
            onChange={(e) => setForm({ ...form, ring: e.target.value })}
          />
          <datalist id="known-rings">
            {knownRings.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label>
          <span>放飞时间 *</span>
          <input
            type="datetime-local"
            value={form.flownAt}
            onChange={(e) => setForm({ ...form, flownAt: e.target.value })}
          />
        </label>

        <label>
          <span>是否归巢 *</span>
          <select
            value={form.homed}
            onChange={(e) => setForm({ ...form, homed: e.target.value })}
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
            value={form.distanceKm}
            placeholder={homed ? "如 100" : "未归巢无需填写"}
            onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
          />
        </label>

        <label className={homed ? "" : "disabled-field"}>
          <span>飞行分钟</span>
          <input
            type="number"
            min="0"
            step="1"
            disabled={!homed}
            value={form.minutes}
            placeholder={homed ? "如 92" : "未归巢无需填写"}
            onChange={(e) => setForm({ ...form, minutes: e.target.value })}
          />
        </label>

        <label className={homed ? "" : "disabled-field"}>
          <span>恢复结论</span>
          <select
            disabled={!homed}
            value={form.recovery}
            onChange={(e) =>
              setForm({ ...form, recovery: e.target.value as Recovery })
            }
          >
            <option value="passed">恢复通过</option>
            <option value="failed">恢复未通过</option>
            <option value="none">尚未评估</option>
          </select>
        </label>

        <label className="field-wide">
          <span>备注（训放地点 / 天气）</span>
          <input
            value={form.note}
            placeholder="如 淇县 110km，晴"
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}
      <p className="form-hint">
        计分规则：每 10 公里记 1 分，按最近七天累计；保存后自动重新判定放行。
      </p>
    </form>
  );
}
