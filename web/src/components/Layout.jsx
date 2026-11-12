import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, HomeIcon, Logo, LogoutIcon, UserIcon, UsersIcon } from "./Icons";

const ROLE_LABELS = {
  PATIENT: "Patient",
  CAREGIVER: "Aidant familial",
  PRO: "Professionnel de santé",
  ADMIN: "Administrateur",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <Logo />
        <nav>
          <NavLink to="/" end><HomeIcon /> Accueil</NavLink>
          <NavLink to="/profile"><UserIcon /> Mon profil</NavLink>
          {user.role === "ADMIN" && <NavLink to="/admin/users"><UsersIcon /> Utilisateurs</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <Avatar user={user} />
            <div>
              <strong>{user.first_name || user.email}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <button className="btn btn-light" onClick={handleLogout}>
            <LogoutIcon width={18} height={18} /> Se déconnecter
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
