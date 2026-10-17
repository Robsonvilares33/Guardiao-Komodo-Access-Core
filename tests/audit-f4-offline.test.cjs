'use strict';
// Achado 4: agenda do dia e fila de check-in cifradas (AES-GCM), mínimas, com expiração, sincronização ordenada e conflito 409.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {webcrypto}=require('node:crypto');
const ctx={TextEncoder,TextDecoder,Uint8Array,Array,JSON,Date,Promise,Math,Number,String,Object,setTimeout,clearTimeout};ctx.globalThis=ctx;
vm.runInNewContext(fs.readFileSync(__dirname+'/../src/services/OfflineGate.js','utf8'),ctx);
function mem(){const m=new Map();return {m,get:async k=>m.get(k),set:async(k,v)=>{m.set(k,v);},del:async k=>{m.delete(k);},clear:async()=>m.clear()};}
const rows=[{id:'v1',hora:'09:00',nome:'Maria Teste',unidade:'101',placa:'ABC1D23',status:0,acompanhantes:'João',historico:'segredo',documento:'123'}];
test('cifra a agenda: nada legível no armazenamento; só campos mínimos',async()=>{const s=mem();const o=ctx.KomodoOffline.create({store:s,crypto:webcrypto});await o.cacheDay('residencial','sex:2026-10-17',rows);
 const raw=JSON.stringify([...s.m.entries()].filter(([k])=>k!=='key').map(([,v])=>Array.from(v.ct)));assert.ok(!raw.includes('Maria'));const back=await o.readDay('residencial','sex:2026-10-17');assert.equal(back[0].nome,'Maria Teste');assert.equal(back[0].acompanhantes,undefined);assert.equal(back[0].historico,undefined);assert.equal(back[0].documento,undefined);});
test('chave não exportável',async()=>{const s=mem();const o=ctx.KomodoOffline.create({store:s,crypto:webcrypto});await o.cacheDay('m','d',rows);const k=s.m.get('key');assert.equal(k.extractable,false);await assert.rejects(webcrypto.subtle.exportKey('raw',k));});
test('expira em 24 h',async()=>{let t=1e12;const s=mem();const o=ctx.KomodoOffline.create({store:s,crypto:webcrypto,now:()=>t});await o.cacheDay('m','d',rows);t+=24*3600e3+1;assert.equal(await o.readDay('m','d'),null);});
test('fila: envia em ordem com from; 409 conta como conflito; sem rede para e mantém o resto',async()=>{const o=ctx.KomodoOffline.create({store:mem(),crypto:webcrypto});await o.enqueue({id:'a',status:1,from:0});await o.enqueue({id:'b',status:1,from:0});await o.enqueue({id:'c',status:2,from:1});
 const seen=[];let r=await o.flush(async op=>{seen.push(op.id+':'+op.from);if(op.id==='b'){const e=new Error('x');e.status=409;throw e;}if(op.id==='c')throw new Error('Não foi possível conectar');});
 assert.deepEqual(seen,['a:0','b:0','c:1']);assert.equal(r.sent,1);assert.equal(r.conflicts,1);assert.equal(r.pending,1);r=await o.flush(async()=>{});assert.equal(r.sent,1);assert.equal(r.pending,0);});
test('logout limpa tudo; páginas carregam o módulo antes do repositório',async()=>{const s=mem();const o=ctx.KomodoOffline.create({store:s,crypto:webcrypto});await o.enqueue({id:'a',status:1});await o.clear();assert.equal(s.m.size,0);
 for(const f of ['index.html','residencial.html']){const h=fs.readFileSync(__dirname+'/../'+f,'utf8');assert.ok(h.indexOf('OfflineGate.js')>0&&h.indexOf('OfflineGate.js')<h.indexOf('VisitorRepository.js'),f);}
 assert.match(fs.readFileSync(__dirname+'/../src/services/AuthService.js','utf8'),/komodoOffline\.clear\(\)/);});
test('erro de rede é reconhecido; erro HTTP não',()=>{assert.equal(ctx.KomodoOffline.isNetworkError({network:true}),true);assert.equal(ctx.KomodoOffline.isNetworkError({status:500,message:'x'}),false);});
