'use strict';
// Achado 2: exclusão de visita usa o papel na empresa.
const test=require('node:test');const assert=require('node:assert/strict');const {canDeleteVisit:c}=require('../api/[...route].js');
test('owner/admin da empresa apagam, mesmo com papel antigo operador',()=>{assert.equal(c({role:'operador',orgRole:'owner'}),true);assert.equal(c({role:'operador',orgRole:'admin'}),true);});
test('papel antigo admin NÃO apaga onde é só operator/viewer na empresa',()=>{assert.equal(c({role:'admin',orgRole:'operator'}),false);assert.equal(c({role:'admin',orgRole:'viewer'}),false);});
test('sem membership: vale o papel antigo',()=>{assert.equal(c({role:'admin',orgRole:null}),true);assert.equal(c({role:'operador',orgRole:null}),false);});
