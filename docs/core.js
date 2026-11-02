export const VERSION = 1;
export const STORAGE_KEY = `ppl.training.v1:${new URL('./', import.meta.url).pathname}`;
export const ROTATION = [
  {workout:'push1',short:'Push 1',type:'push'},
  {workout:'pull1',short:'Pull 1',type:'pull'},
  {workout:null,short:'Pause',type:'rest'},
  {workout:'legs1',short:'Legs 1',type:'legs'},
  {workout:'push2',short:'Push 2',type:'push'},
  {workout:null,short:'Pause',type:'rest'},
  {workout:'pull2',short:'Pull 2',type:'pull'},
  {workout:'legs2',short:'Legs 2',type:'legs'},
  {workout:null,short:'Pause',type:'rest'},
];
export const ORDER = ['push1','pull1','legs1','push2','pull2','legs2'];
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clone = value => JSON.parse(JSON.stringify(value));
const ex=(id,name,group,setCount,repsMin,repsMax,rest=90)=>({id,exerciseId:id,name,group,setCount,repsMin,repsMax,rest});
export const INITIAL_PLAN={
  push1:{id:'push1',name:'Push 1',focus:'Brust & Bankdrücken',type:'push',note:'Letzte sauber mögliche Wiederholung. Beim Bankdrücken Sicherungsablagen oder Spotter nutzen.',exercises:[
    ex('bench','Bankdrücken · Langhantel','Brust',2,6,8,210),ex('incline-db','Schrägbank · Kurzhanteln','Brust',2,8,12,120),ex('cable-fly','Kabel-Flys','Brust',1,12,15),ex('lateral-cable','Seitheben am Kabel','Schulter',2,12,20),ex('triceps-cable','Trizepsdrücken am Kabel','Trizeps',2,10,15)]},
  pull1:{id:'pull1',name:'Pull 1',focus:'Kreuzheben & Rücken',type:'pull',note:'Beim Kreuzheben jede Wiederholung neu aufbauen. Die saubere Technik bestimmt das Satzende.',exercises:[
    ex('deadlift','Kreuzheben · klassisch','Rücken',1,5,8,240),ex('lat-neutral','Latzug · neutral','Rücken',2,8,12,120),ex('row-supported','Rudern · brustgestützt','Rücken',2,8,12,120),ex('reverse-fly','Reverse Butterfly','Schulter',2,12,20),ex('curl-cable','Bizepscurls am Kabel','Bizeps',2,10,15)]},
  legs1:{id:'legs1',name:'Legs 1',focus:'Quadrizeps & Kniebeugen',type:'legs',note:'Kniebeugen im Rack mit Sicherungsablagen. Bei beginnendem Technikverlust den Satz beenden.',exercises:[
    ex('squat','Kniebeugen · Langhantel','Quadrizeps',2,6,10,210),ex('leg-press','Beinpresse','Quadrizeps',2,10,15,120),ex('leg-extension','Beinstrecker','Quadrizeps',2,12,15),ex('leg-curl-seated','Beinbeuger · sitzend','Beinbeuger',2,10,15),ex('calf-standing','Wadenheben · stehend','Waden',2,8,15),ex('cable-crunch','Kabelcrunches','Bauch',2,10,20)]},
  push2:{id:'push2',name:'Push 2',focus:'Brust & seitliche Schulter',type:'push',note:'Bankdrücken mit höherer Wiederholungszahl. Gewichte unabhängig von Push 1 steigern.',exercises:[
    ex('bench','Bankdrücken · Langhantel','Brust',2,8,12,180),ex('chest-press','Brustpresse · Maschine','Brust',2,10,15,120),ex('lateral-cable','Seitheben am Kabel','Schulter',3,12,20),ex('triceps-rope','Trizepsdrücken · Seil','Trizeps',2,10,15)]},
  pull2:{id:'pull2',name:'Pull 2',focus:'Rücken & hintere Schulter',type:'pull',note:'Rückenübungen ohne Kreuzheben, vor dem Beuger-Tag. Rudern bleibt brustgestützt.',exercises:[
    ex('lat-overhand','Latzug · Obergriff','Rücken',2,8,12,120),ex('row-machine','Rudermaschine · brustgestützt','Rücken',2,10,15,120),ex('reverse-fly','Reverse Butterfly','Schulter',2,12,20),ex('hammer-curl','Hammercurls','Bizeps',2,10,15)]},
  legs2:{id:'legs2',name:'Legs 2',focus:'Beinbeuger & Gesäß',type:'legs',note:'Beinbeuger zuerst. Hip Thrusts ergänzen die Gesäßarbeit. Aufwärmsätze zählen zusätzlich.',exercises:[
    ex('leg-curl-seated','Beinbeuger · sitzend','Beinbeuger',3,8,12),ex('leg-curl-lying','Beinbeuger · liegend','Beinbeuger',2,12,15),ex('hip-thrust','Hip Thrust · Maschine','Gesäß',2,8,12,120),ex('leg-press','Beinpresse','Quadrizeps',2,10,15,120),ex('calf-seated','Wadenheben · sitzend','Waden',2,12,20),ex('cable-crunch','Kabelcrunches','Bauch',2,10,20)]}
};
const basics=Object.values(INITIAL_PLAN).flatMap(w=>w.exercises);
const extra=[
 ['bench-db','Bankdrücken · Kurzhanteln','Brust'],['incline-machine','Schrägbank · Maschine','Brust'],['pec-deck','Butterfly · Maschine','Brust'],['push-ups','Liegestütze','Brust'],['incline-barbell','Schrägbank · Langhantel','Brust'],
 ['lat-single','Latzug · einarmig','Rücken'],['pullup','Klimmzüge · Obergriff','Rücken'],['row-cable','Kabelrudern · sitzend','Rücken'],['row-single','Rudern · einarmig','Rücken'],['pullover','Pullover am Kabel','Rücken'],
 ['lateral-db','Seitheben · Kurzhanteln','Schulter'],['lateral-machine','Seitheben · Maschine','Schulter'],['rear-cable','Reverse Flys am Kabel','Schulter'],['shoulder-machine','Schulterdrücken · Maschine','Schulter'],
 ['preacher-curl','Scottcurls · Maschine','Bizeps'],['curl-db','Bizepscurls · Kurzhanteln','Bizeps'],['curl-sz','Bizepscurls · SZ-Stange','Bizeps'],['triceps-single','Trizepsdrücken · einarmig','Trizeps'],['triceps-overhead','Trizepsstrecken über Kopf','Trizeps'],
 ['hack-squat','Hackenschmidt-Kniebeuge','Quadrizeps'],['squat-smith','Kniebeugen · Multipresse','Quadrizeps'],['split-squat','Bulgarische Kniebeugen','Quadrizeps'],['lunge','Ausfallschritte','Quadrizeps'],['curl-standing','Beinbeuger · stehend','Beinbeuger'],['rdl','Rumänisches Kreuzheben','Beinbeuger'],['hip-thrust-barbell','Hip Thrust · Langhantel','Gesäß'],['abduction','Abduktorenmaschine','Gesäß'],['calf-press','Wadenheben an der Beinpresse','Waden'],['crunch-machine','Bauchmaschine','Bauch'],['leg-raise','Beinheben','Bauch']
].map(([exerciseId,name,group])=>({exerciseId,name,group}));
export const CATALOG=[...new Map([...basics.map(({exerciseId,name,group})=>({exerciseId,name,group})),...extra].map(e=>[e.exerciseId,e])).values()];
export function createState(){return {version:VERSION,plan:clone(INITIAL_PLAN),step:0,cycle:1,active:null,history:[],restLog:[],timer:null,settings:{timer:true,installDismissed:false},lastBackup:null};}
export const currentDay=s=>ROTATION[s.step];
export const setTotal=w=>w.exercises.reduce((n,e)=>n+e.setCount,0);
export const doneSets=s=>s.exercises.flatMap(e=>e.logs).filter(l=>l.done&&!l.warmup);
export const volume=s=>s.exercises.reduce((n,e)=>n+e.logs.filter(l=>l.done&&!l.warmup).reduce((t,l)=>t+l.weight*l.reps,0),0);
export function parseWeight(v){if(v===null||v===undefined||String(v).trim()==='')return null;const text=String(v).trim().replace(',','.');if(!/^\d+(\.\d+)?$/.test(text))return null;const n=Number(text);return Number.isFinite(n)&&n>=0&&n<=1000?n:null;}
export function parseReps(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=200?n:null;}
export function validLog(l){return l&&parseWeight(l.weight)!==null&&parseReps(l.reps)!==null;}
export function previousExercise(state,workoutId,exerciseId){for(const session of state.history){if(session.workoutId!==workoutId)continue;const e=session.exercises.find(e=>e.exerciseId===exerciseId&&e.logs.some(l=>l.done&&!l.warmup));if(e)return {...e,date:session.completedAt};}return null;}
export function makeActiveExercise(state,workoutId,e){const previous=previousExercise(state,workoutId,e.exerciseId);const logs=previous?.logs.filter(l=>l.done&&!l.warmup)||[];return {...clone(e),logs:Array.from({length:e.setCount},(_,i)=>({id:uid(),weight:logs[i]?.weight??null,reps:null,done:false,warmup:false}))};}
export function beginSession(state,now=Date.now()){
 if(state.active)throw new Error('Es läuft bereits ein Training.');
 const day=currentDay(state);if(!day.workout)throw new Error('Heute ist ein Ruhetag in deiner Rotation.');
 const next=clone(state),w=next.plan[day.workout];
 next.active={id:uid(),workoutId:w.id,title:w.name,focus:w.focus,note:'',startedAt:now,step:state.step,cycle:state.cycle,exercises:w.exercises.map(e=>makeActiveExercise(state,w.id,e))};
 return next;
}
export function advance(state){const next=clone(state);next.step=(state.step+1)%9;if(next.step===0)next.cycle++;return next;}
export function finishSession(state,now=Date.now()){
 if(!state.active||doneSets(state.active).length===0)throw new Error('Erfasse zuerst mindestens einen Arbeitssatz.');
 const next=clone(state),a=next.active;
 if(a.exercises.some(e=>e.logs.some(l=>l.done&&!validLog(l))))throw new Error('Ein abgehakter Satz enthält ungültige Werte.');
 next.history.unshift({...a,completedAt:Math.max(now,a.startedAt)});next.active=null;next.timer=null;
 return state.step===a.step&&state.cycle===a.cycle?advance(next):next;
}
export function finishRest(state,now=Date.now()){
 if(state.active||currentDay(state).workout)throw new Error('Dieser Plantag ist kein Ruhetag.');
 const next=clone(state);next.restLog.unshift({id:uid(),date:now,step:state.step,cycle:state.cycle});return advance(next);
}
export function moveExercise(list,index,delta){const copy=list.slice(),to=index+delta;if(index<0||index>=copy.length||to<0||to>=copy.length)return copy;[copy[index],copy[to]]=[copy[to],copy[index]];return copy;}
const str=(v,max=150)=>typeof v==='string'&&v.length>0&&v.length<=max;
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>num(v,min,max)&&Number.isInteger(v);
function validateExercise(e,active=false){
 if(!e||!str(e.id)||!str(e.exerciseId)||!str(e.name)||!str(e.group)||!integer(e.setCount,1,20)||!integer(e.repsMin,1,200)||!integer(e.repsMax,e.repsMin,200)||!integer(e.rest,15,900))return false;
 if(!active)return true;
 return Array.isArray(e.logs)&&e.logs.length<=40&&e.logs.every(l=>str(l.id)&&typeof l.done==='boolean'&&typeof l.warmup==='boolean'&&(l.weight===null||num(l.weight,0,1000))&&(l.reps===null||integer(l.reps,1,200))&&(!l.done||validLog(l)));
}
function validateSession(s,completed=false){return s&&str(s.id)&&ORDER.includes(s.workoutId)&&str(s.title)&&str(s.focus)&&typeof s.note==='string'&&s.note.length<=3000&&num(s.startedAt,0,1e15)&&integer(s.step,0,8)&&integer(s.cycle,1,1e8)&&Array.isArray(s.exercises)&&s.exercises.length>0&&s.exercises.length<=50&&s.exercises.every(e=>validateExercise(e,true))&&(!completed||num(s.completedAt,s.startedAt,1e15));}
export function validateState(s){
 if(!s||s.version!==VERSION||!integer(s.step,0,8)||!integer(s.cycle,1,1e8)||!s.plan||!ORDER.every(id=>{const w=s.plan[id];return w&&w.id===id&&str(w.name)&&str(w.focus)&&['push','pull','legs'].includes(w.type)&&typeof w.note==='string'&&w.note.length<=3000&&Array.isArray(w.exercises)&&w.exercises.length>0&&w.exercises.length<=50&&w.exercises.every(e=>validateExercise(e));}))return false;
 if(s.active!==null&&!validateSession(s.active))return false;
 if(!Array.isArray(s.history)||s.history.length>10000||!s.history.every(h=>validateSession(h,true)))return false;
 if(!Array.isArray(s.restLog)||s.restLog.length>30000||!s.restLog.every(r=>str(r.id)&&num(r.date,0,1e15)&&integer(r.step,0,8)&&integer(r.cycle,1,1e8)))return false;
 if(s.timer!==null&&!(s.timer&&num(s.timer.end,0,1e15)&&str(s.timer.label)))return false;
 return s.settings&&typeof s.settings.timer==='boolean'&&typeof s.settings.installDismissed==='boolean'&&(s.lastBackup===null||num(s.lastBackup,0,1e15));
}
export function encodeBackup(state,now=Date.now()){return JSON.stringify({format:'ppl-folke-backup',schemaVersion:VERSION,exportedAt:new Date(now).toISOString(),data:state},null,2);}
export function decodeBackup(text){
 if(typeof text!=='string'||text.length>12_000_000)throw new Error('Diese Datei ist zu groß.');
 let b;try{b=JSON.parse(text);}catch{throw new Error('Das ist keine lesbare Backup-Datei.');}
 if(b.format!=='ppl-folke-backup'||b.schemaVersion!==VERSION||!validateState(b.data))throw new Error('Das Backup passt nicht zu dieser App oder enthält ungültige Daten.');
 return clone(b.data);
}
