const test=require('node:test');const assert=require('node:assert/strict');
const KD=require('../src/core/KomodoDate.js');
test('terça 13/10/2026 16:04 BRT seleciona "ter" e semana 12..18',()=>{
  const now=new Date('2026-10-13T19:04:00Z');
  assert.equal(KD.todayKey(now),'ter');
  const w=KD.weekDates(now);
  assert.equal(w.seg.day,12);assert.equal(w.ter.day,13);assert.equal(w.qui.day,15);assert.equal(w.dom.day,18);
});
test('23:30 BRT ainda é o mesmo dia mesmo já sendo o dia seguinte em UTC',()=>{
  const now=new Date('2026-10-14T02:30:00Z'); // 13/10 23:30 BRT
  assert.equal(KD.todayKey(now),'ter');assert.equal(KD.todayParts(now).day,13);
});
test('domingo usa a semana que começou na segunda anterior',()=>{
  const now=new Date('2026-10-18T15:00:00Z');
  assert.equal(KD.todayKey(now),'dom');
  const w=KD.weekDates(now);assert.equal(w.seg.day,12);assert.equal(w.dom.day,18);
});
test('virada de mês: semana de 29/09 a 05/10',()=>{
  const w=KD.weekDates(new Date('2026-10-01T15:00:00Z'));
  assert.deepEqual([w.seg.day,w.seg.month,w.dom.day,w.dom.month],[28,9,4,10]);
});
test('index.html e residencial.html carregam KomodoDate antes do código que usa o dia',()=>{
  const fs=require('node:fs'),path=require('node:path');
  for(const [f,after] of [['index.html','src/ui/RenderController.js'],['residencial.html','src/ui/residencial-init.js']]){
    const h=fs.readFileSync(path.join(__dirname,'..',f),'utf8');
    assert.ok(h.indexOf('src/core/KomodoDate.js')>0&&h.indexOf('src/core/KomodoDate.js')<h.indexOf(after),f);
  }
});
test('init.js define allTabs antes de usar (regressão do ReferenceError)',()=>{
  const s=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/ui/init.js'),'utf8');
  assert.ok(s.indexOf('var allTabs')>0 && s.indexOf('var allTabs')<s.indexOf('allTabs.length'));
});
