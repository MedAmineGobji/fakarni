// Icônes SVG légères (trait 2px) utilisées dans l'application.
const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
};

export const PillIcon = (p) => (
  <svg {...base} {...p}><path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7z" /><path d="m8.5 8.5 7 7" /></svg>
);
export const HomeIcon = (p) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const UserIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const UsersIcon = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="4" /><path d="M1 21a8 8 0 0 1 16 0" /><path d="M17 4a4 4 0 0 1 0 8" /><path d="M23 21a8 8 0 0 0-4-6.9" /></svg>
);
export const BellIcon = (p) => (
  <svg {...base} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const CalendarIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const ChartIcon = (p) => (
  <svg {...base} {...p}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>
);
export const SparkIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>
);
export const LogoutIcon = (p) => (
  <svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
);

export function Logo() {
  return (
    <div className="logo">
      <span className="logo-icon"><PillIcon width={20} height={20} /></span>
      Fakarni
    </div>
  );
}

export function Avatar({ user }) {
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || user.email[0];
  return <span className="avatar">{initials.toUpperCase()}</span>;
}
