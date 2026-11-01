import { LANGUAGE, TOPICS, TYPES, filterQuestions, selectQuestions, recordAnswer, summarize } from './core.js';
import { loadState, saveState } from './storage.js';

const main = document.querySelector('#main');
const notice = message => { const box = document.querySelector('#notice'); box.textContent = message; box.hidden = false; };
const state = loadState(notice);
const filters = { language: 'all', topic: 'all', difficulty: 'all', type: 'all', review: false, count: '10' };
let questions = [], view = 'practice', selected = null;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const persist = () => saveState(state, notice);
const option = (value, label, current) => `<option value="${escape(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escape(label)}</option>`;
const heading = (eyebrow, title, subtitle) => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><span class="version">version 0</span></div>`;
function updateNav() {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#review-count').textContent = summarize(state.records).review;
}
function statsCards() {
  const summary = summarize(state.records);
  return `<div class="stats-grid"><div class="stat-card"><span class="stat-icon">⌘</span><div><strong>1 000</strong><span>questions pour progresser</span></div></div><div class="stat-card"><span class="stat-icon">✓</span><div><strong>${summary.seen}<small> / 1 000</small></strong><span>questions pratiquées</span></div></div><div class="stat-card"><span class="stat-icon">↗</span><div><strong>${summary.attempts ? summary.success + '<small> %</small>' : '—'}</strong><span>de bonnes réponses</span></div></div></div>`;
}
function home() {
  const review = view === 'review';
  filters.review = review;
  const pool = filterQuestions(questions, filters, state.records);
  const availableTopics = [...new Set(questions.filter(q => filters.language === 'all' || q.language === filters.language).map(q => q.topic))].sort((a, b) => TOPICS[a].localeCompare(TOPICS[b], 'fr'));
  main.innerHTML = heading(review ? 'RÉPÉTER POUR RETENIR' : 'VOTRE RENDEZ-VOUS AVEC LE CODE', review ? 'Les erreurs font progresser<span>.</span>' : 'Un peu de pratique.<br>Beaucoup de déclics<span>.</span>', review ? 'Reprenez les notions à consolider, une question à la fois.' : 'Lisez le code, testez votre intuition et ancrez les bons réflexes en C et en Rust.')
    + statsCards() + (state.session ? `<div class="resume-banner"><div><strong>Votre séance vous attend.</strong><span>${state.session.answers.length} réponse(s) sur ${state.session.ids.length} · progression sauvegardée</span></div><button class="button small" id="resume">Reprendre →</button></div>` : '')
    + `<div class="practice-grid"><section class="panel setup"><div class="section-title"><span class="step">01</span><div><h2>${review ? 'Votre séance de révision' : 'Composez votre séance'}</h2><p>Quelques minutes. Une vraie progression.</p></div></div>
      <form id="setup-form"><fieldset><legend>Quel terrain d’entraînement ?</legend><div class="language-options">${Object.entries(LANGUAGE).map(([key, label]) => `<label class="language-choice"><input type="radio" name="language" value="${key}" ${filters.language === key ? 'checked' : ''}><span><b>${key === 'all' ? '〈/〉' : key === 'comparison' ? '⇄' : key === 'rust' ? 'Rs' : 'C'}</b>${label}</span></label>`).join('')}</div></fieldset>
      <div class="form-grid"><label>Thématique<select name="topic">${option('all', 'Toutes les thématiques', filters.topic)}${availableTopics.map(t => option(t, TOPICS[t], filters.topic)).join('')}</select></label><label>Difficulté<select name="difficulty">${option('all', 'Tous les niveaux', filters.difficulty)}${[1, 2, 3].map((n, i) => option(n, ['1 · Fondamentaux', '2 · Intermédiaire', '3 · Approfondissement'][i], filters.difficulty)).join('')}</select></label><label>Type de question<select name="type">${option('all', 'Tous les formats', filters.type)}${Object.entries(TYPES).map(([k, v]) => option(k, v, filters.type)).join('')}</select></label><label>Longueur de la séance<select name="count">${[5, 10, 20, 30].map(n => option(n, n + ' questions', filters.count)).join('')}</select></label></div>
      <div class="start-row"><span><b>${pool.length}</b> question${pool.length > 1 ? 's' : ''} disponible${pool.length > 1 ? 's' : ''}</span><button class="button" type="submit" ${!pool.length ? 'disabled' : ''}>${review ? 'Réviser' : 'Commencer'} <span aria-hidden="true">→</span></button></div>${!pool.length ? `<p class="empty-inline">${review ? 'Aucune erreur à revoir avec ces filtres. Pratiquez pour enrichir votre suivi.' : 'Aucune question ne correspond. Essayez d’autres filtres.'}</p>` : ''}</form></section>
      <aside class="session-aside"><div class="code-preview"><div class="code-toolbar"><span><i></i><i></i><i></i></span><span>un réflexe à la fois</span></div><pre aria-label="Exemple de code Rust"><code><span class="comment">// Comprendre avant d’exécuter.</span>\n<span class="keyword">fn</span> main() {\n    <span class="keyword">let</span> progrès = <span class="string">"un peu chaque jour"</span>;\n    println!(<span class="string">"{}"</span>, progrès);\n}</code></pre><span class="code-caption">LA PRATIQUE FAIT LA DIFFÉRENCE.</span></div><div class="how-it-works"><h3>Moins de théorie. Plus de déclics.</h3><p><span>01</span> Observez un extrait de code.</p><p><span>02</span> Choisissez votre réponse.</p><p><span>03</span> Comprenez grâce à la correction.</p></div></aside></div>
      <div class="pedagogy-note"><span aria-hidden="true">↳</span><p><strong>Apprendre les nuances, pas seulement la syntaxe.</strong> Propriété, emprunts, pointeurs, mémoire… Explorez ce qui rapproche et distingue les deux langages.</p><span class="outline-tag">76 familles de notions</span></div>`;
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
  state.session = { ids: chosen.map(q => q.id), answers: [], index: 0 };
  persist();
  renderSession();
}
function codeBlock(code, language) {
  return `<div class="exercise-code"><div class="code-toolbar"><span>${escape(language)}</span><span>LECTURE DE CODE</span></div><pre tabindex="0" aria-label="Extrait de code"><code>${code.split('\n').map((line, i) => `<span class="code-line"><span class="line-number" aria-hidden="true">${i + 1}</span><span>${escape(line) || ' '}</span></span>`).join('')}</code></pre></div>`;
}
function renderSession(focus = true) {
  const session = state.session;
  if (!session) return render();
  if (session.index >= session.ids.length) return results();
  const q = questions.find(q => q.id === session.ids[session.index]);
  const answer = session.answers[session.index];
  selected = answer?.choice ?? null;
  updateNav();
  main.innerHTML = `<div class="session-top"><button class="text-button" id="back">← Mon espace</button><span class="version">version 0</span></div><div class="session-heading"><div><div class="eyebrow">UN RÉFLEXE À LA FOIS</div><h1>À vous de jouer<span>.</span></h1></div><span class="question-counter">Question <b>${session.index + 1}</b> / ${session.ids.length}</span></div><progress class="session-progress" value="${session.answers.length}" max="${session.ids.length}" aria-label="Progression de la séance"></progress><section class="panel question-panel"><div class="question-meta"><span class="language-tag ${q.language}">${escape(LANGUAGE[q.language])}</span><span>${escape(TOPICS[q.topic])}</span><span>Niveau ${q.difficulty}</span><span class="question-id">${q.id}</span></div><div class="exercise-type">${escape(TYPES[q.type])} · ${escape(q.standard)}</div>${codeBlock(q.code, q.standard)}<h2 id="question-title">${escape(q.question)}</h2><div class="answers" role="group" aria-labelledby="question-title">${q.options.map((text, index) => `<button class="answer ${answer ? (index === q.correct_answer ? 'correct' : index === answer.choice ? 'incorrect' : '') : ''}" data-choice="${index}" aria-pressed="${selected === index}" ${answer ? 'disabled' : ''}><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${escape(text)}</span>${answer && index === q.correct_answer ? '<span class="answer-mark" aria-label="Bonne réponse">✓</span>' : ''}</button>`).join('')}</div><div id="feedback" aria-live="polite">${answer ? feedback(q, answer) : ''}</div><div class="question-actions"><span>${answer ? 'Un nouveau réflexe en construction.' : 'Prenez le temps de lire chaque ligne.'}</span><button class="button" id="validate" ${!answer ? 'disabled' : ''}>${answer ? session.index + 1 === session.ids.length ? 'Voir le bilan →' : 'Question suivante →' : 'Valider ma réponse'}</button></div></section><p class="snippet-note">${q.language === 'c' ? 'Les extraits C peuvent être placés dans main, avec les en-têtes usuels (stdio.h, stdlib.h, string.h).' : q.language === 'comparison' ? 'Les sections C et Rust sont deux extraits distincts à comparer.' : 'Extraits de référence : Rust 2021.'} Le code est à analyser ; il n’est pas exécuté.</p>`;
  document.querySelector('#back').addEventListener('click', render);
  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    if (session.answers[session.index]) return;
    selected = Number(button.dataset.choice);
    document.querySelectorAll('[data-choice]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('#validate').disabled = false;
  }));
  document.querySelector('#validate').addEventListener('click', () => {
    if (session.answers[session.index]) { session.index++; persist(); renderSession(); return; }
    if (selected === null) return;
    const correct = selected === q.correct_answer;
    session.answers.push({ id: q.id, choice: selected, correct });
    state.records[q.id] = recordAnswer(state.records[q.id], correct);
    persist(); renderSession(false);
    document.querySelector('#feedback').setAttribute('tabindex', '-1');
    document.querySelector('#feedback').focus();
  });
  if (focus) focusMain();
}
function feedback(q, answer) {
  return `<div class="feedback ${answer.correct ? 'success' : 'retry'}"><h3>${answer.correct ? '✓ Bien vu !' : '↳ Une notion à consolider'}</h3>${!answer.correct ? `<p><strong>Bonne réponse :</strong> ${escape(q.correct_option)}</p>` : ''}<p>${escape(q.explanation)}</p><div class="tags">${q.tags.map(tag => `<span>${escape(tag.replaceAll('_', ' '))}</span>`).join('')}</div></div>`;
}
function results() {
  const session = state.session;
  const score = session.answers.filter(a => a.correct).length;
  main.innerHTML = heading('SÉANCE TERMINÉE', 'Chaque déclic compte<span>.</span>', 'Prenez un instant pour revoir ce que vous venez d’apprendre.') + `<section class="panel results"><div class="score-circle"><strong>${score}<small> / ${session.ids.length}</small></strong><span>bonnes réponses</span></div><h2>${score === session.ids.length ? 'Un sans-faute. Bien joué !' : 'Les bons réflexes prennent forme.'}</h2><p>${session.ids.length - score} question(s) à consolider. Retrouvez-les dans « À revoir ».</p><div class="result-actions"><button class="button" id="finish">Retour à l’entraînement →</button><button class="text-button" id="review-result">Revoir mes erreurs</button></div></section><section class="result-list"><h2>Le fil de votre séance</h2>${session.answers.map(a => {
    const q = questions.find(q => q.id === a.id);
    return `<details><summary><span class="result-indicator ${a.correct ? 'good' : ''}">${a.correct ? '✓' : '↳'}</span><span>${escape(LANGUAGE[q.language])} · ${escape(q.question)}<small>${escape(TOPICS[q.topic])} · ${q.id}</small></span><span class="detail-plus">+</span></summary>${codeBlock(q.code, q.standard)}<p>Votre réponse : ${escape(q.options[a.choice])}</p>${feedback(q, a)}</details>`;
  }).join('')}</section>`;
  document.querySelector('#finish').addEventListener('click', () => { state.session = null; persist(); view = 'practice'; render(); });
  document.querySelector('#review-result').addEventListener('click', () => { state.session = null; persist(); view = 'review'; render(); });
  focusMain();
}
function statistics() {
  main.innerHTML = heading('VOS ACQUIS, PAS À PAS', 'La progression se construit<span>.</span>', 'Un aperçu de votre pratique et des notions à consolider.') + statsCards() + `<section class="panel progress-panel"><h2>Votre parcours par langage</h2><p>Chaque question pratiquée est une occasion de mieux comprendre.</p>${['c', 'rust', 'comparison'].map(language => {
    const pool = questions.filter(q => q.language === language);
    const records = Object.fromEntries(pool.filter(q => state.records[q.id]).map(q => [q.id, state.records[q.id]]));
    const summary = summarize(records);
    return `<div class="language-progress"><div><strong>${LANGUAGE[language]}</strong><span>${summary.seen} / ${pool.length} pratiquées</span></div><progress value="${summary.seen}" max="${pool.length}" aria-label="Questions pratiquées en ${LANGUAGE[language]}"></progress><small>${summary.attempts} réponse(s) · ${summary.success} % de réussite · ${summary.review} à revoir</small></div>`;
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
    const banks = await Promise.all(['c', 'rust', 'comparison'].map(async language => {
      const response = await fetch(`database/questions_${language}.json`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }));
    questions = banks.flat();
    const session = state.session;
    if (session && (!Array.isArray(session.ids) || !session.ids.length || !Array.isArray(session.answers) || !Number.isInteger(session.index) || session.index < 0 || session.index > session.ids.length || session.answers.length < session.index || session.answers.length > session.index + 1 || session.answers.length > session.ids.length || session.ids.some(id => !questions.some(q => q.id === id)) || session.answers.some((a, i) => !a || a.id !== session.ids[i] || !Number.isInteger(a.choice) || a.choice < 0 || a.choice >= questions.find(q => q.id === a.id).options.length || a.correct !== (a.choice === questions.find(q => q.id === a.id).correct_answer)))) {
      state.session = null; persist();
    }
    render();
  } catch {
    main.innerHTML = '<section class="panel error-panel"><h1>L’atelier n’a pas pu charger.</h1><p>Vérifiez votre connexion et rechargez la page. En local, utilisez un serveur HTTP comme indiqué dans le README.</p><button class="button" id="reload">Réessayer</button></section>';
    document.querySelector('#reload').addEventListener('click', () => location.reload());
  }
}
init();
