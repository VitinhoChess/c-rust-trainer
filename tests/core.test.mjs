import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BANK_FILES, LANGUAGE, TOPICS, TYPES, normalizeQuestions, validSelections, gradeExercise, restoreSession, filterQuestions, planSession, recordPresentation, recordAnswer, summarize, shuffle, RECENT_WINDOW_MS } from '../assets/core.js';
import { validState } from '../assets/storage.js';
const banks = await Promise.all(BANK_FILES.map(async file => JSON.parse(await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8'))));
const questions = normalizeQuestions(banks);
const defaults = { language:'all',topic:'all',difficulty:'all',type:'all',review:false };
const exact = q => q.items.map(item => [...item.answers]);
const now = Date.UTC(2026,10,3,12);
const iso = value => new Date(value).toISOString();
const grouped = questions.find(q => q.items.length===2);
const simple = questions.find(q => q.items.length===1 && q.items[0].kind==='single_choice');
const pool = n => Array.from({length:n},(_,i)=>({id:'q'+i,variant_group:'g'+i,last_seen_at:null}));

test('trois banques, 300 exercices chacune, 100 par niveau, 1080 questions', () => {
  assert.deepEqual(BANK_FILES,['questions_c.json','questions_cpp.json','questions_rust.json']);
  assert.deepEqual(banks.map(bank=>bank.length),[300,300,300]);
  assert.equal(questions.length,900);
  assert.equal(questions.reduce((sum,q)=>sum+q.items.length,0),1080);
  assert.equal(new Set(questions.map(q=>q.id)).size,900);
  for (const bank of banks) {
    for (const level of [1,2,3]) assert.equal(bank.filter(q=>q.difficulty===level).length,100);
    assert.equal(new Set(bank.map(q=>q.variant_group)).size,60);
    assert.ok(new Set(bank.map(q=>q.topic)).size>=12);
    for (const q of bank) {
      assert.equal(q.last_seen_at,null);
      assert.equal(q.seen_count,0);
      assert.ok(q.verification);
      for (const part of q.questions||[q]) assert.equal(part.last_seen_at,null);
    }
  }
  assert.deepEqual(Object.keys(LANGUAGE),['all','c','cpp','rust']);
});
test('les réponses multiples varient en nombre et en positions, sans options identiques', () => {
  for (const bank of banks) {
    const parts=bank.flatMap(q=>q.questions||[q]);
    const multiple=parts.filter(part=>part.type==='multiple_choice');
    assert.deepEqual([...new Set(multiple.map(part=>part.correct_answers.length))].sort(),[1,2,3]);
    for (const count of [1,2,3]) assert.equal(multiple.filter(part=>part.correct_answers.length===count).length,60);
    assert.ok(new Set(multiple.map(part=>part.correct_answers.join(','))).size>=12);
    assert.ok(new Set(parts.filter(part=>part.type==='single_choice').map(part=>part.correct_answer)).size===4);
    assert.ok(parts.every(part=>new Set(part.options).size===part.options.length));
    assert.ok(parts.every(part=>!part.options.some(option=>option.startsWith('La valeur calculée est'))));
  }
});
test('toutes les métadonnées, extraits et corrections sont exploitables', () => {
  for (const q of questions) {
    assert.ok(TOPICS[q.topic]&&TYPES[q.type],q.id);
    assert.ok(q.snippets.length&&q.explanation,q.id);
    assert.equal(gradeExercise(q,exact(q)).correct,true,q.id);
  }
  assert.equal(grouped.items.length,2);
  assert.equal(simple.items.length,1);
});
test('notation exacte : toute option manquante ou en trop rend la réponse incorrecte', () => {
  const q=questions.find(q=>q.items.some(p=>p.answers.length===2));
  const choices=exact(q), index=q.items.findIndex(p=>p.answers.length===2);
  choices[index].reverse();assert.equal(gradeExercise(q,choices).correct,true);
  choices[index].pop();assert.equal(gradeExercise(q,choices).correct,false);
  const excess=exact(q);excess[index].push(q.items[index].options.findIndex((_,i)=>!q.items[index].answers.includes(i)));
  assert.equal(gradeExercise(q,excess).correct,false);
  assert.equal(validSelections(grouped,grouped.items.map(()=>[]),true),false);
  assert.equal(validSelections(simple,[[99]],true),false);
  assert.throws(()=>gradeExercise(grouped,[[]]));
});
test('filtres C/C++/Rust, niveaux, thèmes, formats et erreurs', () => {
  const filtered=filterQuestions(questions,{...defaults,language:'rust',difficulty:'3',topic:'lifetimes',type:'multi_question'});
  assert.ok(filtered.length>0);
  assert.ok(filtered.every(q=>q.language==='rust'&&q.difficulty===3&&q.topic==='lifetimes'&&q.items.length===2));
  assert.equal(filterQuestions(questions,{...defaults,type:'multiple_choice'}).length,540);
  assert.deepEqual(filterQuestions(questions,{...defaults,review:true},{[simple.id]:{lastCorrect:false}}),[simple]);
});
test('reprise : choix, brouillons, ordre des options et séances déjà présentées', () => {
  const order=simple.items.map(item=>item.options.map((_,i)=>i).reverse());
  const old=restoreSession({ids:[simple.id],answers:[{id:simple.id,choice:simple.items[0].answers[0],correct:true}],index:0,optionOrders:{[simple.id]:order},presented:[simple.id]},questions);
  assert.deepEqual(old.answers[0].choices,exact(simple));
  assert.deepEqual(old.optionOrders[simple.id],order);
  assert.deepEqual(old.presented,[simple.id]);
  const draft=grouped.items.map(()=>[0]);
  assert.deepEqual(restoreSession({ids:[grouped.id],answers:[],index:0,draft},questions).draft,draft);
  assert.equal(restoreSession({ids:['CR-0001'],answers:[],index:0},questions),null);
});
test('mélange : permutation sans mutation, les indices des réponses restent canoniques', () => {
  const source=[0,1,2,3];const order=shuffle(source,()=>0);
  assert.deepEqual([...order].sort(),source);assert.deepEqual(source,[0,1,2,3]);assert.notDeepEqual(order,source);
});
test('le dernier affichage est enregistré même sans réponse', () => {
  const state={records:{}};const q=structuredClone(simple);
  recordPresentation(state,q,now);
  assert.equal(state.exposures[q.id].last_seen_at,iso(now));
  assert.equal(q.last_seen_at,iso(now));assert.equal(q.items[0].last_seen_at,iso(now));
  assert.equal(state.exposures[q.id].seen_count,1);assert.deepEqual(state.records,{});
  recordPresentation(state,q,now+100);assert.equal(state.exposures[q.id].seen_count,2);
  assert.equal(state.history.length,2);
});
test('zéro répétition si assez de familles nouvelles, aucun doublon de question', () => {
  const result=planSession(pool(50),30,{}, {}, [],now);
  assert.equal(result.questions.length,30);assert.equal(result.repeatedCount,0);
  assert.equal(new Set(result.questions.map(q=>q.id)).size,30);
});
test('plafond strict de 20 % sur la taille réellement produite', () => {
  const items=pool(20);const exposures=Object.fromEntries(items.slice(8).map(q=>[q.id,{last_seen_at:iso(now-1000)}]));
  const result=planSession(items,20,{},exposures,[],now);
  assert.equal(result.questions.length,10);assert.equal(result.freshCount,8);assert.equal(result.repeatedCount,2);
  assert.equal(result.repeatRate,.2);assert.equal(result.limited,true);
  const all=Object.fromEntries(items.map(q=>[q.id,{last_seen_at:iso(now)}]));
  assert.equal(planSession(items,10,{},all,[],now).questions.length,0);
  assert.equal(planSession(items,10,{},all,[],now+RECENT_WINDOW_MS+1).questions.length,10);
});
test('les variantes proches sont comptées, y compris dans une même séance', () => {
  const items=Array.from({length:100},(_,i)=>({id:'q'+i,variant_group:'g'+i%20}));
  const result=planSession(items,30,{}, {},[],now);
  assert.equal(result.questions.length,25);assert.equal(result.repeatedCount,5);
  assert.equal(new Set(result.questions.map(q=>q.variant_group)).size,20);
  const history=[{id:'previous',variant_group:'g0',last_seen_at:iso(now-1000)}];
  const next=planSession([{id:'variant',variant_group:'g0'},...pool(10).map(q=>({...q,variant_group:'new'+q.id}))],10,{}, {},history,now);
  assert.ok(next.questions.every(q=>q.id!=='variant'));
});
test('plafond sur de nombreuses tailles et réserves, même en mode révision', () => {
  for(let fresh=0;fresh<=20;fresh++)for(let requested=1;requested<=30;requested++) {
    const items=pool(40), exposures=Object.fromEntries(items.slice(fresh).map(q=>[q.id,{last_seen_at:iso(now)}]));
    const result=planSession(items,requested,{},exposures,[],now,()=>.5);
    assert.ok(result.repeatRate<=.2);
    assert.ok(result.repeatedCount<=Math.floor(result.questions.length*.2));
    assert.equal(new Set(result.questions.map(q=>q.id)).size,result.questions.length);
  }
});
test('les réponses enregistrées conservent statistiques et répétition espacée', () => {
  const wrong=recordAnswer(null,false,now), right=recordAnswer(wrong,true,now+1);
  assert.equal(wrong.due,now);assert.equal(right.due,now+1+86400000);
  assert.deepEqual(summarize({a:right}),{seen:1,attempts:2,success:50,review:0});
  assert.equal(validState({version:1,records:{a:right}}),true);
});
