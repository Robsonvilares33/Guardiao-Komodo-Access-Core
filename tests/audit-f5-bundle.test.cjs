'use strict';
// Achado 8: agenda carrega 1 bundle com defer; bundle tem que estar em dia com as fontes listadas no HTML.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');
function sources(html,name){const m=new RegExp('<!-- kac:bundle '+name+'\\b([\\s\\S]*?)-->').exec(html);assert.ok(m,'bloco '+name);return [...m[1].matchAll(/src="([^"?]+)"/g)].map(x=>x[1]);}
const hash=fs=>crypto.createHash('sha256').update(fs.map(f=>'/* '+f+' */\n'+rd(f)).join('\n;\n')).digest('hex');
for(const [page,name] of [['index.html','agenda'],['residencial.html','residencial']]){
 test(page+': fontes comentadas, 1 bundle com defer, nada síncrono no fim do body',()=>{const h=rd(page);const files=sources(h,name);assert.ok(files.length>=30);
  const live=h.replace(/<!--[\s\S]*?-->/g,'');const tags=[...live.matchAll(/<script\b([^>]*)>/g)].map(m=>m[1]);
  assert.ok(tags.some(t=>t.includes('defer')&&t.includes('src/bundle/'+name+'.bundle.js')));
  for(const t of tags){if(t.includes('AuthGate.js'))continue;assert.match(t,/\bdefer\b/,'script sem defer: '+t);}
  for(const f of files)assert.ok(!live.includes('src="'+f+'"'),'carregado fora do bundle: '+f);});
 test(name+'.bundle.js em dia (rode node scripts/build-bundles.mjs)',()=>{const b=rd('src/bundle/'+name+'.bundle.js');assert.ok(b.includes('src-sha256='+hash(sources(rd(page),name))),'bundle desatualizado');});
}
test('AuthGate segue a mesma regra do AuthService e só redireciona sem sessão válida',()=>{const g=rd('src/ui/AuthGate.js');assert.match(g,/komodo_session/);assert.match(g,/kac_newlogin/);assert.match(g,/32198/);
 const run=(store,ss={})=>{let to=null;const mk=o=>({getItem:k=>o[k]??null});const ctx={location:{protocol:'https:',hostname:'kac.app',port:'',replace:u=>{to=u;}},sessionStorage:mk({...ss,...store}),localStorage:mk({}),JSON,Date};require('node:vm').runInNewContext(g,ctx);return to;};
 assert.equal(run({}),'login.html');assert.equal(run({},{kac_newlogin:'1'}),'auth.html');assert.equal(run({komodo_session:JSON.stringify({expiresAt:Date.now()+1e5})}),null);assert.equal(run({komodo_session:JSON.stringify({expiresAt:Date.now()-1})}),'login.html');});
test('CLS: espaço da navegação da agenda reservado no HTML',()=>{for(const f of ['index.html','residencial.html'])assert.match(rd(f),/id="agendaNavSlot"/);assert.match(rd('src/ui/AgendaNav.js'),/agendaNavSlot/);});
