// Date locale au format AAAA-MM-JJ (sans passer par l'UTC).
export function toDateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Heure d'une prise dans le fuseau horaire du patient.
export function formatTime(iso, timeZone) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function formatDay(iso, timeZone) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone });
}

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function daysLabel(days) {
  if (days === "0123456") return "Tous les jours";
  if (days === "01234") return "En semaine";
  if (days === "56") return "Le week-end";
  return days.split("").map((d) => DAY_LABELS[Number(d)]).join(", ");
}

export const STATUS = {
  PENDING: { label: "À venir", className: "badge-upcoming" },
  SNOOZED: { label: "Reportée", className: "badge-snoozed" },
  TAKEN: { label: "Prise", className: "badge-taken" },
  MISSED: { label: "Manquée", className: "badge-missed" },
};

export const FORMS = [
  { value: "TABLET", label: "Comprimé" },
  { value: "CAPSULE", label: "Gélule" },
  { value: "SYRUP", label: "Sirop" },
  { value: "INJECTION", label: "Injection" },
  { value: "DROPS", label: "Gouttes" },
  { value: "OTHER", label: "Autre" },
];

export const MEALS = [
  { value: "ANY", label: "Indifférent" },
  { value: "BEFORE", label: "Avant le repas" },
  { value: "WITH", label: "Pendant le repas" },
  { value: "AFTER", label: "Après le repas" },
];
