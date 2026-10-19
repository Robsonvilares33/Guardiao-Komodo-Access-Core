'use strict';
// Ordem em que as migrações docs/master/migrations/NNN_*.sql foram aplicadas em produção:
// numérica (001 … 013, 013b, 014 …), sem *_rollback.sql; única exceção histórica: 007_billing depois da 008.
function migrationOrder(files) {
  const key = f => { const m = f.match(/^(\d{3})([a-z]?)_/); let n = Number(m[1]); if (n === 7) n = 8.5; return [n, m[2] || '']; };
  return files.filter(f => /^\d{3}[a-z]?_.+\.sql$/.test(f) && !/_rollback\.sql$/.test(f))
    .sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1].localeCompare(y[1]) || a.localeCompare(b); });
}
module.exports = { migrationOrder };
