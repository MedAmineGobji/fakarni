import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authApi, errorMessage } from "../api";

const TIMEZONES = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : ["Africa/Tunis", "Africa/Algiers", "Africa/Casablanca", "Europe/Paris", "UTC"];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    timezone: user.timezone,
    notifications_enabled: user.notifications_enabled,
  });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const { data } = await authApi.updateMe(form);
      setUser(data);
      setStatus({ type: "success", text: "Profil mis à jour." });
    } catch (err) {
      setStatus({ type: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
      <h1>Mon profil</h1>
      <form className="card form" onSubmit={onSubmit}>
        <label>Email<input value={user.email} disabled /></label>
        <div className="row">
          <label>Prénom<input value={form.first_name} onChange={set("first_name")} /></label>
          <label>Nom<input value={form.last_name} onChange={set("last_name")} /></label>
        </div>
        <label>Téléphone<input value={form.phone} onChange={set("phone")} placeholder="+216 ..." /></label>
        <label>Fuseau horaire
          <select value={form.timezone} onChange={set("timezone")}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.notifications_enabled} onChange={set("notifications_enabled")} />
          Recevoir les rappels de prise
        </label>

        {status.text && <p className={status.type}>{status.text}</p>}
        <button className="btn" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
    </section>
  );
}
