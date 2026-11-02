import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BANK_FILES, LANGUAGE, normalizeQuestions, validSelections, gradeExercise, restoreSession, filterQuestions, selectQuestions, recordAnswer, summarize, TOPICS, TYPES } from '../assets/core.js';
import { validState } from '../assets/storage.js';
const banks = await Promise.all(BANK_FILES.map(async file => JSON.parse(await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8'))));
const questions = normalizeQuestions(banks);
const defaults = { language: 'all', topic: 'all', difficulty: 'all', type: 'all', review: false };
const grouped = questions.find(q => q.items.length > 1);
const simple = questions.find(q => q.items.length === 1);
const exact = q => q.items.map(item => [...item.answers]);

test('2100 exercices C/C++/Rust, 3050 questions, aucune archive', () => {
  assert.deepEqual(banks.map(b => b.length), [450, 450, 350, 350, 500]);
  assert.equal(questions.length, 2100);
  assert.equal(questions.reduce((sum, q) => sum + q.items.length, 0), 3050);
  assert.equal(new Set(questions.map(q => q.id)).size, 2100);
  assert.deepEqual(Object.keys(LANGUAGE), ['all', 'c', 'cpp', 'rust']);
  assert.ok(BANK_FILES.every(file => !/comparison|archive/.test(file)));
  for (const q of questions) {
    assert.ok(TOPICS[q.topic] && TYPES[q.type], q.id);
    assert.ok(q.explanation && q.snippets.length && q.variant_group, q.id);
    assert.ok(q.difficulty >= 1 && q.difficulty <= 3);
    assert.ok(gradeExercise(q, exact(q)).correct, q.id);
    for (const item of q.items) assert.ok(item.options.every(text => typeof text === 'string'));
  }
});
test('les champs legacy de Q1 ne créent pas une troisième question', () => {
  assert.equal(grouped.items.length, 2);
  assert.equal(grouped.items[0].kind, 'single_choice');
  assert.equal(grouped.items[1].kind, 'multiple_choice');
  assert.equal(questions.filter(q => q.items.length === 2).length, 950);
  assert.ok(questions.some(q => q.topic === 'structures' && q.id.includes('ADD')));
  assert.ok(questions.some(q => q.topic === 'control_flow' && q.id.includes('ADD')));
});
test('réponses multiples : exactitude sans tenir compte de l’ordre, pas de crédit pour une réponse manquante ou supplémentaire', () => {
  const answer = exact(grouped);
  answer[1].reverse();
  assert.deepEqual(gradeExercise(grouped, answer), { correct: true, parts: [true, true], score: 2, total: 2 });
  answer[1].pop();
  assert.deepEqual(gradeExercise(grouped, answer), { correct: false, parts: [true, false], score: 1, total: 2 });
  answer[1] = [...grouped.items[1].answers, 2];
  assert.equal(gradeExercise(grouped, answer).correct, false);
  assert.equal(gradeExercise(simple, exact(simple)).correct, true);
});
test('validation : toutes les questions sont requises, doublons et indices invalides refusés', () => {
  assert.equal(validSelections(grouped, [[], []]), true);
  assert.equal(validSelections(grouped, [[], []], true), false);
  assert.throws(() => gradeExercise(grouped, [grouped.items[0].answers, []]));
  for (const choices of [[[0, 1], [0]], [[-1], [0]], [[0], [0, 0]], [[0], [99]], [[0]]]) assert.equal(validSelections(grouped, choices, true), false);
});
test('filtres combinés et nouveaux formats sans séparer les questions d’un code', () => {
  const result = filterQuestions(questions, { ...defaults, language: 'rust', difficulty: '3', topic: 'borrowing', type: 'compilation' });
  assert.ok(result.length > 0);
  assert.ok(result.every(q => q.language === 'rust' && q.difficulty === 3 && q.topic === 'borrowing' && q.type === 'compilation'));
  const multiple = filterQuestions(questions, { ...defaults, type: 'multiple_choice' });
  assert.equal(multiple.length, 950);
  assert.ok(multiple.every(q => q.items.length === 2));
  const records = { [questions[0].id]: { lastCorrect: false }, [questions[1].id]: { lastCorrect: true } };
  assert.deepEqual(filterQuestions(questions, { ...defaults, review: true }, records), [questions[0]]);
});
test('reprise des séances anciennes à réponse unique et des nouveaux brouillons multiples', () => {
  const migrated = restoreSession({ ids: [simple.id], answers: [{ id: simple.id, choice: simple.items[0].answers[0], correct: true }], index: 0 }, questions);
  assert.deepEqual(migrated.answers[0].choices, exact(simple));
  assert.equal(migrated.answers[0].score, 1);
  const draft = [[0], [1, 2]];
  assert.deepEqual(restoreSession({ ids: [grouped.id], answers: [], index: 0, draft }, questions).draft, draft);
  assert.equal(restoreSession({ ids: ['CR-0001'], answers: [], index: 0 }, questions), null);
  assert.equal(restoreSession({ ids: [simple.id], answers: [{ id: simple.id, choices: exact(simple), correct: false }], index: 0 }, questions), null);
});
test('la sélection diversifie les familles sans dupliquer les exercices', () => {
  const result = selectQuestions(questions, 30);
  assert.equal(result.length, 30);
  assert.equal(new Set(result.map(q => q.variant_group)).size, 30);
  assert.equal(selectQuestions(questions.slice(0, 3), 10).length, 3);
});
test('les exercices dus sont prioritaires dans des familles distinctes', () => {
  const pool = [{ id: 'a', variant_group: 'a' }, { id: 'b', variant_group: 'b' }, { id: 'c', variant_group: 'c' }];
  assert.deepEqual(selectQuestions(pool, 3, { a: { due: 200 }, c: { due: 50 } }, () => .5, 100).map(q => q.id), ['c', 'b', 'a']);
});
test('les erreurs reviennent et les réussites espacent la répétition', () => {
  const wrong = recordAnswer(null, false, 100), right = recordAnswer(wrong, true, 200), next = recordAnswer(right, true, 300);
  assert.equal(wrong.due, 100);
  assert.equal(right.due, 86400200);
  assert.equal(next.due, 172800300);
  assert.deepEqual(summarize({ a: next, b: wrong }), { seen: 2, attempts: 4, success: 50, review: 1 });
  assert.equal(recordAnswer(next, false, 500).streak, 0);
  assert.equal(validState({ version: 1, records: { a: next } }), true);
  assert.equal(validState({ version: 1, records: { a: { attempts: -1 } } }), false);
});

test('C++ : prédictions, thèmes et tous les extraits A/B/C préservés', () => {
  const cpp = filterQuestions(questions, { ...defaults, language: 'cpp' });
  assert.equal(cpp.length, 500);
  assert.equal(cpp.reduce((sum, q) => sum + q.items.length, 0), 750);
  assert.equal(cpp.filter(q => q.type === 'prediction').length, 125);
  assert.ok(cpp.every(q => q.standard === 'C++17'));
  assert.ok(cpp.every(q => gradeExercise(q, exact(q)).correct));
  for (const q of cpp) {
    const original = banks[4].find(source => source.id === q.id);
    assert.deepEqual(q.snippets.map(snippet => snippet.code), original.snippets ? original.snippets.map(snippet => snippet.code) : [original.code]);
    if (original.snippets) assert.deepEqual(q.snippets.map(snippet => snippet.label), original.snippets.map(snippet => snippet.label));
  }
  const group = cpp.find(q => q.id === 'CPP-M-0001');
  assert.deepEqual(group.snippets.map(snippet => snippet.label), ['A', 'B', 'C']);
  assert.deepEqual(group.items[1].answers, [0, 1, 2]);
  assert.equal(gradeExercise(group, [group.items[0].answers, [0, 1]]).correct, false);
  assert.equal(cpp.find(q => q.topic === 'strings').language, 'cpp');
  assert.equal(filterQuestions(questions, { ...defaults, language: 'cpp', topic: 'references' }).length, 50);
});
test('les extraits mal formés ou les repères dupliqués sont rejetés', () => {
  const source = banks[4].find(q => q.snippets);
  assert.throws(() => normalizeQuestions([[{ ...source, snippets: [] }]]));
  assert.throws(() => normalizeQuestions([[{ ...source, snippets: [{ label: 'A', code: 'x' }, { label: 'A', code: 'y' }] }]]));
});
