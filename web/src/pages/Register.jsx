import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api";
import { Logo } from "../components/Icons";

const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Tunis";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", confirm: "",
    role: "PATIENT", timezone: browserTz,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    try {
      const { confirm: _confirm, ...payload } = form;
      await register(payload);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <Logo />
        <h1>Créer un compte</h1>

        <div className="row">
          <label>Prénom<input required value={form.first_name} onChange={set("first_name")} /></label>
          <label>Nom<input value={form.last_name} onChange={set("last_name")} /></label>
        </div>
        <label>Email<input type="email" required value={form.email} onChange={set("email")} /></label>
        <label>Je suis
          <select value={form.role} onChange={set("role")}>
            <option value="PATIENT">Patient</option>
            <option value="CAREGIVER">Aidant familial</option>
            <option value="PRO">Professionnel de santé</option>
          </select>
        </label>
        <div className="row">
          <label>Mot de passe<input type="password" required minLength={8} value={form.password} onChange={set("password")} /></label>
          <label>Confirmation<input type="password" required value={form.confirm} onChange={set("confirm")} /></label>
        </div>
        <p className="muted small">Fuseau horaire détecté : {form.timezone}</p>

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={submitting}>{submitting ? "Création…" : "Créer mon compte"}</button>
        <p className="muted small">Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
      </form>
    </div>
  );
}
