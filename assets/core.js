export const LANGUAGE = { all: 'Tous les langages', c: 'C', rust: 'Rust', comparison: 'C ↔ Rust' };
export const TOPICS = { structures: 'Structures', memory: 'Mémoire', arrays: 'Tableaux', functions: 'Fonctions', strings: 'Chaînes de caractères', pointers: 'Pointeurs', borrowing: 'Emprunts', variables: 'Variables', control_flow: 'Conditions', ownership: 'Propriété', loops: 'Boucles', collections: 'Collections' };
export const TYPES = { output: 'Résultat du code', compilation: 'Compilation', behavior: 'Comportement', code_review: 'Analyse de code', repair: 'Correction de code', concept: 'Concept', comparison: 'Comparaison' };
export function filterQuestions(questions, filters, records = {}) {
  return questions.filter(q => (filters.language === 'all' || q.language === filters.language)
    && (filters.topic === 'all' || q.topic === filters.topic)
    && (filters.difficulty === 'all' || q.difficulty === Number(filters.difficulty))
    && (filters.type === 'all' || q.type === filters.type)
    && (!filters.review || records[q.id]?.lastCorrect === false));
}
export function selectQuestions(pool, count, records = {}, random = Math.random, now = Date.now()) {
  const ranked = pool.map(q => ({ q, noise: random(), priority: records[q.id] ? (records[q.id].due <= now ? 0 : 2) : 1 }))
    .sort((a, b) => a.priority - b.priority || a.noise - b.noise);
  const selected = [], remaining = [], groups = new Set();
  for (const { q } of ranked) {
    if (!groups.has(q.variant_group)) { selected.push(q); groups.add(q.variant_group); }
    else remaining.push(q);
  }
  return selected.concat(remaining).slice(0, count);
}
export function recordAnswer(previous, correct, now = Date.now()) {
  const streak = correct ? (previous?.streak || 0) + 1 : 0;
  return { attempts: (previous?.attempts || 0) + 1, correct: (previous?.correct || 0) + Number(correct), lastCorrect: correct, streak, updated: now, due: now + (correct ? Math.min(30, 2 ** (streak - 1)) : 0) * 86400000 };
}
export function summarize(records) {
  const values = Object.values(records);
  const attempts = values.reduce((sum, r) => sum + r.attempts, 0);
  return { seen: values.length, attempts, success: attempts ? Math.round(values.reduce((sum, r) => sum + r.correct, 0) / attempts * 100) : 0, review: values.filter(r => !r.lastCorrect).length };
}
