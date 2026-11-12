import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { intakesApi, errorMessage } from "../api";
import { Avatar, BellIcon, CalendarIcon, ChartIcon, PillIcon, SparkIcon } from "../components/Icons";
import IntakeRow from "../components/IntakeRow";
import NotificationBell from "../notifications/NotificationBell";
import { addDays, toDateStr } from "../utils";

function Greeting({ user }) {
  return (
    <header className="page-header">
      <div className="greeting">
        <Avatar user={user} />
        <div>
          <span className="muted">Bonjour,</span>
          <h2>{user.first_name || user.email} !</h2>
        </div>
      </div>
      <NotificationBell />
    </header>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  // 2 jours passés + aujourd'hui + 4 jours à venir
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 2)), []);
  const [selected, setSelected] = useState(2);
  const [intakes, setIntakes] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const isPatient = user.role === "PATIENT";
  const selectedDate = days[selected];

  const loadStats = useCallback(() => {
    intakesApi.stats(30).then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPatient) return;
    let cancelled = false;
    intakesApi.forDay(toDateStr(selectedDate))
      .then(({ data }) => { if (!cancelled) { setIntakes(data); setError(""); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [selectedDate, isPatient]);

  useEffect(() => { if (isPatient) loadStats(); }, [isPatient, loadStats]);

  const onIntakeChange = (updated) => {
    setIntakes((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    loadStats();
  };

  if (!isPatient) {
    return (
      <>
        <Greeting user={user} />
        <section className="card empty">
          <span className="empty-icon"><PillIcon width={30} height={30} /></span>
          <strong>Espace {user.role === "ADMIN" ? "administrateur" : "accompagnant"}</strong>
          <span className="muted small">Le suivi des patients qui vous partagent leurs données arrive au Sprint 4.</span>
        </section>
      </>
    );
  }

  const todo = intakes?.filter((i) => ["PENDING", "SNOOZED"].includes(i.status)).length ?? 0;

  return (
    <>
      <Greeting user={user} />

      <div>
        <h1>Mes rappels</h1>
        <div style={{ marginTop: "1rem" }}>
          <span className="chip">
            <CalendarIcon width={18} height={18} />
            {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="days">
        {days.map((d, i) => (
          <button key={d.toISOString()} className={`day ${i === selected ? "active" : ""} ${i === 2 ? "today" : ""}`} onClick={() => setSelected(i)}>
            <strong>{d.getDate()}</strong>
            <span>{i === 2 ? "Auj." : d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
          </button>
        ))}
      </div>

      <div className="grid">
        <div className="card stat tone-violet">
          <span className="stat-icon"><ChartIcon /></span>
          <span className="muted small">Observance (30 jours)</span>
          <strong>{stats?.rate != null ? `${stats.rate} %` : "—"}</strong>
          <span className="muted small">{stats ? `${stats.taken} prises · ${stats.missed} manquées` : ""}</span>
        </div>
        <div className="card stat tone-green">
          <span className="stat-icon"><BellIcon /></span>
          <span className="muted small">Rappels actifs</span>
          <strong>{stats?.active_reminders ?? "—"}</strong>
          <span className="muted small">{stats ? `${stats.active_medications} médicament(s) suivis` : ""}</span>
        </div>
        <div className="card stat tone-orange">
          <span className="stat-icon"><SparkIcon /></span>
          <span className="muted small">Risque d’oubli (IA)</span>
          <strong>—</strong>
          <span className="badge badge-soft">Sprint 3</span>
        </div>
      </div>

      <section className="card">
        <div className="section-head">
          <h2>Prises du jour {intakes?.length > 0 && <span className="muted small">· {todo} à faire</span>}</h2>
          <Link to="/medications/new" className="btn btn-sm">+ Ajouter</Link>
        </div>
        {error && <p className="error">{error}</p>}
        {intakes === null && !error && <p className="muted">Chargement…</p>}
        {intakes?.length === 0 && (
          <div className="empty">
            <span className="empty-icon"><PillIcon width={30} height={30} /></span>
            <strong>Aucune prise prévue ce jour-là</strong>
            <span className="muted small">Ajoutez un médicament et ses horaires pour recevoir vos rappels.</span>
            <Link to="/medications/new" className="btn">+ Ajouter un médicament</Link>
          </div>
        )}
        <div className="intake-list">
          {intakes?.map((intake) => (
            <IntakeRow key={intake.id} intake={intake} timeZone={user.timezone} onChange={onIntakeChange} />
          ))}
        </div>
      </section>
    </>
  );
}
