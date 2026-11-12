import { useState } from "react";
import { intakesApi, errorMessage } from "../api";
import { STATUS, formatTime } from "../utils";
import { PillIcon } from "./Icons";

/** Une prise : médicament, heure, statut et actions (US07). */
export default function IntakeRow({ intake, timeZone, onChange, actions = true }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const due = intake.status === "PENDING" && new Date(intake.scheduled_at) <= new Date();
  const status = due ? { label: "À prendre", className: "badge-upcoming" } : STATUS[intake.status];
  const m = intake.medication;
  const canAct = actions && ["PENDING", "SNOOZED"].includes(intake.status)
    && new Date(intake.scheduled_at) - new Date() < 12 * 3600 * 1000;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await fn(intake.id);
      onChange?.(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="intake">
      <span className="intake-icon"><PillIcon /></span>
      <div className="intake-name">
        <strong>{m.name} {m.dosage && <span className="dosage">{m.dosage}</span>}</strong>
        <span>{intake.quantity}{m.meal_relation !== "ANY" && ` · ${m.meal_label}`}</span>
        {error && <span className="error small">{error}</span>}
      </div>
      <div className="intake-time">
        <span className={`badge ${status.className}`}>{status.label}</span>
        <span>{formatTime(intake.scheduled_at, timeZone)}</span>
      </div>
      {canAct && (
        <div className="intake-actions">
          <button className="round-btn ok" title="J’ai pris ce médicament" disabled={busy} onClick={() => run(intakesApi.take)}>✓</button>
          <button className="round-btn" title="Me le rappeler dans 15 min" disabled={busy} onClick={() => run(intakesApi.snooze)}>15′</button>
          <button className="round-btn no" title="Prise non effectuée" disabled={busy} onClick={() => run(intakesApi.skip)}>✕</button>
        </div>
      )}
    </div>
  );
}
