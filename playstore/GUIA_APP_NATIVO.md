# Fit Repeat — App nativo Android + iOS (Capacitor)

Este guia **substitui o Passo 4 e o Passo 5 do `GUIA_PLAYSTORE.md`** (TWA/Bubblewrap). O restante da ficha da loja (textos, capturas, política, Data safety) continua valendo.

## Por que Capacitor e não TWA
- TWA só existe no Android. Capacitor gera **Android e iOS a partir do mesmo código** (`site/`).
- O app roda **de dentro do pacote** (funciona offline desde a primeira abertura) e os dados ficam no armazenamento privado do app, não no Chrome. Não precisa de domínio nem de `assetlinks.json` para o app abrir em tela cheia.
- A Apple rejeita "site embrulhado". Com Capacitor há recursos nativos de verdade (compartilhar/salvar arquivos, notificações), o que ajuda na revisão.
- Você ainda precisa hospedar `site/privacy-policy.html` (a Play exige uma URL pública).

## O que foi configurado
| Item | Onde |
|---|---|
| ID do app | `com.gratia.fitrepeat` (`capacitor.config.json`) |
| Projetos nativos | `android/` e `ios/` |
| Target API | 36 (Android 16), minSdk 24 — exigência da Play em vigor |
| Ponte nativa | `site/native-bridge.js` (carregada no `index.html`; só age dentro do app) |
| Ícones/splash | gerados a partir de `logo/` em `resources/` (`npx capacitor-assets generate`) |
| Assinatura | `android/app/build.gradle` lê `android/keystore.properties` ou variáveis de ambiente |
| Build na nuvem | `.github/workflows/android-release.yml` |

### O que a ponte nativa faz
O WebView do celular não tem algumas funções do navegador. `native-bridge.js` as substitui, sem mexer no resto do app:
- **Backup / ficha / calendário (.ics)**: abre a folha de compartilhar/salvar do sistema (e-mail, Drive, Arquivos).
- **Lembretes**: usam notificações locais nativas (pedem permissão no Android 13+/iOS).
- **Links externos** (YouTube, fontes): abrem no navegador do sistema.
- **Service worker**: desligado dentro do app (o app já está embutido).
- O app **não pede** alarme exato, boot nem wake lock (evita declarações extras na Play).
- `allowBackup=false`: os dados não vão para o backup do Google, coerente com "nada sai do aparelho".

Limite que continua: lembretes só disparam com o app aberto ou recém-aberto (sem servidor/agendamento). Dá para evoluir depois.

## Gerar o .aab

### Chave de upload (faça uma vez, guarde com cópia!)
Foi gerada a `fitrepeat-upload.keystore` (alias `fitrepeat-upload`). **Nunca suba para o GitHub.** Guarde o arquivo e a senha em local seguro (gerenciador de senhas + cópia offline). Ao enviar o primeiro .aab, **ative o Play App Signing**: a Google guarda a chave final; se você perder a chave de upload, dá para pedir reset ao suporte da Play.

### Opção A — no GitHub (recomendado, não precisa instalar nada)
1. No repositório: *Settings → Secrets and variables → Actions → New repository secret*:
   - `ANDROID_KEYSTORE_B64` → conteúdo do keystore em base64 (`base64 -w0 fitrepeat-upload.keystore`)
   - `ANDROID_KEYSTORE_PASSWORD` → senha do keystore
   - `ANDROID_KEY_ALIAS` → `fitrepeat-upload`
2. *Actions → Android AAB (Play Store) → Run workflow* → informe o `versionCode` (1 no primeiro envio; **sempre maior** a cada novo envio).
3. Ao terminar, baixe o artefato `fit-repeat-release-aab` (contém `app-release.aab`).

### Opção B — no seu computador
Requer Node 22, JDK 21 e Android SDK (Android Studio instala).
```
npm ci
# crie android/keystore.properties (já ignorado pelo git):
#   storeFile=/caminho/fitrepeat-upload.keystore
#   storePassword=...
#   keyAlias=fitrepeat-upload
#   keyPassword=...
npm run android:build
# saída: android/app/build/outputs/bundle/release/app-release.aab
```

## Atualizar o app depois
Qualquer mudança em `site/` exige **novo build** (o site não é mais baixado em tempo de execução). Aumente `versionCode` (e `versionName` em `android/app/build.gradle`) a cada envio.

## iOS (próxima etapa)
O projeto `ios/` já está criado, mas precisa de **Mac com Xcode** (ou runner macOS na nuvem) e de **conta Apple Developer (US$ 99/ano)**.
Pendências conhecidas para validar em aparelho/simulador:
- Se `crypto.subtle` (senha/backup criptografado) está disponível no esquema `capacitor://` do iOS; o app já degrada se não estiver, mas é preciso testar.
- Textos de privacidade da App Store (Privacy Nutrition Labels), classificação etária, capturas 6,7" e 6,5".
- Certificados e provisioning profile (assinatura).

## Antes de publicar — testar num aparelho
Instale o `.aab`/APK de teste e confira: abrir offline, cadastro/login, salvar treino, **backup por e-mail** (folha de compartilhar), exportar calendário, permissão e disparo de lembrete, links de vídeo, tela cheia/barra de status.
