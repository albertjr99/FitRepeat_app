#!/usr/bin/env python3
"""Reaplica em site/ as adaptações do app nativo depois de substituir index.html/sw.js
por uma versão nova vinda do desenvolvimento do PWA. É idempotente (pode rodar várias vezes).

Uso:  python3 scripts/aplicar-adaptacoes-nativas.py
"""
import re, pathlib, sys

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"
EMAIL = "contato.gratiast@gmail.com"
ok = True

def edit(name, fn):
    p = SITE / name
    s = p.read_text(encoding="utf8")
    n = fn(s)
    if n != s:
        p.write_text(n, encoding="utf8")
    return n

def need(cond, msg):
    global ok
    if not cond:
        ok = False
        print("ATENÇÃO:", msg)

# 1) e-mail de contato real nos três arquivos
for f in ("index.html", "privacy-policy.html", "terms.html"):
    edit(f, lambda s: s.replace("contato@seudominio.com.br", EMAIL))

# 2) index.html: ponte nativa + redefinição de senha apontando para um servidor configurável
def idx(s):
    vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n'
    if "native-bridge.js" not in s:
        need(vp in s, "meta viewport não encontrada")
        s = s.replace(vp, vp + '<script src="native-bridge.js"></script>\n', 1)
    old = "const RESET_API = '/.netlify/functions/reset';"
    new = "const RESET_API = String(window.FITREPEAT_API_BASE||'').replace(/\\/+$/,'') + '/.netlify/functions/reset';"
    if old in s:
        s = s.replace(old, new)
    need("FITREPEAT_API_BASE" in s, "RESET_API mudou no index.html; ajustar este script")
    a = "async function resetCall(body){\n  const r = await fetch(RESET_API,"
    if "not-configured" not in s:
        need(a in s, "resetCall mudou no index.html; ajustar este script")
        s = s.replace(a, "async function resetCall(body){\n  /* app nativo sem servidor configurado (FITREPEAT_API_BASE): não há como enviar o e-mail */\n  if(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && !window.FITREPEAT_API_BASE) throw new Error('not-configured');\n  const r = await fetch(RESET_API,", 1)
    b = "  if(!r.ok) throw new Error((j&&j.error)||('HTTP '+r.status));\n  return j||{};"
    if "bad-response" not in s:
        need(b in s, "tratamento de resposta do resetCall mudou; ajustar este script")
        s = s.replace(b, "  if(!r.ok) throw new Error((j&&j.error)||('HTTP '+r.status));\n  if(body.action==='request' && !(j&&j.ok)) throw new Error('bad-response');\n  return j||{};", 1)
    return s
edit("index.html", idx)

# 3) sw.js: cache inclui a ponte nativa
def sw(s):
    if "native-bridge.js" not in s:
        need('"./manifest.json",' in s, "lista ASSETS do sw.js mudou")
        s = s.replace('"./manifest.json",', '"./manifest.json", "./native-bridge.js",', 1)
    return s
edit("sw.js", sw)

print("Adaptações aplicadas." if ok else "Concluído com avisos (veja acima).")
sys.exit(0 if ok else 1)
