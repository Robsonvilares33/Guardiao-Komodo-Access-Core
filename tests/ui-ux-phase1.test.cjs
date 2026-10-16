'use strict';
// UX fase 1 (itens 1,2,3,4,8 de docs/master/UX_PROPOSAL.md): checagens estáticas + comportamento de DayTabs/LazyVendor/KomodoFx.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');const PAGES=['index.html','residencial.html','login.html'];
test('1 nenhum vendor pesado no carregamento inicial; carregado sob demanda pelos botões',()=>{for(const p of ['index.html','residencial.html'])assert.ok(!/<script[^>]+vendor\/(jspdf|chart)/.test(src(p)),p);
  assert.match(src('src/ui/init.js'),/KacVendor\.pdf\(\)/);assert.match(src('src/ui/residencial-init.js'),/KacVendor\.pdf\(\)/);assert.match(src('src/ui/DashboardManager.js'),/KacVendor\.chart\(\)/);
  for(const f of ['vendor/jspdf-4.2.1/jspdf.umd.min.js','vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js','vendor/chart.js-4.5.1/chart.umd.js'])assert.ok(src('src/ui/LazyVendor.js').includes(f),f);});
test('1 LazyVendor: injeta cada script 1 vez, em ordem, e resolve',async()=>{const added=[];const doc={head:{appendChild(s){added.push(s.src);setTimeout(()=>s.onload(),0);}},createElement:()=>({})};const win={};vm.runInNewContext(src('src/ui/LazyVendor.js'),{window:win,document:doc,Promise,setTimeout});
  await Promise.all([win.KacVendor.pdf(),win.KacVendor.pdf()]);await win.KacVendor.chart();assert.deepEqual(added,['vendor/jspdf-4.2.1/jspdf.umd.min.js','vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js','vendor/chart.js-4.5.1/chart.umd.js']);});
test('2 fundo animado desligado por padrão; liga só com preferência e sem reduced-motion',()=>{const run=(pref,reduced)=>{const cls=new Set();let inited=0;const win={matchMedia:()=>({matches:reduced}),localStorage:{getItem:()=>pref},KomodoParticles:{init(){inited++;}}};const doc={body:{classList:{toggle(c,on){on?cls.add(c):cls.delete(c);}}},addEventListener(){},getElementById:()=>null};vm.runInNewContext(src('src/ui/KomodoFx.js'),{window:win,document:doc});win.KomodoFx.init();return{on:cls.has('kac-fx'),inited};};
  assert.deepEqual(run(null,false),{on:false,inited:0});assert.deepEqual(run('1',true),{on:false,inited:0});assert.deepEqual(run('1',false),{on:true,inited:1});
  for(const c of ['main.css','login.css'])assert.match(src('src/ui/styles/'+c),/body:not\(\.kac-fx\) #particles-canvas \{ display: none; \}/);
  for(const f of ['src/ui/init.js','src/ui/residencial-init.js','src/ui/login-init.js'])assert.ok(!/KomodoParticles\.init/.test(src(f)),f);});
test('3 todo botão tem nome acessível; todo <label> aponta para um campo existente; um <h1> e <main> por página',()=>{for(const p of PAGES){const s=src(p);
  for(const m of s.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){const txt=m[2].replace(/<span aria-hidden="true">[\s\S]*?<\/span>/g,'').replace(/<[^>]+>/g,'').trim();assert.ok(/[A-Za-zÀ-ú0-9]/.test(txt)||/aria-label="[^"]+"/.test(m[1]),p+': '+m[0].slice(0,80));}
  for(const m of s.matchAll(/<label for="([^"]+)"/g))assert.ok(new RegExp(`<(input|select|textarea)[^>]*id="${m[1]}"`).test(s),p+': label for='+m[1]);
  const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,p+': ids duplicados');
  assert.equal((s.match(/<h1\b/g)||[]).length,1,p+' h1');assert.equal((s.match(/<main\b/g)||[]).length,1,p+' main');}});
test('4 abas: tablist/tab no HTML; teclado ←/→/Home/End/Enter; aria-selected e roving tabindex seguem .active',()=>{for(const p of ['index.html','residencial.html']){const s=src(p);assert.match(s,/id="tabs" role="tablist"/);assert.equal((s.match(/class="tab[^"]*" data-dia="\w+" role="tab"/g)||[]).length,7,p);}
  // DOM mínimo
  function el(dia,active){const e={id:'',attrs:{},classList:{_s:new Set(active?['active']:[]),contains(c){return this._s.has(c);},add(c){this._s.add(c);},remove(c){this._s.delete(c);}},getAttribute(k){return k==='data-dia'?dia:this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},tabIndex:-1,focused:false,focus(){this.focused=true;},click(){tabs.forEach(t=>t.classList.remove('active'));this.classList.add('active');sync();}};return e;}
  const tabs=['seg','ter','qua'].map((d,i)=>el(d,i===1));let handler,sync;
  const list={attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},querySelectorAll:()=>tabs,addEventListener(ev,fn){handler=fn;}};
  const ctx={document:{readyState:'complete',getElementById:()=>list,addEventListener(){}},MutationObserver:function(fn){this.observe=()=>{};},module:{exports:{}}};vm.runInNewContext(src('src/ui/DayTabs.js'),ctx);sync=()=>ctx.module.exports.sync(list);
  assert.equal(list.attrs.role,'tablist');assert.equal(tabs[1].attrs['aria-selected'],'true');assert.equal(tabs[1].tabIndex,0);assert.equal(tabs[0].tabIndex,-1);
  let prevented=0;const key=(k,t)=>handler({key:k,target:t,preventDefault(){prevented++;}});
  key('ArrowRight',tabs[1]);assert.ok(tabs[2].classList.contains('active'));assert.ok(tabs[2].focused);assert.equal(tabs[2].attrs['aria-selected'],'true');assert.equal(tabs[1].tabIndex,-1);
  key('ArrowRight',tabs[2]);assert.ok(tabs[0].classList.contains('active'),'circular');key('End',tabs[0]);assert.ok(tabs[2].classList.contains('active'));key('Home',tabs[2]);assert.ok(tabs[0].classList.contains('active'));key('ArrowLeft',tabs[0]);assert.ok(tabs[2].classList.contains('active'));assert.ok(prevented>=5);});
test('8 login atual: autocomplete correto, rótulos ligados, erro anunciado, mostrar senha acessível',()=>{const s=src('login.html');
  assert.match(s,/id="inputEmail"[^>]*autocomplete="username"/);assert.match(s,/id="inputSenha"[^>]*autocomplete="current-password"/);assert.match(s,/id="bsSenha"[^>]*autocomplete="new-password"/);assert.match(s,/id="bsSenha2"[^>]*autocomplete="new-password"/);
  assert.ok(!/autocomplete="off"[^>]*id="inputEmail"|id="inputEmail"[^>]*autocomplete="off"/.test(s));for(const id of ['inputEmail','inputSenha','bsEmail','bsBootstrapSecret','bsSenha','bsSenha2'])assert.match(s,new RegExp(`<label for="${id}"`));
  assert.match(s,/id="errorMsg" role="alert"/);assert.match(s,/data-pw-toggle="inputSenha" aria-pressed="false" aria-label="Mostrar senha"/);assert.match(src('src/ui/login-init.js'),/aria-pressed/);});
test('escopo: MFA e banco intocados nesta fase',()=>{assert.ok(!/KacVendor|KomodoFx|DayTabs/.test(src('auth.html')+src('src/ui/auth-init.js')));});
