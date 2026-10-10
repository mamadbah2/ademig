// Dakar est à UTC+0 toute l'année : l'heure saisie dans `datetime-local` est l'heure UTC.
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function versDateLocale(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export function depuisDateLocale(valeur: string): Date | null {
  if (!FORMAT.test(valeur)) return null;
  const date = new Date(`${valeur}:00.000Z`);
  // Refuse les dates impossibles (13e mois, 25 h) que Date corrigerait silencieusement.
  return Number.isNaN(date.getTime()) || versDateLocale(date) !== valeur ? null : date;
}
