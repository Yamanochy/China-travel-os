/* ═══════════════════════════════════════════════════════
   CHINA TRAVEL OS — SERVICE WORKER

   Стратегия: cache-first.
   Приложение НИКОГДА не ждёт сеть — сначала отдаёт
   сохранённую копию, а обновление тянет фоном.
   Это принципиально: в китайской провинции сеть может
   быть «есть, но не работает», и network-first завис бы.

   ВАЖНО: после каждой правки файлов меняйте VERSION
   на следующее число, иначе телефон продолжит
   показывать старую версию.
   ═══════════════════════════════════════════════════════ */

const VERSION = 'cto-v24';
const FILES = [
  './',
  './index.html',
  './data.js',
  './app.js',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(FILES).catch(()=>{}))
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(hit=>{
      // фоновое обновление — молча, не блокируя ответ
      const fresh = fetch(e.request).then(res=>{
        if(res && res.status===200 && res.type==='basic'){
          const copy = res.clone();
          caches.open(VERSION).then(c=>c.put(e.request, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>null);

      // если копия есть — отдаём мгновенно
      if(hit) return hit;

      // копии нет — ждём сеть, а если её нет, отдаём главную страницу
      return fresh.then(r => r || caches.match('./index.html'));
    })
  );
});
