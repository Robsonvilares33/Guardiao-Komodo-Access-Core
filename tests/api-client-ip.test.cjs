const test=require('node:test');const assert=require('node:assert/strict');
const {clientIp}=require('../api/[...route].js');
test('usa x-real-ip definido pela Vercel',()=>assert.equal(clientIp({headers:{'x-real-ip':'203.0.113.7'}}),'203.0.113.7'));
test('ignora x-forwarded-for forjado quando x-real-ip existe',()=>assert.equal(clientIp({headers:{'x-real-ip':'203.0.113.7','x-forwarded-for':'1.2.3.4'}}),'203.0.113.7'));
test('XFF sozinho não é confiável (não rotaciona bucket)',()=>{assert.equal(clientIp({headers:{'x-forwarded-for':'1.2.3.4'}}),'unknown');assert.equal(clientIp({headers:{'x-forwarded-for':'5.6.7.8'}}),'unknown');});
test('IPv6 aceito',()=>assert.equal(clientIp({headers:{'x-real-ip':'2001:db8::1'}}),'2001:db8::1'));
test('valor malformado/injeção vira unknown',()=>{assert.equal(clientIp({headers:{'x-real-ip':'1.2.3.4, 9.9.9.9'}}),'unknown');assert.equal(clientIp({headers:{'x-real-ip':'<script>'}}),'unknown');assert.equal(clientIp({headers:{}}),'unknown');});
test('login com XFF rotativo usa o mesmo hash de IP no rate limit',async()=>{
  process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
  const handler=require('../api/[...route].js');const hashes=[];const f=global.fetch;
  global.fetch=async(url,opt)=>{if(String(url).includes('consume_login_attempt')){hashes.push(JSON.parse(opt.body).p_ip_hash);return new Response('false',{status:200,headers:{'content-type':'application/json'}});}return new Response('[]',{status:200});};
  for(const x of ['1.1.1.1','2.2.2.2']){const res={statusCode:0,setHeader(){},end(){}};await handler({method:'POST',query:{route:['auth','login']},body:{email:'a@b.co',password:'x'},headers:{'x-real-ip':'198.51.100.9','x-forwarded-for':x}},res);assert.equal(res.statusCode,429);}
  global.fetch=f;assert.equal(hashes.length,2);assert.equal(hashes[0],hashes[1]);
  delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
