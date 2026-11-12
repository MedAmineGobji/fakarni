import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { intakesApi, errorMessage } from "../api";
import IntakeRow from "../components/IntakeRow";
import { addDays, formatDay, toDateStr } from "../utils";

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 14, label: "14 jours" },
  { days: 30, label: "30 jours" },
];

export default function History() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(7);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    intakesApi.history(toDateStr(addDays(today, -(period - 1))), toDateStr(today))
      .then(({ data }) => { if (!cancelled) { setEvents(data); setError(""); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [period]);

  const past = useMemo(() => (events || []).filter((e) => new Date(e.scheduled_at) <= new Date()), [events]);
  const taken = past.filter((e) => e.status === "TAKEN").length;
  const missed = past.filter((e) => e.status === "MISSED").length;
  const rate = taken + missed ? Math.round((100 * taken) / (taken + missed)) : null;

  // Regroupement par jour, du plus récent au plus ancien.
  const groups = useMemo(() => {
    const map = new Map();
    [...past].reverse().forEach((e) => {
      const key = formatDay(e.scheduled_at, user.timezone);
      map.set(key, [...(map.get(key) || []), e]);
    });
    return [...map.entries()];
  }, [past, user.timezone]);

  return (
    <>
      <div className="page-header">
        <h1>Historique</h1>
        <div className="tabs">
          {PERIODS.map((p) => (
            <button key={p.days} className={period === p.days ? "active" : ""} onClick={() => { setEvents(null); setPeriod(p.days); }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid">
        <div className="card stat tone-violet"><span className="muted small">Observance</span><strong>{rate != null ? `${rate} %` : "—"}</strong></div>
        <div className="card stat tone-green"><span className="muted small">Prises confirmées</span><strong>{taken}</strong></div>
        <div className="card stat tone-orange"><span className="muted small">Prises manquées</span><strong>{missed}</strong></div>
      </div>

      {error && <p className="error">{error}</p>}
      {events === null && !error && <p className="muted">Chargement…</p>}
      {events && past.length === 0 && <div className="card empty"><strong>Aucune prise sur cette période</strong></div>}

      {groups.map(([day, list]) => (
        <section key={day} className="card">
          <h2 className="day-title">{day}</h2>
          <div className="intake-list">
            {list.map((e) => <IntakeRow key={e.id} intake={e} timeZone={user.timezone} actions={false} />)}
          </div>
        </section>
      ))}
      <p className="muted small">
        Une prise non confirmée dans les 2 heures est comptée comme manquée. L’historique reflète vos confirmations, pas la prise effective.
      </p>
    </>
  );
}
