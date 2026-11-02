import { BANK_FILES, LANGUAGE, TOPICS, TYPES, normalizeQuestions, validSelections, gradeExercise, restoreSession, filterQuestions, selectQuestions, recordAnswer, summarize } from './core.js';
import { loadState, saveState } from './storage.js';

const main = document.querySelector('#main');
const notice = message => { const box = document.querySelector('#notice'); box.textContent = message; box.hidden = false; };
const state = loadState(notice);
const settings = document.querySelector('#settings');
const themeChoice = document.querySelector('#theme-choice');
function updateThemeSettings() {
  themeChoice.value = window.atelierTheme.preference;
  document.querySelector('#theme-description').textContent = window.atelierTheme.preference === 'system'
    ? window.atelierTheme.detectsSystem
      ? `Suit le réglage du navigateur : ${document.documentElement.dataset.theme === 'dark' ? 'sombre' : 'clair'}.`
      : 'Détection du système indisponible. Choisissez Clair ou Sombre.'
    : `Le thème ${window.atelierTheme.preference === 'dark' ? 'sombre' : 'clair'} est activé.`;
}
document.querySelector('#open-settings').addEventListener('click', () => { updateThemeSettings(); settings.showModal(); });
themeChoice.addEventListener('change', () => {
  if (!window.atelierTheme.setPreference(themeChoice.value)) notice('Le thème est appliqué pour cette visite, mais son enregistrement sur cet appareil est indisponible.');
});
window.addEventListener('atelier-theme-change', updateThemeSettings);
updateThemeSettings();
const filters = { language: 'all', topic: 'all', difficulty: 'all', type: 'all', review: false, count: '10' };
let questions = [], view = 'practice';
const number = value => value.toLocaleString('fr-FR');
const activeRecords = () => Object.fromEntries(questions.filter(q => state.records[q.id]).map(q => [q.id, state.records[q.id]]));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const persist = () => saveState(state, notice);
const option = (value, label, current) => `<option value="${escape(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escape(label)}</option>`;
const heading = (eyebrow, title, subtitle) => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><span class="version">version 1.0</span></div>`;
function updateNav() {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#review-count').textContent = summarize(activeRecords()).review;
}
function statsCards() {
  const summary = summarize(activeRecords());
  const total = number(questions.length);
  const parts = number(questions.reduce((sum, q) => sum + q.items.length, 0));
  return `<div class="stats-grid"><div class="stat-card"><span class="stat-icon">⌘</span><div><strong>${total}</strong><span>exercices · ${parts} questions</span></div></div><div class="stat-card"><span class="stat-icon">✓</span><div><strong>${summary.seen}<small> / ${total}</small></strong><span>exercices pratiqués</span></div></div><div class="stat-card"><span class="stat-icon">↗</span><div><strong>${summary.attempts ? summary.success + '<small> %</small>' : '—'}</strong><span>d’exercices entièrement réussis</span></div></div></div>`;
}
function home() {
  const review = view === 'review';
  filters.review = review;
  const pool = filterQuestions(questions, filters, state.records);
  const availableTopics = [...new Set(questions.filter(q => filters.language === 'all' || q.language === filters.language).map(q => q.topic))].sort((a, b) => TOPICS[a].localeCompare(TOPICS[b], 'fr'));
  main.innerHTML = heading(review ? 'RÉPÉTER POUR RETENIR' : 'VOTRE RENDEZ-VOUS AVEC LE CODE', review ? 'Les erreurs font progresser<span>.</span>' : 'Un peu de pratique.<br>Beaucoup de déclics<span>.</span>', review ? 'Reprenez les notions à consolider, une question à la fois.' : 'Lisez le code, testez votre intuition et ancrez les bons réflexes en C, en C++ et en Rust.')
    + statsCards() + (state.session ? `<div class="resume-banner"><div><strong>Votre séance vous attend.</strong><span>${state.session.answers.length} exercice(s) sur ${state.session.ids.length} · progression sauvegardée</span></div><button class="button small" id="resume">Reprendre →</button></div>` : '')
    + `<div class="practice-grid"><section class="panel setup"><div class="section-title"><span class="step">01</span><div><h2>${review ? 'Votre séance de révision' : 'Composez votre séance'}</h2><p>Quelques minutes. Une vraie progression.</p></div></div>
      <form id="setup-form"><fieldset><legend>Quel terrain d’entraînement ?</legend><div class="language-options">${Object.entries(LANGUAGE).map(([key, label]) => `<label class="language-choice"><input type="radio" name="language" value="${key}" ${filters.language === key ? 'checked' : ''}><span><b>${key === 'all' ? '〈/〉' : key === 'rust' ? 'Rs' : key === 'cpp' ? 'C++' : 'C'}</b>${label}</span></label>`).join('')}</div></fieldset>
      <div class="form-grid"><label>Thématique<select name="topic">${option('all', 'Toutes les thématiques', filters.topic)}${availableTopics.map(t => option(t, TOPICS[t], filters.topic)).join('')}</select></label><label>Difficulté<select name="difficulty">${option('all', 'Tous les niveaux', filters.difficulty)}${[1, 2, 3].map((n, i) => option(n, ['1 · Fondamentaux', '2 · Intermédiaire', '3 · Approfondissement'][i], filters.difficulty)).join('')}</select></label><label>Type de question<select name="type">${option('all', 'Tous les formats', filters.type)}${Object.entries(TYPES).map(([k, v]) => option(k, v, filters.type)).join('')}</select></label><label>Longueur de la séance<select name="count">${[5, 10, 20, 30].map(n => option(n, n + ' exercices', filters.count)).join('')}</select></label></div>
      <div class="start-row"><span><b>${pool.length}</b> exercice${pool.length > 1 ? 's' : ''} disponible${pool.length > 1 ? 's' : ''}</span><button class="button" type="submit" ${!pool.length ? 'disabled' : ''}>${review ? 'Réviser' : 'Commencer'} <span aria-hidden="true">→</span></button></div>${!pool.length ? `<p class="empty-inline">${review ? 'Aucune erreur à revoir avec ces filtres. Pratiquez pour enrichir votre suivi.' : 'Aucun exercice ne correspond. Essayez d’autres filtres.'}</p>` : ''}</form></section>
      <aside class="session-aside"><div class="code-preview"><div class="code-toolbar"><span><i></i><i></i><i></i></span><span>un réflexe à la fois</span></div><pre aria-label="Exemple de code Rust"><code><span class="comment">// Comprendre avant d’exécuter.</span>\n<span class="keyword">fn</span> main() {\n    <span class="keyword">let</span> progrès = <span class="string">"un peu chaque jour"</span>;\n    println!(<span class="string">"{}"</span>, progrès);\n}</code></pre><span class="code-caption">LA PRATIQUE FAIT LA DIFFÉRENCE.</span></div><div class="how-it-works"><h3>Moins de théorie. Plus de déclics.</h3><p><span>01</span> Observez un extrait de code.</p><p><span>02</span> Répondez à chaque question.</p><p><span>03</span> Comprenez grâce à la correction.</p></div></aside></div>
      <div class="pedagogy-note"><span aria-hidden="true">↳</span><p><strong>Apprendre les nuances, pas seulement la syntaxe.</strong> Propriété, emprunts, pointeurs, mémoire… Explorez ce qui rapproche et distingue les deux langages.</p><span class="outline-tag">${new Set(questions.map(q => q.variant_group)).size} familles de notions</span></div>`;
  document.querySelector('#setup-form').addEventListener('change', event => {
    filters[event.target.name] = event.target.value;
    if (event.target.name === 'language') filters.topic = 'all';
    const name = event.target.name;
    home();
    document.querySelector(`[name="${name}"]${name === 'language' ? ':checked' : ''}`)?.focus();
  });
  document.querySelector('#setup-form').addEventListener('submit', event => { event.preventDefault(); start(); });
  document.querySelector('#resume')?.addEventListener('click', renderSession);
}
function start() {
  if (state.session && !window.confirm('Remplacer la séance en cours ? Les réponses déjà enregistrées seront conservées.')) return;
  const chosen = selectQuestions(filterQuestions(questions, filters, state.records), Number(filters.count), state.records);
  if (!chosen.length) return;
  state.session = { ids: chosen.map(q => q.id), answers: [], index: 0, draft: null };
  persist();
  renderSession();
}
function codeBlock(code, language) {
  return `<div class="exercise-code"><div class="code-toolbar"><span>${escape(language)}</span><span>LECTURE DE CODE</span></div><pre tabindex="0" aria-label="${escape(language)} : extrait de code"><code>${code.split('\n').map((line, i) => `<span class="code-line"><span class="line-number" aria-hidden="true">${i + 1}</span><span>${escape(line) || ' '}</span></span>`).join('')}</code></pre></div>`;
}
function exerciseCode(exercise) {
  return exercise.snippets.map(snippet => codeBlock(snippet.code, `${snippet.label ? `Extrait ${snippet.label} · ` : ''}${exercise.standard}`)).join('');
}
function answerFields(exercise, answer, selections) {
  return exercise.items.map((item, part) => `<fieldset class="question-part"><legend>${exercise.items.length > 1 ? `<span class="part-number">Question ${part + 1} / ${exercise.items.length}</span>` : ''}${escape(item.prompt)}</legend><p class="selection-hint">${item.kind === 'multiple_choice' ? 'Plusieurs réponses possibles : cochez toutes les affirmations correctes.' : 'Une seule réponse attendue.'}</p><div class="answers">${item.options.map((text, index) => {
    const checked = selections[part].includes(index);
    const correct = item.answers.includes(index);
    return `<label class="answer ${checked ? 'selected' : ''} ${answer ? correct ? 'correct' : checked ? 'incorrect' : '' : ''}"><input class="answer-input" type="${item.kind === 'multiple_choice' ? 'checkbox' : 'radio'}" name="part-${part}" data-part="${part}" data-choice="${index}" value="${index}" ${checked ? 'checked' : ''} ${answer ? 'disabled' : ''}><span class="answer-text">${escape(text)}</span>${answer && correct ? `<span class="answer-mark" aria-label="Bonne réponse${checked ? '' : ' non sélectionnée'}">✓${checked ? '' : '<small> à sélectionner</small>'}</span>` : ''}</label>`;
  }).join('')}</div></fieldset>`).join('');
}
function renderSession(focus = true) {
  const session = state.session;
  if (!session) return render();
  if (session.index >= session.ids.length) return results();
  const q = questions.find(q => q.id === session.ids[session.index]);
  const answer = session.answers[session.index];
  const selections = answer?.choices || (validSelections(q, session.draft) ? session.draft : q.items.map(() => []));
  updateNav();
  main.innerHTML = `<div class="session-top"><button class="text-button" id="back">← Mon espace</button><span class="version">version 1.0</span></div><div class="session-heading"><div><div class="eyebrow">UN RÉFLEXE À LA FOIS</div><h1>À vous de jouer<span>.</span></h1></div><span class="question-counter">Exercice <b>${session.index + 1}</b> / ${session.ids.length}</span></div><progress class="session-progress" value="${session.answers.length}" max="${session.ids.length}" aria-label="Progression de la séance"></progress><section class="panel question-panel"><div class="question-meta"><span class="language-tag ${q.language}">${escape(LANGUAGE[q.language])}</span><span>${escape(TOPICS[q.topic])}</span><span>Niveau ${q.difficulty}</span><span class="question-id">${q.id}</span></div><div class="exercise-type">${escape(TYPES[q.type])} · ${escape(q.standard)}</div>${exerciseCode(q)}${q.items.length > 1 ? `<p class="shared-code-note">${q.snippets.length > 1 ? `${q.snippets.length} extraits distincts, repérés par leur lettre` : 'Un code'}, ${q.items.length} questions. Répondez à toutes les questions avant de valider. Pour réussir l’exercice, chaque réponse doit être exacte.</p>` : ''}${answerFields(q, answer, selections)}<div id="feedback" aria-live="polite">${answer ? feedback(q, answer) : ''}</div><div class="question-actions"><span>${answer ? `${answer.score} / ${answer.total} question(s) réussie(s).` : 'Les corrections apparaissent après validation.'}</span><button class="button" id="validate" ${!answer && !validSelections(q, selections, true) ? 'disabled' : ''}>${answer ? session.index + 1 === session.ids.length ? 'Voir le bilan →' : 'Exercice suivant →' : 'Valider mes réponses'}</button></div></section><p class="snippet-note">${q.language === 'c' ? 'Les extraits C peuvent être placés dans main, avec les en-têtes usuels (stdio.h, stdlib.h, string.h).' : `Extraits de référence : ${escape(q.standard)}.${q.snippets.length > 1 ? ' Chaque extrait se lit séparément.' : ''}`} Le code est à analyser ; il n’est pas exécuté.</p>`;
  document.querySelector('#back').addEventListener('click', render);
  document.querySelectorAll('[data-choice]').forEach(input => input.addEventListener('change', () => {
    if (session.answers[session.index]) return;
    const part = Number(input.dataset.part);
    selections[part] = [...document.querySelectorAll(`[data-part="${part}"]:checked`)].map(el => Number(el.value));
    document.querySelectorAll('[data-choice]').forEach(el => el.closest('.answer').classList.toggle('selected', el.checked));
    session.draft = selections;
    persist();
    document.querySelector('#validate').disabled = !validSelections(q, selections, true);
  }));
  document.querySelector('#validate').addEventListener('click', () => {
    if (session.answers[session.index]) { session.index++; session.draft = null; persist(); renderSession(); return; }
    if (!validSelections(q, selections, true)) return;
    const grade = gradeExercise(q, selections);
    session.answers.push({ id: q.id, choices: selections.map(values => [...values]), ...grade });
    state.records[q.id] = recordAnswer(state.records[q.id], grade.correct);
    session.draft = null;
    persist(); renderSession(false);
    document.querySelector('#feedback').setAttribute('tabindex', '-1');
    document.querySelector('#feedback').focus();
  });
  if (focus) focusMain();
}
function feedback(q, answer) {
  return q.items.map((item, part) => `<div class="feedback ${answer.parts[part] ? 'success' : 'retry'}"><h3>${q.items.length > 1 ? `Question ${part + 1} · ` : ''}${answer.parts[part] ? '✓ Bien vu !' : '↳ Une notion à consolider'}</h3><p><strong>${answer.choices[part].length > 1 ? 'Vos réponses' : 'Votre réponse'} :</strong></p><ul>${answer.choices[part].map(n => `<li>${escape(item.options[n])}</li>`).join('')}</ul><p><strong>Réponse${item.answers.length > 1 ? 's' : ''} attendue${item.answers.length > 1 ? 's' : ''} :</strong></p><ul>${item.answers.map(n => `<li>${escape(item.options[n])}</li>`).join('')}</ul><p>${escape(item.explanation)}</p></div>`).join('') + `<div class="tags">${q.tags.map(tag => `<span>${escape(tag.replaceAll('_', ' '))}</span>`).join('')}</div>`;
}
function results() {
  const session = state.session;
  const score = session.answers.filter(a => a.correct).length;
  const partScore = session.answers.reduce((sum, a) => sum + a.score, 0);
  const partTotal = session.answers.reduce((sum, a) => sum + a.total, 0);
  main.innerHTML = heading('SÉANCE TERMINÉE', 'Chaque déclic compte<span>.</span>', 'Prenez un instant pour revoir ce que vous venez d’apprendre.') + `<section class="panel results"><div class="score-circle"><strong>${score}<small> / ${session.ids.length}</small></strong><span>exercices réussis</span></div><h2>${score === session.ids.length ? 'Un sans-faute. Bien joué !' : 'Les bons réflexes prennent forme.'}</h2><p>${partScore} / ${partTotal} questions réussies.<br>${session.ids.length - score} exercice(s) à consolider. Retrouvez-les dans « À revoir ».</p><div class="result-actions"><button class="button" id="finish">Retour à l’entraînement →</button><button class="text-button" id="review-result">Revoir mes erreurs</button></div></section><section class="result-list"><h2>Le fil de votre séance</h2>${session.answers.map(a => {
    const q = questions.find(q => q.id === a.id);
    return `<details><summary><span class="result-indicator ${a.correct ? 'good' : ''}">${a.correct ? '✓' : '↳'}</span><span>${escape(LANGUAGE[q.language])} · ${escape(q.question)}<small>${escape(TOPICS[q.topic])} · ${q.id} · ${a.score} / ${a.total} questions réussies</small></span><span class="detail-plus">+</span></summary>${exerciseCode(q)}${q.items.map((item, i) => `<h3 class="result-prompt">${i + 1}. ${escape(item.prompt)}</h3>${feedback({ ...q, items: [item] }, { choices: [a.choices[i]], parts: [a.parts[i]] })}`).join('')}</details>`;
  }).join('')}</section>`;
  document.querySelector('#finish').addEventListener('click', () => { state.session = null; persist(); view = 'practice'; render(); });
  document.querySelector('#review-result').addEventListener('click', () => { state.session = null; persist(); view = 'review'; render(); });
  focusMain();
}
function statistics() {
  main.innerHTML = heading('VOS ACQUIS, PAS À PAS', 'La progression se construit<span>.</span>', 'Un aperçu de votre pratique et des notions à consolider.') + statsCards() + `<section class="panel progress-panel"><h2>Votre parcours par langage</h2><p>Chaque exercice pratiqué est une occasion de mieux comprendre.</p>${['c', 'cpp', 'rust'].map(language => {
    const pool = questions.filter(q => q.language === language);
    const records = Object.fromEntries(pool.filter(q => state.records[q.id]).map(q => [q.id, state.records[q.id]]));
    const summary = summarize(records);
    return `<div class="language-progress"><div><strong>${LANGUAGE[language]}</strong><span>${summary.seen} / ${pool.length} pratiquées</span></div><progress value="${summary.seen}" max="${pool.length}" aria-label="Exercices pratiqués en ${LANGUAGE[language]}"></progress><small>${summary.attempts} tentative(s) · ${summary.success} % de réussite · ${summary.review} à revoir</small></div>`;
  }).join('')}</section><section class="panel topic-panel"><h2>Notion par notion</h2><div class="topic-grid">${Object.keys(TOPICS).map(topic => {
    const pool = questions.filter(q => q.topic === topic), seen = pool.filter(q => state.records[q.id]).length;
    return `<div><span>${TOPICS[topic]}</span><small>${seen} / ${pool.length}</small><progress value="${seen}" max="${pool.length}" aria-label="${TOPICS[topic]}"></progress></div>`;
  }).join('')}</div></section><p class="privacy-note">Votre progression est enregistrée uniquement dans ce navigateur. Elle n’est pas synchronisée entre appareils et peut disparaître si les données du site sont effacées. En navigation privée, elle peut être supprimée à la fermeture.</p>`;
}
function focusMain() { main.focus(); window.scrollTo({ top: 0, behavior: 'auto' }); }
function render() { updateNav(); if (view === 'stats') statistics(); else home(); focusMain(); }
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; render(); }));
async function init() {
  try {
    const banks = await Promise.all(BANK_FILES.map(async file => {
      const response = await fetch(`database/${file}`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }));
    questions = normalizeQuestions(banks);
    const previousSession = state.session;
    state.session = restoreSession(previousSession, questions);
    if (previousSession && !state.session) notice('Cette séance contient un exercice retiré ou modifié. Vos acquis sont conservés ; vous pouvez commencer une nouvelle séance.');
    persist();
    render();
  } catch {
    main.innerHTML = '<section class="panel error-panel"><h1>L’atelier n’a pas pu charger.</h1><p>Vérifiez votre connexion et rechargez la page. En local, utilisez un serveur HTTP comme indiqué dans le README.</p><button class="button" id="reload">Réessayer</button></section>';
    document.querySelector('#reload').addEventListener('click', () => location.reload());
  }
}
init();
