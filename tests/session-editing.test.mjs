import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VERSION,createState,beginSession,finishSession,addSessionSet,removeSessionSet,moveExercise,validateState,encodeBackup,decodeBackup,doneSets,volume} from '../docs/core.js';

// Written by the unmodified 4.0 release, with synthetic training values only.
const legacyText=await readFile(new URL('./legacy-v4-backup.json',import.meta.url),'utf8');
const legacy=()=>decodeBackup(legacyText);

test('the existing v4 backup and an unfinished workout need no data migration',()=>{
 const state=legacy();
 assert.equal(VERSION,1);
 assert.deepEqual(state,JSON.parse(legacyText).data);
 assert.deepEqual(decodeBackup(encodeBackup(state)),state);
 assert.equal(state.history.length,1);
 assert.equal(state.active.note,'Testfall: laufendes Training aus Version 4.0');
 assert.equal(state.active.exercises[0].logs.find(l=>!l.warmup).weight,100);
});

test('adding and removing extra work and warmup sets preserves all previous data',()=>{
 const before=legacy(),exerciseId=before.active.exercises[0].id;
 let state=addSessionSet(before,exerciseId);
 const workId=state.active.exercises[0].logs.at(-1).id;
 state=addSessionSet(state,exerciseId,'warmup');
 const warmup=state.active.exercises[0].logs.find(l=>!before.active.exercises[0].logs.some(old=>old.id===l.id)&&l.warmup);
 assert.equal(validateState(state),true);
 state=removeSessionSet(state,exerciseId,warmup.id);
 state=removeSessionSet(state,exerciseId,workId);
 assert.deepEqual(state,before);
});

test('sets added in v4 without any extra marker can also be removed',()=>{
 const before=legacy(),exercise=before.active.exercises[0];
 const state=removeSessionSet(before,exercise.id,'legacy-added-work');
 assert.equal(state.active.exercises[0].logs.some(l=>l.id==='legacy-added-work'),false);
 assert.deepEqual(state.active.exercises[0].logs,exercise.logs.filter(l=>l.id!=='legacy-added-work'));
 assert.deepEqual(state.plan,before.plan);
 assert.deepEqual(state.history,before.history);
 assert.deepEqual(state.timer,before.timer);
 assert.equal(state.step,before.step);
 assert.equal(validateState(state),true);
 assert.equal(before.active.exercises[0].logs.length,3,'the input must not be mutated');
});

test('removing a logged set updates work totals and volume without rewriting history',()=>{
 const before=legacy(),exercise=before.active.exercises[0];
 const logged=exercise.logs.find(l=>!l.warmup&&l.done);
 let state=removeSessionSet(before,exercise.id,logged.id);
 assert.equal(doneSets(state.active).length,0);
 assert.equal(volume(state.active),0);
 assert.throws(()=>finishSession(state,200000));
 state.active.exercises[0].logs.find(l=>!l.warmup).done=true;
 state=finishSession(state,200000);
 assert.equal(volume(state.history[0]),525);
 assert.deepEqual(state.history[1],before.history[0]);
 assert.equal(state.history[0].exercises[0].logs.some(l=>l.id===logged.id),false);
 assert.equal(validateState(state),true);
});

test('the last work set is protected while every warmup set remains removable',()=>{
 const before=legacy(),exerciseId=before.active.exercises[0].id;
 const state=removeSessionSet(before,exerciseId,'legacy-added-work');
 const lastWork=state.active.exercises[0].logs.find(l=>!l.warmup);
 const snapshot=JSON.stringify(state);
 assert.throws(()=>removeSessionSet(state,exerciseId,lastWork.id),/Mindestens ein Arbeitssatz/);
 assert.equal(JSON.stringify(state),snapshot);
 const cleaned=removeSessionSet(state,exerciseId,'legacy-warmup');
 assert.equal(cleaned.active.exercises[0].logs.length,1);
 assert.equal(validateState(cleaned),true);
});

test('stale exercise and set identifiers cannot modify a different session',()=>{
 const before=legacy(),snapshot=JSON.stringify(before);
 assert.throws(()=>removeSessionSet(before,'unknown','legacy-added-work'));
 assert.throws(()=>removeSessionSet(before,before.active.exercises[0].id,'unknown'));
 assert.throws(()=>removeSessionSet(createState(),'unknown','unknown'));
 assert.throws(()=>addSessionSet(createState(),'unknown'));
 assert.throws(()=>addSessionSet(before,before.active.exercises[0].id,'other'));
 assert.equal(JSON.stringify(before),snapshot);
});

test('moving an exercise with extra sets keeps values through reload and backup',()=>{
 const before=legacy(),id=before.active.exercises[0].id;
 let state=addSessionSet(before,id);
 const addedId=state.active.exercises[0].logs.at(-1).id;
 state.active.exercises=moveExercise(state.active.exercises,0,1);
 state=decodeBackup(encodeBackup(JSON.parse(JSON.stringify(state))));
 const moved=state.active.exercises.find(e=>e.id===id);
 assert.equal(state.active.exercises[1].id,id);
 assert.equal(moved.logs.find(l=>!l.warmup&&l.done).weight,100);
 state=removeSessionSet(state,id,addedId);
 assert.deepEqual(state.active.exercises[1],before.active.exercises[0]);
 assert.deepEqual(state.plan,before.plan);
 assert.deepEqual(state.history,before.history);
 assert.equal(validateState(state),true);
});

test('set limits still hold, warmups stay before work sets, and removing makes space',()=>{
 let state=beginSession(createState(),1000),id=state.active.exercises[0].id;
 while(state.active.exercises[0].logs.filter(l=>!l.warmup).length<20)state=addSessionSet(state,id);
 assert.throws(()=>addSessionSet(state,id),/20 Arbeitssätze/);
 while(state.active.exercises[0].logs.length<40)state=addSessionSet(state,id,'warmup');
 assert(state.active.exercises[0].logs.slice(0,20).every(l=>l.warmup));
 assert.throws(()=>addSessionSet(state,id,'warmup'),/40 Sätze/);
 state=removeSessionSet(state,id,state.active.exercises[0].logs.at(-1).id);
 state=addSessionSet(state,id);
 assert.equal(state.active.exercises[0].logs.length,40);
 assert.equal(validateState(state),true);
});
