import { useEffect, useRef, useState } from "react";
import { BellIcon } from "../components/Icons";
import { useNotifications } from "./NotificationsContext";

const KIND_STYLE = {
  REMINDER: { label: "Rappel", className: "badge-upcoming" },
  FOLLOW_UP: { label: "Relance", className: "badge-snoozed" },
  MISSED: { label: "Manquée", className: "badge-missed" },
  INFO: { label: "Info", className: "badge-soft" },
};

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead, permission, askPermission } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fermer le panneau en cliquant à l'extérieur.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" aria-label={`Notifications (${unread} non lues)`} onClick={() => setOpen((o) => !o)}>
        <BellIcon />
        {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel card">
          <div className="section-head">
            <h2>Notifications</h2>
            {unread > 0 && <button className="link-btn" onClick={markAllRead}>Tout marquer comme lu</button>}
          </div>

          {permission === "default" && (
            <button className="btn btn-light btn-sm full" onClick={askPermission}>
              Activer les notifications du navigateur
            </button>
          )}
          {permission === "denied" && (
            <p className="muted small">Notifications bloquées par le navigateur : autorisez-les dans les paramètres du site.</p>
          )}

          {items.length === 0 && <p className="muted small center-text">Aucune notification pour le moment.</p>}
          <ul className="notif-list">
            {items.map((n) => {
              const style = KIND_STYLE[n.kind] || KIND_STYLE.INFO;
              return (
                <li key={n.id} className={n.read_at ? "" : "unread"} onClick={() => !n.read_at && markRead(n.id)}>
                  <div className="notif-top">
                    <span className={`badge ${style.className}`}>{style.label}</span>
                    <span className="muted small">{timeAgo(n.created_at)}</span>
                  </div>
                  <strong>{n.title}</strong>
                  <span className="muted small">{n.body}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
