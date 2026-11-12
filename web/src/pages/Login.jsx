import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api";
import { Logo } from "../components/Icons";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? "Email ou mot de passe incorrect." : errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <Logo />
        <div>
          <h1>Bon retour !</h1>
          <p className="muted" style={{ margin: "0.3rem 0 0" }}>Moins d’oublis, un meilleur suivi au quotidien.</p>
        </div>

        <label>Email
          <input type="email" required autoFocus value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Mot de passe
          <input type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={submitting}>{submitting ? "Connexion…" : "Se connecter"}</button>
        <p className="muted small">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
      </form>
    </div>
  );
}
