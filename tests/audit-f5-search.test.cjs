'use strict';
// Achado 5: busca não injeta operadores no filtro or() do PostgREST.
const test=require('node:test');const assert=require('node:assert/strict');const {safeSearch:s}=require('../api/[...route].js');
test('mantém nomes, placas e unidades comuns',()=>{assert.equal(s('João da Silva'),'João da Silva');assert.equal(s('ABC1D23'),'ABC1D23');assert.equal(s("Bloco B-12/3 D'Ávila"),"Bloco B-12/3 D'Ávila");assert.equal(s('ana@x.com'),'ana@x.com');});
test('remove operadores do PostgREST e curingas',()=>{for(const bad of ['a,status.eq.1','x),id.gt.0,or(nome.ilike.*','*','%_\\','"q"','a(b)c','nome.eq.x;drop']){const r=s(bad);assert.ok(!/[,()*%_"\\;]/.test(r),bad+' -> '+r);}assert.equal(s('a,status.eq.1'),'a status.eq.1');});
test('limita tamanho e trata vazio',()=>{assert.equal(s(undefined),'');assert.equal(s(' , ( ) '),'');assert.ok(s('x'.repeat(200)).length<=80);});
test('rota usa safeSearch no filtro',()=>{const src=require('node:fs').readFileSync(__dirname+'/../api/[...route].js','utf8');assert.match(src,/const search=safeSearch\(req\.query\?\.search\)/);assert.ok(!/ilike\.\*\$\{encodeURIComponent\(search\)\}/.test(src));});
