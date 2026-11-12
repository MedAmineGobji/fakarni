import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationsProvider, useNotifications } from "../notifications/NotificationsContext";
import { Avatar, CalendarIcon, HomeIcon, Logo, LogoutIcon, PillIcon, UserIcon, UsersIcon } from "./Icons";

const ROLE_LABELS = {
  PATIENT: "Patient",
  CAREGIVER: "Aidant familial",
  PRO: "Professionnel de santé",
  ADMIN: "Administrateur",
};

function HomeLink() {
  const { unread } = useNotifications();
  return (
    <NavLink to="/" end>
      <HomeIcon /> Accueil {unread > 0 && <span className="nav-count">{unread}</span>}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <NotificationsProvider>
      <LayoutInner />
    </NotificationsProvider>
  );
}

function LayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isPatient = user.role === "PATIENT";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <Logo />
        <nav>
          <HomeLink />
          {isPatient && <NavLink to="/medications"><PillIcon /> Médicaments</NavLink>}
          {isPatient && <NavLink to="/history"><CalendarIcon /> Historique</NavLink>}
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
