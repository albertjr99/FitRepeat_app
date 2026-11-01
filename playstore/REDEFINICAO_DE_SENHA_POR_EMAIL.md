# Redefinição de senha por e-mail — como ativar

O app agora recupera a senha por **link enviado ao e-mail cadastrado** (o código de recuperação foi removido).
Como o Fit Repeat não tem servidor próprio, o envio do e-mail é feito por uma **pequena função** que vem pronta em `site/netlify/functions/reset.js`. Ela só assina e verifica o link; **não guarda e-mails nem senhas**.

Enquanto a função não estiver ativa, a tela “Esqueci a senha” avisa que não foi possível enviar o e-mail e oferece “apagar tudo e recomeçar” (com restauração de backup).

## Como o fluxo funciona
1. Na tela de login, “Esqueci a senha” → o app envia ao servidor o e-mail cadastrado + um código aleatório gerado **neste aparelho**.
2. O servidor monta um link assinado (validade de 30 min) e o envia por e-mail.
3. O usuário abre o link **no mesmo aparelho**; o app confere a assinatura com o servidor e confere se o código é o do aparelho. Só então deixa criar a nova senha. Cada link vale uma única vez.

## Passo a passo (cerca de 20 minutos)
1. **Resend** (resend.com, plano gratuito: 3.000 e-mails/mês): crie conta, verifique o seu domínio (ou use o domínio de teste deles) e gere uma **API key**.
2. **Netlify com funções**: o “Netlify Drop” (arrastar a pasta) normalmente **não publica funções**. Use uma destas formas:
   - `npx netlify-cli deploy --prod --dir=site --functions=site/netlify/functions` (na pasta do pacote), ou
   - ligue um repositório Git ao Netlify com a pasta `site/` (já tem `netlify.toml`).
3. No Netlify → *Site configuration → Environment variables*, crie:
   | Variável | Valor |
   |---|---|
   | `RESET_SECRET` | texto aleatório longo (32+ caracteres) |
   | `RESEND_API_KEY` | a chave do Resend |
   | `MAIL_FROM` | `Fit Repeat <nao-responda@seudominio.com.br>` (remetente verificado) |
   | `SITE_URL` | `https://SEU-SITE.netlify.app` (sem barra no final) |
4. Refaça o deploy e teste: crie uma conta, bloqueie o app, toque em “Esqueci a senha”.

## Limites e cuidados (honestos)
- **Não testei o envio real** (preciso da sua chave do Resend). O que foi testado: a função (assinatura, validade, adulteração, limite de pedidos) e todo o fluxo do app com um servidor simulado.
- O link precisa ser aberto **no mesmo navegador/aparelho** onde o pedido foi feito (é isso que impede que alguém use o seu e-mail para entrar). Se abrir em outro aparelho, o app pede um novo link.
- A função limita 3 pedidos por e-mail e 10 por IP por hora (em memória; reinicia quando a função “dorme”). Para proteção forte contra abuso, adicione Cloudflare Turnstile ou similar.
- Os dados do app ficam no aparelho e **não são criptografados pela senha**: a senha é uma trava de acesso ao app. Por isso redefinir pelo e-mail não expõe nem apaga dados.
- A política de privacidade e o consentimento já foram atualizados (versão 2026-10.3) para informar que o e-mail é usado, só se o usuário pedir, para enviar o link. Peça revisão jurídica.
