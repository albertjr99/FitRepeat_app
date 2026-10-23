# Fit Repeat — Guia de publicação na Google Play

Atualizado em 15/10/2026. Tudo que está nesta pasta já vem pronto; os campos `SEU-...` / `SEUDOMINIO` você preenche uma vez.

## 0. Como o app vai para a Play Store
O Fit Repeat é um PWA. Na Play Store ele entra como **TWA (Trusted Web Activity)**: um app Android mínimo que abre o seu site em tela cheia, sem barra de endereço. Isso é aceito pela Google, mas tem consequências:

- **Atualizações**: basta republicar o site (pasta `site/`). Não precisa enviar nova versão à Play, exceto para mudar ícone, nome ou permissões.
- **Dados do usuário**: ficam no armazenamento do Chrome do aparelho. "Limpar dados do Chrome" pode apagar os dados do app, por isso o backup por e-mail é importante (já está no app).
- **Lembretes**: continuam funcionando só com o app aberto ou em segundo plano recente (limite já documentado no app). Notificação push com app fechado exigiria servidor — fora do escopo.

## 1. O que há no pacote
| Arquivo | Para quê |
|---|---|
| `site/` | Site pronto para hospedar (index.html, manifest, sw.js, ícones, política, termos, assetlinks) |
| `site/privacy-policy.html` | URL da política de privacidade (obrigatória na Play Console) |
| `site/assetlinks.json` + `_redirects` + `_headers` | Verificação de domínio (Digital Asset Links) |
| `playstore/twa-manifest.json` | Configuração de referência do Bubblewrap |
| `playstore/feature-graphic-1024x500.png` | Gráfico de recursos (obrigatório) |
| `playstore/screenshots/*.png` | 6 capturas 1080×1920 (mín. 2, recomendado 4–8) |
| `site/icon-512.png` | Ícone da loja (512×512) |
| `playstore/listing_ptbr.md`, `listing_en.md`, `listing_es.md` | Textos da ficha da loja (3 idiomas); capturas e gráfico também em `en/` e `es/` |

## 2. Passo a passo

### Passo 1 — Preencha seus dados legais (5 min)
Em `build/legal.py` (ou editando direto no `treino.html`, constante `APP_INFO`, e em `site/privacy-policy.html`) troque:
- `CONTROLLER` → seu nome ou razão social;
- `CONTACT` → e-mail de contato para privacidade.
Esses dados aparecem na política dentro do app e na página pública. Se mudar o texto da política de forma relevante, aumente `CONSENT_VERSION` (o app pedirá novo aceite).

### Passo 2 — Hospede o site com HTTPS (grátis)
1. Crie conta gratuita no **Netlify** (ou Cloudflare Pages).
2. Envie a pasta **`site/`** inteira (arrastar para o Netlify Drop). **Crie conta e reivindique o site** para a URL ficar fixa (ex.: `treino-ppl.netlify.app`).
3. Teste no Chrome do celular: `https://SEU-SITE.netlify.app/` → deve abrir o app, pedir o aceite e oferecer "Instalar app".
4. Confira `https://SEU-SITE.netlify.app/privacy-policy.html` e `https://SEU-SITE.netlify.app/.well-known/assetlinks.json` (o `_redirects` faz esse caminho funcionar; deve abrir o JSON).

> Um domínio próprio (ex.: `fitrepeat.com.br`) é mais profissional e evita ficar preso ao nome do provedor, mas não é obrigatório.

### Passo 3 — Crie a conta de desenvolvedor Google Play
- Taxa única de **US$ 25**; verificação de identidade (documento) e número de telefone.
- **Conta pessoal criada após 13/11/2023**: antes de publicar em produção é exigido **teste fechado com no mínimo 12 testadores optados continuamente por 14 dias**. Conta de organização (com CNPJ e número D-U-N-S) não tem essa exigência. Planeje: chame 12+ pessoas com conta Google e coloque-as na lista de testadores.

### Passo 4 — Gere o pacote Android (.aab)
Duas opções:

**A) PWABuilder (mais simples, sem instalar nada)**: acesse pwabuilder.com → cole a URL do site → *Package for stores* → *Android* → informe o ID do pacote (ex.: `br.com.seunome.treinoppl`), nome "Fit Repeat", versão 1 → baixe o zip (traz o `.aab`, a chave de assinatura e instruções). **Guarde a chave (keystore) e a senha em local seguro e com cópia** — perder a chave impede atualizações futuras (se usar Play App Signing, a Google guarda a chave final e você mantém só a de upload).

**B) Bubblewrap (linha de comando)**: precisa de Node.js, JDK 17 e Android SDK (o CLI baixa e configura).
```
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://SEU-SITE.netlify.app/manifest.json
bubblewrap build        # gera app-release-bundle.aab
```
Use `playstore/twa-manifest.json` como referência dos campos.

> **Exigência de API**: desde 31/08/2026 novos apps e atualizações devem ter **target API 36 (Android 16) ou superior**. Use PWABuilder/Bubblewrap em versão atual e confira o `targetSdkVersion` do `.aab` gerado; se o gerador estiver antigo, o upload será recusado.

### Passo 5 — Digital Asset Links (remove a barra de endereço)
1. No Play Console → seu app → *Teste e lançamento → Integridade do app → Assinatura de apps* → copie o **SHA-256 do certificado de assinatura do app** (o da Google, não o de upload).
2. Edite `site/assetlinks.json`: coloque o `package_name` igual ao ID do pacote e o SHA-256 em `sha256_cert_fingerprints`.
3. Republique a pasta `site/`.
4. Valide em: https://developers.google.com/digital-asset-links/tools/generator
Sem isso o app abre com barra do Chrome (funciona, mas não é "tela cheia de verdade").

### Passo 6 — Ficha na Play Console (resumo)
- **Categoria**: Saúde e fitness. **Tipo**: Aplicativo. **Gratuito**.
- **Política de privacidade**: `https://SEU-SITE/privacy-policy.html`.
- **Textos, ícone, gráfico, capturas**: `playstore/listing_ptbr.md` + arquivos desta pasta.
- **Declaração de apps de saúde** (*Conteúdo do app → Apps de saúde*): marque que é app de fitness/bem-estar, sem diagnóstico ou tratamento médico (o aviso de saúde já está nos termos e na política).
- **Classificação de conteúdo (IARC)**: questionário — sem violência, sem conteúdo adulto, sem compras, sem conteúdo gerado por usuários compartilhado → deve resultar em "Livre".
- **Público-alvo**: 18+ (o app bloqueia cadastro de menores).
- **Anúncios**: não contém. **Compras no app**: não.
- **Segurança dos dados (Data safety)**: ver quadro abaixo.
- **Exclusão de conta**: o app permite criar conta, então a Play exige caminho de exclusão. Dentro do app: *Ajustes → Conta e privacidade → Excluir conta*. URL pública para informar: `https://SEU-SITE/privacy-policy.html#exclusao`.
- **Países**: Brasil (ou todos).

### Passo 7 — Teste fechado → produção
1. Crie a faixa de **Teste fechado**, envie o `.aab`, adicione os testadores (lista de e-mails).
2. Os testadores aceitam o convite e **permanecem 14 dias seguidos** (conta pessoal).
3. Depois solicite o **acesso à produção**, responda o formulário (como testou, feedback) e publique.
4. A revisão da Google costuma levar de poucas horas a alguns dias.

## 3. Segurança dos dados (Data safety) — respostas sugeridas
Premissa técnica do app: **nada sai do aparelho**; não há servidor, SDK de análise, anúncios nem fontes externas. O backup por e-mail é uma ação do próprio usuário via app de e-mail/compartilhamento do sistema.

| Pergunta | Resposta sugerida |
|---|---|
| O app coleta ou compartilha dados de usuário? | **Não** (dados tratados apenas no aparelho, sem transmissão a você ou a terceiros) |
| Dados criptografados em trânsito? | Não se aplica (sem transmissão) — o site é servido por HTTPS |
| Usuário pode pedir exclusão? | Sim (no app) |
| Política de privacidade | URL do passo 6 |

> Confirme essas respostas na sua conta: a Google pode exigir revisão se você acrescentar servidor, analytics ou anúncios. A responsabilidade final pelas declarações é sua.

## 4. Limites honestos do que foi implementado
- **A conta é local**: nome, e-mail e senha ficam só no aparelho (não existe login em servidor nem "entrar em outro celular"). Para trocar de aparelho use o backup por e-mail.
- **Senha**: PBKDF2-SHA-256 (600 mil iterações), exigência de 10+ caracteres com maiúscula, minúscula, número e símbolo, bloqueio de senhas comuns/sequências/nome/e-mail, espera crescente após 5 erros. O bloqueio protege o **acesso ao app**; os dados no aparelho não são criptografados em repouso (isso está declarado na política). O backup pode ser criptografado com AES-256-GCM.
- **Backup por e-mail**: o app não envia e-mails sozinho (isso exigiria servidor). Ele monta o arquivo + resumo e abre o compartilhamento/e-mail do celular; o usuário toca em enviar.
- **Esqueci a senha**: só com o código de recuperação mostrado uma vez no cadastro; sem ele o caminho é apagar tudo e restaurar um backup.
- **Revisão jurídica**: os textos seguem a LGPD de forma geral, mas não substituem revisão de um advogado, principalmente se o app virar comercial.
- **Fontes**: Inter e Bebas Neue (licença SIL OFL) estão embutidas no app, sem chamada ao Google Fonts.

## 5. Fontes consultadas
- Exigência de teste fechado (12 testadores / 14 dias): https://support.google.com/googleplay/android-developer/answer/14151465
- Target API 36 a partir de 31/08/2026: https://developer.android.com/google/play/requirements/target-sdk
