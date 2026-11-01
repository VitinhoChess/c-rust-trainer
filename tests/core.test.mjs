import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterQuestions, selectQuestions, recordAnswer, summarize, TOPICS, TYPES } from '../assets/core.js';
import { validState } from '../assets/storage.js';
const banks = await Promise.all(['c', 'rust', 'comparison'].map(async language => JSON.parse(await readFile(new URL(`../database/questions_${language}.json`, import.meta.url), 'utf8'))));
const questions = banks.flat();
const defaults = { language: 'all', topic: 'all', difficulty: 'all', type: 'all', review: false };
test('la banque contient 1000 questions cohérentes et des identifiants uniques', () => {
  assert.deepEqual(banks.map(b => b.length), [450, 450, 100]);
  assert.equal(new Set(questions.map(q => q.id)).size, 1000);
  for (const q of questions) {
    assert.ok(TOPICS[q.topic], q.id);
    assert.ok(TYPES[q.type], q.id);
    assert.equal(q.options[q.correct_answer], q.correct_option, q.id);
    assert.ok(q.explanation && q.code && q.variant_group, q.id);
    assert.ok(q.difficulty >= 1 && q.difficulty <= 3);
  }
});
test('les filtres se combinent et la révision exclut les erreurs corrigées', () => {
  const result = filterQuestions(questions, { ...defaults, language: 'rust', difficulty: '3', topic: 'borrowing', type: 'compilation' });
  assert.ok(result.length > 0);
  assert.ok(result.every(q => q.language === 'rust' && q.difficulty === 3 && q.topic === 'borrowing' && q.type === 'compilation'));
  const records = { [questions[0].id]: { lastCorrect: false }, [questions[1].id]: { lastCorrect: true } };
  assert.deepEqual(filterQuestions(questions, { ...defaults, review: true }, records), [questions[0]]);
});
test('la sélection diversifie les familles et ne duplique pas les questions', () => {
  const result = selectQuestions(questions, 30);
  assert.equal(result.length, 30);
  assert.equal(new Set(result.map(q => q.variant_group)).size, 30);
  assert.equal(selectQuestions(questions.slice(0, 3), 10).length, 3);
});
test('les questions dues sont prioritaires dans des familles distinctes', () => {
  const pool = [{ id: 'a', variant_group: 'a' }, { id: 'b', variant_group: 'b' }, { id: 'c', variant_group: 'c' }];
  assert.deepEqual(selectQuestions(pool, 3, { a: { due: 200 }, c: { due: 50 } }, () => .5, 100).map(q => q.id), ['c', 'b', 'a']);
});
test('les erreurs reviennent et les réussites espacent la répétition', () => {
  const wrong = recordAnswer(null, false, 100);
  const right = recordAnswer(wrong, true, 200);
  const next = recordAnswer(right, true, 300);
  assert.equal(wrong.due, 100);
  assert.equal(right.due, 86400200);
  assert.equal(next.due, 172800300);
  assert.deepEqual(summarize({ a: next, b: wrong }), { seen: 2, attempts: 4, success: 50, review: 1 });
  assert.equal(recordAnswer(next, false, 500).streak, 0);
  assert.equal(validState({ version: 1, records: { a: next } }), true);
  assert.equal(validState({ version: 1, records: { a: { attempts: -1 } } }), false);
});
