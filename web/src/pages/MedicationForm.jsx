import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { medsApi, errorMessage } from "../api";
import { DAY_LABELS, FORMS, MEALS, toDateStr } from "../utils";

const emptySchedule = () => ({ time: "08:00", days: "0123456", quantity: "1 comprimé" });

export default function MedicationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", dosage: "", form: "TABLET", meal_relation: "ANY", instructions: "",
    start_date: toDateStr(new Date()), end_date: "",
    schedules: [emptySchedule()],
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    medsApi.get(id)
      .then(({ data }) => setForm({
        ...data,
        end_date: data.end_date || "",
        schedules: data.schedules.filter((s) => s.days).map((s) => ({ ...s, time: s.time.slice(0, 5) })),
      }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setSchedule = (index, patch) =>
    setForm({ ...form, schedules: form.schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  const toggleDay = (index, day) => {
    const days = form.schedules[index].days;
    const next = days.includes(day) ? days.replace(day, "") : [...days, day].sort().join("");
    if (next) setSchedule(index, { days: next });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(), dosage: form.dosage.trim(), form: form.form, meal_relation: form.meal_relation,
      instructions: form.instructions, start_date: form.start_date, end_date: form.end_date || null,
      schedules: form.schedules.map(({ time, days, quantity }) => ({ time, days, quantity })),
    };
    try {
      await (isEdit ? medsApi.update(id, payload) : medsApi.create(payload));
      navigate("/medications");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Chargement…</p>;

  return (
    <>
      <div className="page-header">
        <h1>{isEdit ? "Modifier le médicament" : "Ajouter un médicament"}</h1>
        <Link to="/medications" className="btn btn-light">Annuler</Link>
      </div>

      <form className="card form wide" onSubmit={onSubmit}>
        <div className="row">
          <label>Nom du médicament<input required value={form.name} onChange={set("name")} placeholder="Ex. : Paracétamol" /></label>
          <label>Dosage<input value={form.dosage} onChange={set("dosage")} placeholder="Ex. : 500 mg" /></label>
        </div>

        <fieldset>
          <legend>Forme</legend>
          <div className="choice-group">
            {FORMS.map((f) => (
              <button type="button" key={f.value} className={`choice ${form.form === f.value ? "active" : ""}`}
                onClick={() => setForm({ ...form, form: f.value })}>{f.label}</button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Moment de la prise</legend>
          <div className="choice-group">
            {MEALS.map((m) => (
              <button type="button" key={m.value} className={`choice ${form.meal_relation === m.value ? "active" : ""}`}
                onClick={() => setForm({ ...form, meal_relation: m.value })}>{m.label}</button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Horaires de prise</legend>
          {form.schedules.map((s, i) => (
            <div key={i} className="schedule-editor">
              <input type="time" required value={s.time} onChange={(e) => setSchedule(i, { time: e.target.value })} />
              <input value={s.quantity} onChange={(e) => setSchedule(i, { quantity: e.target.value })} placeholder="Quantité (ex. 1 comprimé)" title="Quantité" />
              <div className="day-toggles">
                {DAY_LABELS.map((label, d) => (
                  <button type="button" key={label} className={s.days.includes(String(d)) ? "on" : ""}
                    onClick={() => toggleDay(i, String(d))}>{label[0]}</button>
                ))}
              </div>
              {form.schedules.length > 1 && (
                <button type="button" className="round-btn no" title="Supprimer cet horaire"
                  onClick={() => setForm({ ...form, schedules: form.schedules.filter((_, j) => j !== i) })}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-light btn-sm" style={{ alignSelf: "flex-start" }}
            onClick={() => setForm({ ...form, schedules: [...form.schedules, { ...emptySchedule(), time: "20:00" }] })}>
            + Ajouter un horaire
          </button>
        </fieldset>

        <div className="row">
          <label>Début du traitement<input type="date" required value={form.start_date} onChange={set("start_date")} /></label>
          <label>Fin du traitement (optionnel)<input type="date" value={form.end_date} onChange={set("end_date")} /></label>
        </div>

        <label>Instructions
          <textarea rows={3} value={form.instructions} onChange={set("instructions")}
            placeholder="Ex. : avec un grand verre d’eau" />
        </label>

        <p className="muted small">
          Fakarni vous aide à suivre les instructions de votre médecin : il ne remplace pas son avis.
        </p>

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={saving}>{saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter à mes médicaments"}</button>
      </form>
    </>
  );
}
