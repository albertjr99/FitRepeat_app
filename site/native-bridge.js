/* Fit Repeat — ponte nativa (Capacitor).
   Só age dentro do app Android/iOS; no navegador/PWA não faz nada.
   Adapta ao WebView o que ele não oferece: compartilhar arquivos, baixar arquivos,
   notificações e abrir links externos. O restante do app não precisa mudar. */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var Share = P.Share, FS = P.Filesystem, LN = P.LocalNotifications, Browser = P.Browser;

  /* O app já está dentro do pacote: service worker não é necessário (e atrapalha notificações). */
  try {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: null,
        ready: new Promise(function () {}),
        register: function () { return Promise.resolve(); },
        getRegistrations: function () { return Promise.resolve([]); },
        addEventListener: function () {}, removeEventListener: function () {}
      }
    });
  } catch (e) {}

  /* ---------- arquivos: compartilhar / baixar ---------- */
  function safeName(n) { return String(n || 'arquivo').replace(/[^\w.\-]+/g, '_'); }

  async function stage(file) {
    var name = safeName(file.name);
    var res = await FS.writeFile({ path: name, data: await file.text(), directory: 'CACHE', encoding: 'utf8' });
    return res.uri;
  }

  async function nativeShare(data) {
    data = data || {};
    var opts = { dialogTitle: data.title || undefined, title: data.title || undefined, text: data.text || undefined };
    if (data.files && data.files.length) {
      opts.files = [];
      for (var i = 0; i < data.files.length; i++) opts.files.push(await stage(data.files[i]));
    } else if (data.url) { opts.url = data.url; }
    try { await Share.share(opts); }
    catch (e) {
      if (/cancel/i.test(String(e && (e.message || e)))) { var a = new Error('Share canceled'); a.name = 'AbortError'; throw a; }
      throw e;
    }
  }

  if (Share && FS) {
    try {
      Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: function () { return true; } });
    } catch (e) {}

    /* a[download] com blob: (backup, ficha, calendário) -> abre a folha de compartilhamento/salvar */
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[download]');
      if (!a || !/^blob:/.test(a.href)) return;
      ev.preventDefault();
      var name = a.getAttribute('download') || 'arquivo';
      fetch(a.href).then(function (r) { return r.blob(); }).then(function (b) {
        return nativeShare({ title: name, files: [new File([b], name, { type: b.type })] });
      }).catch(function () {});
    }, true);
  }

  /* ---------- links externos: abrem no navegador do sistema ---------- */
  if (Browser) {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a || ev.defaultPrevented) return;
      var h = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(h) && a.target === '_blank') { ev.preventDefault(); Browser.open({ url: h }); }
    }, true);
  }

  /* ---------- notificações: API Notification sobre LocalNotifications ---------- */
  if (LN) {
    var perm = 'default';
    function map(s) { return s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'default'; }
    function refresh() { return LN.checkPermissions().then(function (r) { perm = map(r.display); return perm; }).catch(function () { return perm; }); }
    refresh();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });

    function NativeNotification(title, opts) {
      var id = Math.floor(Date.now() % 2147483000);
      LN.schedule({ notifications: [{ id: id, title: String(title), body: (opts && opts.body) || '', smallIcon: 'ic_stat_icon' }] }).catch(function () {});
    }
    Object.defineProperty(NativeNotification, 'permission', { get: function () { return perm; } });
    NativeNotification.requestPermission = function (cb) {
      return LN.requestPermissions().then(function (r) { perm = map(r.display); if (cb) cb(perm); return perm; });
    };
    try { Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: NativeNotification }); } catch (e) { window.Notification = NativeNotification; }
  }
})();
