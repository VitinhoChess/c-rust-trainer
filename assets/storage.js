const KEY = 'atelier-c-rust-v1';
export function validState(data) {
  if (!data || data.version !== 1 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) return false;
  return Object.values(data.records).every(r => r && Number.isInteger(r.attempts) && r.attempts > 0 && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= r.attempts && typeof r.lastCorrect === 'boolean' && Number.isFinite(r.due) && Number.isInteger(r.streak) && r.streak >= 0);
}
export function loadState(onError) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, records: {}, session: null };
    const data = JSON.parse(raw);
    if (!validState(data)) throw new Error('Invalid saved data');
    return data;
  } catch { onError('La sauvegarde locale est indisponible ou illisible. Vous pouvez continuer cette séance.'); return { version: 1, records: {}, session: null }; }
}
export function saveState(state, onError) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { onError('Impossible d’enregistrer sur cet appareil. Votre progression reste disponible pendant cette visite.'); }
}
