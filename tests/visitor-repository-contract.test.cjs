'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'dao', 'VisitorRepository.js'), 'utf8');
function load(remote, calls) {
  const window = {
    authService: { isRemoteMode: () => remote },
    apiService: {
      get: async endpoint => { calls.push(['GET', endpoint]); return []; },
      post: async (endpoint, body) => { calls.push(['POST', endpoint, body]); return { id: body.id }; },
      put: async (endpoint, body) => { calls.push(['PUT', endpoint, body]); return body; },
      delete: async endpoint => { calls.push(['DELETE', endpoint]); return { deleted: true }; }
    },
    dbService: {
      init: async () => {}, query: async () => [{id:'a',dia:'seg'}],
      insert: async (table, data) => data, delete: async () => {}, update: async () => {}
    }
  };
  vm.runInNewContext(source, { window, encodeURIComponent, String, Number, Boolean });
  return window.VisitorRepository;
}
test('remote daily query uses weekday route contract', async () => {
  const calls = []; const repo = load(true, calls);
  await repo.getAllDaily('seg', 'residencial');
  assert.deepEqual(calls, [['GET', '/visitantes/residencial/seg']]);
});
test('remote save, status update and delete use API methods', async () => {
  const calls = []; const repo = load(true, calls);
  await repo.save({id:'v1',nome:'Teste'});
  await repo.updateStatus('v1', 1);
  await repo.delete('v1');
  assert.equal(calls[0][0], 'POST'); assert.equal(calls[0][1], '/visitantes');
  assert.equal(calls[1][0], 'PUT'); assert.equal(calls[1][1], '/visitantes/v1/status'); assert.equal(calls[1][2].status, 1);
  assert.deepEqual(calls[2].slice(0, 2), ['DELETE', '/visitantes/v1']);
});
test('local mode does not call remote API', async () => {
  const calls = []; const repo = load(false, calls);
  const rows = await repo.getAllDaily('seg', 'residencial');
  assert.equal(rows.length, 1); assert.equal(rows[0].id, 'a'); assert.equal(calls.length, 0);
});
