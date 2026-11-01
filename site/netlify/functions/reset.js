// Fit Repeat — redefinição de senha por link enviado ao e-mail cadastrado.
// Variáveis de ambiente (Netlify → Site settings → Environment variables):
//   RESET_SECRET    texto longo e aleatório (assina os links)          [obrigatória]
//   RESEND_API_KEY  chave da API do Resend (resend.com)                [obrigatória]
//   MAIL_FROM       remetente verificado, ex.: Fit Repeat <nao-responda@seudominio.com.br> [obrigatória]
//   SITE_URL        endereço do app, ex.: https://seusite.netlify.app  [obrigatória]
// O servidor NÃO guarda e-mails nem senhas: só assina um token com validade de 30 min.
const crypto = require('crypto');
const TTL = 30 * 60 * 1000;
const hits = new Map(); // limite simples por instância: 3 pedidos/hora por e-mail e 10/hora por IP

const b64u = b => Buffer.from(b).toString('base64url');
const sign = (p, secret) => crypto.createHmac('sha256', secret).update(p).digest('base64url');
const res = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, extra || {}), body: JSON.stringify(obj) });
function limited(key, max) {
  const now = Date.now(), arr = (hits.get(key) || []).filter(t => now - t < 3600000);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr); return false;
}
const TXT = {
  pt: { subj: 'Redefinir sua senha do Fit Repeat', h: 'Redefinir senha', p: 'Recebemos um pedido para criar uma nova senha no Fit Repeat. Toque no botão abaixo, neste mesmo aparelho, para continuar. O link vale por 30 minutos.', b: 'Criar nova senha', n: 'Se você não pediu, ignore este e-mail: nada será alterado.' },
  en: { subj: 'Reset your Fit Repeat password', h: 'Reset password', p: 'We received a request to create a new password for Fit Repeat. Tap the button below, on this same device, to continue. The link is valid for 30 minutes.', b: 'Create new password', n: 'If you did not ask for this, ignore this e-mail: nothing will change.' },
  es: { subj: 'Restablece tu contraseña de Fit Repeat', h: 'Restablecer contraseña', p: 'Recibimos una solicitud para crear una nueva contraseña en Fit Repeat. Toca el botón de abajo, en este mismo dispositivo, para continuar. El enlace vale 30 minutos.', b: 'Crear nueva contraseña', n: 'Si no lo pediste, ignora este correo: no cambiará nada.' }
};
function mail(lang, link) {
  const t = TXT[lang] || TXT.pt;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111"><h2 style="margin:0 0 12px">${t.h}</h2><p style="line-height:1.5">${t.p}</p><p style="margin:24px 0"><a href="${link}" style="background:#FF5A36;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;display:inline-block">${t.b}</a></p><p style="font-size:13px;color:#555">${t.n}</p><p style="font-size:12px;color:#888">Fit Repeat · by Gratia</p></div>`;
  return { subject: t.subj, html, text: `${t.p}\n\n${link}\n\n${t.n}` };
}
exports.handler = async (event) => {
  const cors = { 'Access-Control-Allow-Origin': process.env.SITE_URL || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return res(405, { error: 'method' }, cors);
  const secret = process.env.RESET_SECRET;
  if (!secret || secret.length < 24) return res(500, { error: 'not-configured' }, cors);
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return res(400, { error: 'json' }, cors); }

  if (body.action === 'request') {
    const email = String(body.email || '').trim().toLowerCase(), n = String(body.n || ''), lang = ['pt', 'en', 'es'].includes(body.lang) ? body.lang : 'pt';
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) || !/^[A-Za-z0-9_-]{16,64}$/.test(n)) return res(400, { error: 'invalid' }, cors);
    const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'ip';
    if (limited('e:' + email, 3) || limited('i:' + ip, 10)) return res(429, { error: 'rate' }, cors);
    const site = (process.env.SITE_URL || '').replace(/\/+$/, '');
    if (!site || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res(500, { error: 'not-configured' }, cors);
    const p = b64u(JSON.stringify({ e: email, n, exp: Date.now() + TTL }));
    const link = `${site}/#reset=${p}.${sign(p, secret)}`;
    const m = mail(lang, link);
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: m.subject, html: m.html, text: m.text }) });
    if (!r.ok) return res(502, { error: 'mail' }, cors);
    return res(200, { ok: true }, cors);
  }

  if (body.action === 'verify') {
    const tok = String(body.token || ''), i = tok.lastIndexOf('.');
    if (i < 1) return res(200, { ok: false }, cors);
    const p = tok.slice(0, i), sig = tok.slice(i + 1), exp = sign(p, secret);
    const a = Buffer.from(sig), b = Buffer.from(exp);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res(200, { ok: false }, cors);
    let d; try { d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch (e) { return res(200, { ok: false }, cors); }
    if (!d || !d.e || !d.n || Date.now() > d.exp) return res(200, { ok: false }, cors);
    return res(200, { ok: true, email: d.e, n: d.n }, cors);
  }
  return res(400, { error: 'action' }, cors);
};
