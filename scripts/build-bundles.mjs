#!/usr/bin/env node
// Achado 8: junta os scripts da agenda num bundle só, carregado com defer (o projeto Vercel não tem etapa de build).
// A lista e a ordem ficam no próprio HTML, no comentário "kac:bundle <nome>". Rode após mexer em qualquer arquivo listado:
//   node scripts/build-bundles.mjs            (minifica com esbuild se estiver instalado; senão concatena)
//   node scripts/build-bundles.mjs --check    (falha se algum bundle estiver desatualizado)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const PAGES = [['index.html', 'agenda'], ['residencial.html', 'residencial']];
export function sources(html, name) {
  const m = new RegExp('<!-- kac:bundle ' + name + '\\b([\\s\\S]*?)-->').exec(html); if (!m) throw new Error('bloco kac:bundle ' + name + ' não encontrado');
  return [...m[1].matchAll(/src="([^"?]+)"/g)].map(x => x[1]);
}
export function concat(files) { return files.map(f => '/* ' + f + ' */\n' + fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n'); }
export function srcHash(files) { return crypto.createHash('sha256').update(concat(files)).digest('hex'); }
async function build(check) {
  let esbuild = null; try { esbuild = createRequire(import.meta.url)(process.env.KAC_ESBUILD || 'esbuild'); } catch (_) {}
  let stale = 0;
  for (const [page, name] of PAGES) {
    const files = sources(fs.readFileSync(path.join(root, page), 'utf8'), name); const hash = srcHash(files);
    const out = path.join(root, 'src/bundle', name + '.bundle.js');
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur.includes('src-sha256=' + hash)) { console.log(name, 'ok'); continue; }
    if (check) { console.log(name, 'DESATUALIZADO'); stale++; continue; }
    let code = concat(files);
    if (esbuild) code = (await esbuild.transform(code, { minify: true, target: 'es2020', legalComments: 'none', charset: 'utf8' })).code;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, '/*! Guardião Komodo — bundle ' + name + ' (gerado por scripts/build-bundles.mjs, não editar) src-sha256=' + hash + ' */\n' + code);
    console.log(name, files.length, 'arquivos ->', path.relative(root, out), fs.statSync(out).size, 'bytes');
  }
  if (stale) process.exit(1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) build(process.argv.includes('--check'));
