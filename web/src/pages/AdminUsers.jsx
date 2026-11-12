import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/users/")
      .then(({ data }) => setUsers(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
      <h1>Utilisateurs</h1>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <table>
          <thead>
            <tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Inscrit le</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{`${u.first_name} ${u.last_name}`.trim() || "—"}</td>
                <td><span className="badge badge-soft">{u.role}</span></td>
                <td>{new Date(u.date_joined).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
