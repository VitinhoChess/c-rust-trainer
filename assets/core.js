export const BANK_FILES = ['questions_c.json', 'questions_cpp.json', 'questions_rust.json'];
export const LANGUAGE = { all: 'Tous les langages', c: 'C', cpp: 'C++', rust: 'Rust' };
export const TOPICS = { structures: 'Structures', memory: 'Mémoire', arrays: 'Tableaux', functions: 'Fonctions', strings: 'Chaînes de caractères', pointers: 'Pointeurs', borrowing: 'Emprunts', variables: 'Variables', control_flow: 'Conditions', ownership: 'Propriété', loops: 'Boucles', collections: 'Collections', logic: 'Logique', enum: 'Énumérations', files: 'Fichiers', algorithms: 'Algorithmes', references: 'Références', const: 'Qualification const', vector: 'Vecteurs (std::vector)', classes: 'Classes', concurrency: 'Concurrence', lifetimes: 'Durées de vie', generics: 'Généricité et traits', exceptions: 'Exceptions' };
export const TYPES = { output: 'Résultat du code', compilation: 'Compilation', behavior: 'Comportement', code_review: 'Analyse de code', repair: 'Correction de code', concept: 'Concept', prediction: 'Prédire le résultat', multi_question: 'Plusieurs questions', single_choice: 'Réponse unique', multiple_choice: 'Réponses multiples' };

// Nested questions are authoritative: the legacy fields on v2 exercises repeat Q1.
export function normalizeQuestions(banks) {
  const ids = new Set();
  return banks.flat().map(source => {
    if (!['c', 'cpp', 'rust'].includes(source.language) || ids.has(source.id)) throw new Error('Invalid exercise: ' + source.id);
    ids.add(source.id);
    const items = (source.questions?.length ? source.questions : [source]).map((part, index) => {
      const answers = part.correct_answers ?? [part.correct_answer];
      const item = { id: part.id || `${source.id}-Q${index + 1}`, prompt: part.prompt || part.question, kind: part.type === 'multiple_choice' ? 'multiple_choice' : 'single_choice', options: part.options, answers, explanation: part.explanation, last_seen_at: part.last_seen_at ?? null };
      if (!item.prompt || !item.explanation || !Array.isArray(item.options) || item.options.length < 2 || !Array.isArray(answers) || !answers.length || new Set(answers).size !== answers.length || answers.some(n => !Number.isInteger(n) || n < 0 || n >= item.options.length) || (item.kind === 'single_choice' && answers.length !== 1)) throw new Error('Invalid question: ' + item.id);
      return item;
    });
    const topic = ({ structs: 'structures', conditions: 'control_flow', string: 'strings' })[source.topic] || source.topic;
    const snippets = source.snippets ?? [{ label: null, code: source.code }];
    if (!TOPICS[topic] || !TYPES[source.type] || !Array.isArray(snippets) || !snippets.length || snippets.some(snippet => !snippet || typeof snippet.code !== 'string' || !snippet.code.trim() || (snippet.label !== null && typeof snippet.label !== 'string')) || new Set(snippets.map(snippet => snippet.label)).size !== snippets.length) throw new Error('Invalid metadata: ' + source.id);
    return { ...source, topic, items, snippets, question: items.length > 1 ? `${items.length} questions sur ${snippets.length > 1 ? 'ces extraits' : 'ce code'}` : items[0].prompt };
  });
}
export function validSelections(exercise, selections, complete = false) {
  return Array.isArray(selections) && selections.length === exercise.items.length && selections.every((choices, i) => Array.isArray(choices) && (!complete || choices.length > 0) && new Set(choices).size === choices.length && (exercise.items[i].kind === 'multiple_choice' || choices.length <= 1) && choices.every(n => Number.isInteger(n) && n >= 0 && n < exercise.items[i].options.length));
}
export function gradeExercise(exercise, selections) {
  if (!validSelections(exercise, selections, true)) throw new Error('Incomplete answer');
  const parts = exercise.items.map((item, i) => selections[i].length === item.answers.length && item.answers.every(n => selections[i].includes(n)));
  return { correct: parts.every(Boolean), parts, score: parts.filter(Boolean).length, total: parts.length };
}
// Keep compatible sessions; an archived or changed exercise invalidates only the session.
export function restoreSession(session, exercises) {
  if (!session) return null;
  const byId = new Map(exercises.map(q => [q.id, q]));
  if (!Array.isArray(session.ids) || !session.ids.length || new Set(session.ids).size !== session.ids.length || session.ids.some(id => !byId.has(id)) || !Array.isArray(session.answers) || !Number.isInteger(session.index) || session.index < 0 || session.index > session.ids.length || session.answers.length < session.index || session.answers.length > Math.min(session.index + 1, session.ids.length)) return null;
  const answers = [];
  for (const [i, answer] of session.answers.entries()) {
    const exercise = byId.get(session.ids[i]);
    const choices = answer?.choices ?? (Number.isInteger(answer?.choice) ? [[answer.choice]] : null);
    if (!answer || answer.id !== exercise.id || !validSelections(exercise, choices, true)) return null;
    const grade = gradeExercise(exercise, choices);
    if (answer.correct !== grade.correct) return null;
    answers.push({ id: exercise.id, choices, ...grade });
  }
  const current = byId.get(session.ids[session.index]);
  const draft = current && validSelections(current, session.draft) ? session.draft : null;
  const optionOrders = {};
  for (const id of session.ids) {
    const exercise = byId.get(id), saved = session.optionOrders?.[id];
    if (Array.isArray(saved) && saved.length === exercise.items.length && saved.every((order,i) => Array.isArray(order) && order.length === exercise.items[i].options.length && new Set(order).size === order.length && order.every(n => Number.isInteger(n) && n >= 0 && n < order.length))) optionOrders[id] = saved;
  }
  return { ids: session.ids, answers, index: session.index, draft, optionOrders, presented: Array.isArray(session.presented) ? session.presented.filter(id => session.ids.includes(id)) : [] };
}
export function filterQuestions(questions, filters, records = {}) {
  return questions.filter(q => (filters.language === 'all' || q.language === filters.language)
    && (filters.topic === 'all' || q.topic === filters.topic)
    && (filters.difficulty === 'all' || q.difficulty === Number(filters.difficulty))
    && (filters.type === 'all' || q.type === filters.type || q.items?.some(item => item.kind === filters.type))
    && (!filters.review || records[q.id]?.lastCorrect === false));
}
export const RECENT_WINDOW_MS = 7 * 86400000;
export const MAX_REPEAT_RATE = 0.2;
export const RECENT_FAMILY_COUNT = 10;
const seenTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

export function planSession(pool, count, records = {}, exposures = {}, history = [], now = Date.now(), random = Math.random) {
  const requested = Math.max(0, Math.floor(Number(count) || 0));
  const groups = new Set(pool.map(q => q.variant_group));
  const recentFamilies = new Set();
  for (const event of [...history].reverse()) {
    if (recentFamilies.size >= RECENT_FAMILY_COUNT) break;
    const time = seenTime(event.last_seen_at);
    if (groups.has(event.variant_group) && time > 0 && time > now - RECENT_WINDOW_MS) recentFamilies.add(event.variant_group);
  }
  const ranked = pool.map(q => {
    const record = records[q.id];
    const timestamp = seenTime(exposures[q.id]?.last_seen_at ?? q.last_seen_at);
    const recent = (timestamp > 0 && timestamp > now - RECENT_WINDOW_MS) || recentFamilies.has(q.variant_group);
    const priority = record ? (record.due <= now ? 0 : 2) : 1;
    return { q, recent, priority, noise: random() };
  }).sort((a,b) => a.priority-b.priority || a.noise-b.noise);
  const selected = [], used = new Set(), ids = new Set();
  for (const {q,recent} of ranked) {
    if (selected.length >= requested) break;
    if (!recent && !used.has(q.variant_group)) {
      selected.push(q); used.add(q.variant_group); ids.add(q.id);
    }
  }
  const freshCount = selected.length;
  // r/(fresh+r) <= .2 implies r <= floor(fresh/4). Never relax this cap.
  const budget = Math.min(requested-freshCount, Math.floor(freshCount/4));
  let repeatedCount = 0;
  for (const {q} of ranked) {
    if (repeatedCount >= budget) break;
    if (!ids.has(q.id)) { selected.push(q); ids.add(q.id); repeatedCount++; }
  }
  // Do not put every repeat at the end; shuffle the complete, capped selection.
  const questions = shuffle(selected, random);
  return { questions, requested, freshCount, repeatedCount, limited: questions.length < requested, repeatRate: questions.length ? repeatedCount/questions.length : 0 };
}
export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i=result.length-1; i>0; i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export function selectQuestions(pool, count, records = {}, random = Math.random, now = Date.now()) {
  return planSession(pool, count, records, {}, [], now, random).questions;
}
export function recordPresentation(state, exercise, now = Date.now()) {
  const timestamp = new Date(now).toISOString();
  state.exposures ??= {};
  state.history ??= [];
  const previous = state.exposures[exercise.id];
  state.exposures[exercise.id] = { last_seen_at: timestamp, seen_count: (previous?.seen_count || 0)+1 };
  state.history.push({ id: exercise.id, variant_group: exercise.variant_group, language: exercise.language, last_seen_at: timestamp });
  state.history = state.history.slice(-500);
  exercise.last_seen_at = timestamp;
  for (const item of exercise.items) item.last_seen_at = timestamp;
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
