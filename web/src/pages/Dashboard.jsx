import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Avatar, BellIcon, CalendarIcon, ChartIcon, PillIcon, SparkIcon } from "../components/Icons";

// Les 7 prochains jours pour le bandeau de sélection.
function nextDays(count = 7) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

const STATS = [
  { tone: "violet", icon: ChartIcon, label: "Observance (30 jours)", sprint: "Sprint 3" },
  { tone: "green", icon: BellIcon, label: "Rappels actifs", sprint: "Sprint 2" },
  { tone: "orange", icon: SparkIcon, label: "Risque d’oubli (IA)", sprint: "Sprint 3" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const days = useMemo(() => nextDays(7), []);
  const [selected, setSelected] = useState(0);
  const selectedDate = days[selected];

  return (
    <>
      <header className="page-header">
        <div className="greeting">
          <Avatar user={user} />
          <div>
            <span className="muted">Bonjour,</span>
            <h2>{user.first_name || user.email} !</h2>
          </div>
        </div>
        <button className="icon-btn" aria-label="Notifications"><BellIcon /></button>
      </header>

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
          <button key={d.toISOString()} className={`day ${i === selected ? "active" : ""}`} onClick={() => setSelected(i)}>
            <strong>{d.getDate()}</strong>
            <span>{d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
          </button>
        ))}
      </div>

      <div className="grid">
        {STATS.map(({ tone, icon: Icon, label, sprint }) => (
          <div key={label} className={`card stat tone-${tone}`}>
            <span className="stat-icon"><Icon /></span>
            <span className="muted small">{label}</span>
            <strong>—</strong>
            <span className="badge badge-soft">{sprint}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <h2>Prises du jour</h2>
        <div className="empty">
          <span className="empty-icon"><PillIcon width={30} height={30} /></span>
          <strong>Aucun médicament pour le moment</strong>
          <span className="muted small">L’ajout de médicaments et le planning des prises arrivent au Sprint 2.</span>
          <button className="btn" disabled>+ Ajouter un médicament</button>
        </div>
      </section>
    </>
  );
}
