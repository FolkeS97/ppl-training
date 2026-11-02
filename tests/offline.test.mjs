import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {OfflineApp} from '../docs/offline.js';
import {createState, beginSession, finishSession, validateState, moveExercise, STORAGE_KEY, encodeBackup, decodeBackup} from '../docs/core.js';

const script = await readFile(new URL('../docs/sw.js', import.meta.url), 'utf8');
const origin = 'https://training.example/ppl-training/';
const cachePrefix = 'ppl-training:/ppl-training/:';
const files = new Map();
for (const name of ['index.html','styles.css','boot.js','app.js','core.js','offline.js','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']) {
  const content = await readFile(new URL(`../docs/${name}`, import.meta.url));
  const type = name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.webmanifest')?'application/manifest+json':name.endsWith('.svg')?'image/svg+xml':'image/png';
  files.set(new URL(name, origin).href, {content,type});
}
function cacheStorage() {
  const stores = new Map();
  return {
    stores,
    async keys(){return [...stores.keys()];},
    async delete(name){return stores.delete(name);},
    async open(name){
      if(!stores.has(name)) stores.set(name,new Map());
      const records=stores.get(name);
      return {
        async match(key){return records.get(String(key))?.clone();},
        async put(key,response){records.set(String(key),response.clone());},
        async delete(key){return records.delete(String(key));}
      };
    }
  };
}
function worker({caches=cacheStorage(),network,scope=origin}={}) {
  const handlers={};
  let fetches=0,skips=0,claims=0;
  const self={registration:{scope},clients:{async claim(){claims++;}},async skipWaiting(){skips++;},addEventListener(type,fn){handlers[type]=fn;}};
  vm.runInNewContext(script, {self,caches,URL,Request,Response,fetch:async request=>{
    fetches++;
    if(network) return network(request);
    const relative=request.url.startsWith(scope)?request.url.slice(scope.length):null;
    const file=relative===null?null:files.get(new URL(relative,origin).href);
    return file?new Response(file.content,{headers:{'Content-Type':file.type}}):new Response('Missing',{status:404});
  }});
  async function lifecycle(type,extra={}) {
    const work=[];
    handlers[type]({...extra,waitUntil(promise){work.push(promise);}});
    await Promise.all(work);
  }
  return {
    caches,
    counts:()=>({fetches,skips,claims}),
    install:()=>lifecycle('install'),
    activate:()=>lifecycle('activate'),
    async status(){let report;await lifecycle('message',{data:{type:'CHECK_OFFLINE'},ports:[{postMessage(value){report=value;}}]});return report;},
    activateUpdate:()=>lifecycle('message',{data:{type:'ACTIVATE_UPDATE'}}),
    fetch(path,mode='cors',method='GET'){
      let response;
      handlers.fetch({request:{url:new URL(path,scope).href,mode,method},respondWith(value){response=value;}});
      return response;
    }
  };
}

test('fresh preparation stores all actual application files before claiming readiness',async()=>{
  const w=worker();
  assert.equal((await w.status()).ready,false);
  await w.install();
  const status=await w.status();
  assert.equal(status.ready,true);
  assert.equal(status.total,files.size);
  assert.equal(status.cached,files.size);
  assert.equal(w.counts().skips,0,'updates must wait for the saved-state reload action');
  await w.activate();
  assert.equal(w.counts().claims,1);
});

test('a completely restarted worker serves root, index and every asset with the network disconnected',async()=>{
  const installed=worker();await installed.install();await installed.activate();
  const cold=worker({caches:installed.caches,network:async()=>{throw new TypeError('Network disconnected');}});
  for(const path of ['./', './?from=homescreen','./index.html?launch=1']) {
    const response=await cold.fetch(path,'navigate');
    assert.equal(response.status,200);
    assert.match(await response.text(),/data-ppl-shell="1"/);
  }
  for(const [url,file] of files) {
    const response=await cold.fetch(url+'?cache-bust=test');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),file.content);
  }
  assert.equal(cold.counts().fetches,0,'offline startup must never wait on a network request');
  assert.equal((await cold.status()).ready,true);
});

test('cached app remains usable with an expired login, erroring Wi-Fi or a captive portal',async()=>{
  const installed=worker();await installed.install();
  const cold=worker({caches:installed.caches,network:async()=>new Response('<html>Sign in</html>',{status:200,headers:{'Content-Type':'text/html'}})});
  assert.match(await (await cold.fetch('./','navigate')).text(),/data-ppl-shell="1"/);
  assert.equal(cold.counts().fetches,0);
  assert.equal(cold.fetch('/signin-with-chatgpt','navigate'),undefined);
  assert.equal(cold.fetch('/signout-with-chatgpt','navigate'),undefined);
  assert.equal(cold.fetch('https://other.example/a.mjs'),undefined);
  assert.equal(cold.fetch('./','navigate','POST'),undefined);
});

test('authentication HTML or missing assets cannot produce a false offline-ready installation',async()=>{
  for(const failure of ['app.js','index.html','icons/icon-192.png']) {
    const caches=cacheStorage();
    await (await caches.open(`${cachePrefix}previous`)).put('keep',new Response('old app'));
    const w=worker({caches,network:async request=>{
      if(request.url===new URL(failure,origin).href) return new Response('<html>Please sign in</html>',{headers:{'Content-Type':'text/html'}});
      const file=files.get(request.url);return new Response(file.content,{headers:{'Content-Type':file.type}});
    }});
    await assert.rejects(w.install());
    assert.equal((await w.status()).ready,false);
    assert.equal(await (await (await caches.open(`${cachePrefix}previous`)).match('keep')).text(),'old app');
  }
});

test('removing one installed file changes the reported status; offline fallback explains how to recover',async()=>{
  const installed=worker();await installed.install();
  const [name]=await installed.caches.keys();
  await (await installed.caches.open(name)).delete(new URL('index.html',origin).href);
  const cold=worker({caches:installed.caches,network:async()=>{throw new Error('offline');}});
  assert.equal((await cold.status()).ready,false);
  const response=await cold.fetch('./','navigate');
  assert.equal(response.status,503);
  assert.match(await response.text(),/noch nicht vollständig offline vorbereitet/);
});

test('activation removes only obsolete PPL app files; unrelated caches and training data survive',async()=>{
  const w=worker();await w.install();
  await w.caches.open(`${cachePrefix}previous`);
  await w.caches.open('unrelated-cache');
  await w.caches.open('ppl-training:/other-app/:4.0.0');
  await w.activateUpdate();
  assert.equal(w.counts().skips,1);
  await w.activate();
  const keys=await w.caches.keys();
  assert(!keys.includes(`${cachePrefix}previous`));
  assert(keys.includes('unrelated-cache'));
  assert(keys.includes('ppl-training:/other-app/:4.0.0'));
  assert.equal(w.fetch('/', 'navigate'),undefined,'a project worker must not handle the user-site root');
  assert.equal((await w.status()).ready,true);
});

test('two GitHub Pages apps on one origin keep independent caches and both survive activation',async()=>{
  const first=worker();await first.install();await first.activate();
  const otherScope='https://training.example/another-training/';
  const second=worker({caches:first.caches,scope:otherScope});
  await second.install();await second.activate();
  assert.equal((await first.status()).ready,true);
  assert.equal((await second.status()).ready,true);
  const disconnected=worker({caches:first.caches,scope:otherScope,network:async()=>{throw Error('offline');}});
  const response=await disconnected.fetch('./?from=homescreen','navigate');
  assert.equal(response.status,200);
  assert.match(await response.text(),/data-ppl-shell="1"/);
  assert.equal(disconnected.counts().fetches,0);
});

test('offline training round trip preserves logged sets, exercise changes, history and JSON backups',()=>{
  const disk=new Map();
  let state=beginSession(createState(),1000);
  const exercise=state.active.exercises[0];
  exercise.logs[0]={...exercise.logs[0],weight:82.5,reps:8,done:true};
  state.active.exercises=moveExercise(state.active.exercises,0,1);
  state.plan.push1.exercises[2].name='Meine Kabel-Flys';
  disk.set(STORAGE_KEY,JSON.stringify(state));
  state=JSON.parse(disk.get(STORAGE_KEY));
  assert.equal(validateState(state),true);
  assert.equal(state.active.exercises[1].logs[0].weight,82.5);
  state=finishSession(state,61000);
  disk.set(STORAGE_KEY,JSON.stringify(state));
  const reopened=JSON.parse(disk.get(STORAGE_KEY));
  assert.equal(validateState(reopened),true);
  assert.equal(reopened.history[0].exercises[1].logs[0].reps,8);
  assert.equal(reopened.plan.push1.exercises[2].name,'Meine Kabel-Flys');
  assert.deepEqual(decodeBackup(encodeBackup(reopened)),reopened);
});

function environment(ready=true) {
  const events={};
  let reloads=0;
  const registration={active:true,waiting:null,addEventListener(type,fn){events[type]=fn;},async update(){}};
  const worker={postMessage(message,ports){ports[0].postMessage({ready,version:'test',total:10,cached:ready?10:9});}};
  return {
    isSecureContext:true,MessageChannel,setTimeout,clearTimeout,
    navigator:{serviceWorker:{controller:worker,async register(){return registration;},addEventListener(type,fn){events[type]=fn;}},storage:{async persisted(){return false;},async persist(){return true;}}},
    location:{reload(){reloads++;}},registration,events,reloads:()=>reloads
  };
}
test('UI only reports ready after the controlling worker verifies its full shell',async()=>{
  const env=environment(false),reports=[];
  const app=new OfflineApp(report=>reports.push(report),env);
  await app.start();
  assert.equal(app.report.ready,false);
  assert.equal(app.report.phase,'incomplete');
  assert(!reports.some(report=>report.ready));
  await app.keepStorage();
  assert.equal(app.report.durable,true);
});
test('new app version reloads only after explicit update and keeps the offline-ready state',async()=>{
  const env=environment(),app=new OfflineApp(()=>{},env);
  await app.start();
  assert.equal(app.report.ready,true);
  let message;
  env.registration.waiting={postMessage(value){message=value;}};
  env.events.updatefound();
  assert.equal(app.report.updateReady,true);
  assert.equal(env.reloads(),0);
  assert.equal(app.applyUpdate(),true);
  assert.equal(message.type,'ACTIVATE_UPDATE');
  env.events.controllerchange();
  assert.equal(env.reloads(),1);
});
test('insecure or unsupported contexts do not advertise offline readiness',async()=>{
  const app=new OfflineApp(()=>{},{isSecureContext:false,navigator:{}});
  await app.start();
  assert.equal(app.report.phase,'unsupported');
  assert.equal(app.report.ready,false);
});
