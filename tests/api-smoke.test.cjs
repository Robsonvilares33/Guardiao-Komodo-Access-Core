'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/[...route].js');
function response() { return { statusCode: 200, headers: {}, body: '', setHeader(k,v){this.headers[k]=v;}, end(v=''){this.body=v;} }; }
test('health route returns JSON without database configuration', async () => {
  const res = response();
  await handler({ method:'GET', query:{route:['health']}, headers:{} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.data.service, 'komodo-access-api');
});
test('preflight responds without database access', async () => {
  const res = response();
  await handler({ method:'OPTIONS', query:{route:['visitantes','residencial']}, headers:{} }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers.Allow, 'GET,POST,PUT,DELETE,OPTIONS');
});
test('unknown route is a JSON 404 without internals', async () => {
  const res = response();
  await handler({ method:'GET', query:{route:['not-found']}, headers:{} }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).message, 'Rota não encontrada.');
});
