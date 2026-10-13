'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('hosted bootstrap form exposes a password-type server secret field', () => {
  const html = fs.readFileSync(path.join(root, 'login.html'), 'utf8');
  assert.match(html, /id="bootstrapSecretGroup"/);
  assert.match(html, /type="password" id="bsBootstrapSecret"/);
  assert.match(html, /autocomplete="off"/);
});
test('hosted bootstrap sends the secret and clears the input after submission', () => {
  const ui = fs.readFileSync(path.join(root, 'src', 'ui', 'login-init.js'), 'utf8');
  const auth = fs.readFileSync(path.join(root, 'src', 'services', 'AuthService.js'), 'utf8');
  assert.match(ui, /createFirstAdmin\(email\.value, pass\.value, bootstrapSecret\)/);
  assert.match(ui, /finally\s*\{\s*if \(secretInput\) secretInput\.value = '';/);
  assert.match(auth, /createFirstAdmin\(email, password, bootstrapSecret = ''\)/);
  assert.match(auth, /bootstrapSecret: secret/);
  assert.match(auth, /secret\.length < 32/);
});
