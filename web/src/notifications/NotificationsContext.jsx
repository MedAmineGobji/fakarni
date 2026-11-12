import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { notificationsApi } from "../api";

const NotificationsContext = createContext(null);
const POLL_MS = 30_000;

/**
 * Interroge l'API toutes les 30 s. Quand un nouveau rappel arrive, il est aussi affiché
 * comme notification système du navigateur (si l'utilisateur l'a autorisé).
 */
export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const seen = useRef(null); // ids déjà connus (null = premier chargement)

  const refresh = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list();
      setItems(data.results);
      setUnread(data.unread);
      if (seen.current !== null && typeof Notification !== "undefined" && Notification.permission === "granted") {
        data.results
          .filter((n) => !seen.current.has(n.id) && !n.read_at)
          .forEach((n) => new Notification(n.title, { body: n.body, icon: "/favicon.svg", tag: `fakarni-${n.id}` }));
      }
      seen.current = new Set(data.results.map((n) => n.id));
    } catch {
      /* hors ligne : on réessaiera au prochain cycle */
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const markRead = async (id) => {
    await notificationsApi.read(id);
    refresh();
  };

  const markAllRead = async () => {
    await notificationsApi.readAll();
    refresh();
  };

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    setPermission(await Notification.requestPermission());
  };

  return (
    <NotificationsContext.Provider value={{ items, unread, refresh, markRead, markAllRead, permission, askPermission }}>
      {children}
    </NotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => useContext(NotificationsContext);
