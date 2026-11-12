import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { medsApi, errorMessage } from "../api";
import { PillIcon } from "../components/Icons";
import { daysLabel } from "../utils";

export default function Medications() {
  const [archived, setArchived] = useState(false);
  const [meds, setMeds] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    medsApi.list(archived)
      .then(({ data }) => { if (!cancelled) { setMeds(data); setError(""); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [archived, reload]);

  const toggleArchive = async (med) => {
    if (!archived && !window.confirm(`Archiver ${med.name} ? Les rappels seront arrêtés, l’historique est conservé.`)) return;
    try {
      await (archived ? medsApi.restore(med.id) : medsApi.archive(med.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Mes médicaments</h1>
        <Link to="/medications/new" className="btn">+ Ajouter un médicament</Link>
      </div>

      <div className="tabs">
        <button className={!archived ? "active" : ""} onClick={() => { setMeds(null); setArchived(false); }}>En cours</button>
        <button className={archived ? "active" : ""} onClick={() => { setMeds(null); setArchived(true); }}>Archivés</button>
      </div>

      {error && <p className="error">{error}</p>}
      {meds === null && !error && <p className="muted">Chargement…</p>}
      {meds?.length === 0 && (
        <div className="card empty">
          <span className="empty-icon"><PillIcon width={30} height={30} /></span>
          <strong>{archived ? "Aucun médicament archivé" : "Aucun médicament en cours"}</strong>
          {!archived && <Link to="/medications/new" className="btn">+ Ajouter mon premier médicament</Link>}
        </div>
      )}

      <div className="med-grid">
        {meds?.map((med) => (
          <article key={med.id} className="card med-card">
            <div className="med-head">
              <span className="intake-icon"><PillIcon /></span>
              <div>
                <h2>{med.name}</h2>
                <span className="muted small">{[med.dosage, med.form_label].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            <div className="pills">
              {med.meal_relation !== "ANY" && <span className="pill-tag">{med.meal_label}</span>}
              {med.source === "OCR" && <span className="pill-tag">Scan d’ordonnance</span>}
              <span className="pill-tag">
                Depuis le {new Date(med.start_date).toLocaleDateString("fr-FR")}
                {med.end_date && ` jusqu’au ${new Date(med.end_date).toLocaleDateString("fr-FR")}`}
              </span>
            </div>
            <ul className="schedule-list">
              {med.schedules.filter((s) => s.days).map((s) => (
                <li key={s.id}><strong>{s.time.slice(0, 5)}</strong> · {s.quantity} · <span className="muted">{daysLabel(s.days)}</span></li>
              ))}
            </ul>
            {med.instructions && <p className="muted small instructions">{med.instructions}</p>}
            <div className="med-actions">
              {!archived && <Link to={`/medications/${med.id}`} className="btn btn-light btn-sm">Modifier</Link>}
              <button className="btn btn-ghost-violet btn-sm" onClick={() => toggleArchive(med)}>
                {archived ? "Réactiver" : "Archiver"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
