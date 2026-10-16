'use strict';
/* Provedor de IA (servidor apenas): Groq, API compatível com OpenAI. Chamado SÓ depois de ai-guardrails.prepare().
   - Chave apenas do ambiente do servidor (GROQ_API_KEY); nunca devolvida ao cliente nem logada.
   - Não envia identificadores de usuário/organização ao provedor. Timeout curto; erros genéricos. */
const G = require('./ai-guardrails.cjs');
const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
async function chat(messages, { env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const key = G.providerKey(env); if (env.KAC_AI !== 'on' || !key) throw new Error('AI_DISABLED');
  const model = /^[a-z0-9./_-]{3,80}$/i.test(String(env.KAC_AI_MODEL || '')) ? env.KAC_AI_MODEL : DEFAULT_MODEL;
  const r = await fetchImpl(URL_GROQ, { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_completion_tokens: 600, stream: false }) });
  if (r.status === 429) { const e = new Error('AI_RATE_LIMITED'); e.status = 429; throw e; }
  if (!r.ok) { const e = new Error('AI_PROVIDER_ERROR'); e.status = r.status; throw e; }
  const j = await r.json().catch(() => null); const text = j?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('AI_PROVIDER_ERROR');
  return { text, model: String(j.model || model), tokens: Number(j.usage?.total_tokens || 0) };
}
module.exports = { chat, DEFAULT_MODEL, URL_GROQ };
