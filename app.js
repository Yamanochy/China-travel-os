/* ═══════════════════════════════════════════════════════
   CHINA TRAVEL OS — ЛОГИКА
   Править не нужно: всё содержимое лежит в data.js
   ═══════════════════════════════════════════════════════ */

/* Меняйте этот номер на тот же, что и VERSION в sw.js, при каждой
   правке app.js/data.js. Виден внизу вкладки «Инфо» — по нему
   сразу понятно, актуальная ли сборка открыта на телефоне. */
const APP_BUILD = 'v24';

const App = document.getElementById('app');
let view = {tab:'now', day:null};

/* ── утилиты ───────────────────────────────────────── */
const esc = s => String(s==null?'':s);
const $ = id => document.getElementById(id);

function today(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayIndex(){
  const t = today();
  let i = DAYS.findIndex(x=>x.date===t);
  if(i>=0) return i;
  if(t < DAYS[0].date) return 0;
  if(t > DAYS[DAYS.length-1].date) return DAYS.length-1;
  return 0;
}

let toastTimer;
function toast(msg){
  const el = $('toast');
  el.innerHTML = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('on'), 4200);
}

/* только иероглифы — без пробелов, латиницы и цифр */
function cjkOnly(s){
  return String(s||'').replace(/[^\u4e00-\u9fff\u3400-\u4dbf]/g,'');
}

async function copyText(txt){
  try{
    await navigator.clipboard.writeText(txt);
    return true;
  }catch(e){
    try{
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }catch(e2){ return false; }
  }
}

/* ── MetroMan ──────────────────────────────────────── */
async function openMetroMan(station){
  const cn = cjkOnly(station);
  if(!cn){ toast('Не удалось определить станцию'); return; }
  const ok = await copyText(cn);
  toast(ok
    ? '«'+cn+'» скопировано. Вставьте в поиск MetroMan, если сам не переключился.'
    : 'Скопировать не удалось. Станция: <b>'+cn+'</b> — наберите вручную в MetroMan.');
  /* Пакет com.xinlukou.metroman подтверждён по странице приложения
     в Google Play. Если система не сможет переключить на само
     приложение — откроется страница MetroMan в Google Play,
     а не пустая ошибка. Копия в буфер сделана в любом случае. */
  if(/Android/i.test(navigator.userAgent)){
    setTimeout(()=>{
      try{
        window.location.href =
          'intent://#Intent;action=android.intent.action.MAIN;'
          + 'category=android.intent.category.LAUNCHER;'
          + 'package=com.xinlukou.metroman;'
          + 'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.xinlukou.metroman;'
          + 'end';
      }catch(e){}
    }, 900);
  }
}

/* ── Amap ──────────────────────────────────────────── */
function openAmap(q){
  const kw = encodeURIComponent(q);
  const ua = navigator.userAgent;
  let uri;
  if(/Android/i.test(ua)){
    uri = 'androidamap://poi?sourceApplication=ChinaTravelOS&keywords='+kw+'&dev=0';
  }else if(/iPhone|iPad|iPod/i.test(ua)){
    uri = 'iosamap://poi?sourceApplication=ChinaTravelOS&keywords='+kw+'&dev=0';
  }else{
    uri = 'https://uri.amap.com/search?keyword='+kw;
  }
  copyText(q);
  toast('«'+q+'» скопировано. Если показал не то место — проверьте, что вы уже в Китае: вне страны поиск ищет вокруг вас.');
  /* Официальная схема Amap — уже подтверждённая рабочей на вашем телефоне. */
  setTimeout(()=>{ try{ window.location.href = uri; }catch(e){} }, 700);
}

/* ── полноэкранная карточка ────────────────────────── */
function showCard(o){
  $('fs-k').textContent = o.kicker || 'Покажите этот экран';
  $('fs-cn').textContent = o.cn || '';
  $('fs-ad').textContent = o.sub || '';
  $('fs-tel').innerHTML = o.tel ? 'Тел.: <a href="tel:'+o.tel.replace(/\s/g,'')+'">'+o.tel+'</a>' : '';
  $('fs-say').textContent = o.say || '';
  $('fs-ru').textContent = o.ru || '';
  $('fs').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeFs(){
  $('fs').classList.remove('on');
  document.body.style.overflow = '';
}
function taxiById(id){ return TAXI.find(t=>t.id===id) || DESKS.find(t=>t.id===id); }
function deskById(id){ return DESKS.find(t=>t.id===id); }
function showDesk(id){
  const d = deskById(id);
  if(!d){ toast('Карточка не найдена'); return; }
  showCard({kicker:'Покажите этот экран кассиру', cn:d.cn, sub:d.sub||'', tel:'', say:'', ru:d.ru + (d.note? '  ·  '+d.note : '')});
}
function showTaxi(id){
  if(deskById(id)) return showDesk(id);
  const t = taxiById(id);
  if(!t){ toast('Карточка не найдена'); return; }
  showCard({kicker:'Покажите этот экран водителю', cn:t.cn, sub:t.sub||'', tel:t.tel||'', say:SAY, ru:SAY_RU});
}

/* ── рендер шага ───────────────────────────────────── */
function renderStep(s){
  let h = '<div class="step">';
  h += '<div class="num">'+(s.n||'')+'</div><div>';

  if(s.line){
    h += '<div class="roundel"><span class="dot" style="background:'+s.line.c+'"></span>'
       + '<span class="ln">'+s.line.ru+'</span>'
       + '<span class="ln-cjk">'+s.line.cn+'</span></div>';
  }
  if(s.h) h += '<div class="step-h">'+s.h+'</div>';
  if(s.dir){
    h += '<div class="dir"><span class="eyebrow">Направление</span><b>'+s.dir.cn+'</b>'
       + (s.dir.note ? '<small>'+s.dir.note+'</small>' : '') + '</div>';
  }
  if(s.b) h += '<div class="step-b">'+s.b+'</div>';

  if(s.k==='exit'){
    const un = s.ok ? '' : ' un';
    h += '<div class="plate'+un+'"><div class="plate-in">'
       + '<div class="plate-l">'+(s.letter||'?')+'</div><div class="plate-t">'
       + '<span class="eyebrow">'+(s.ok?'Выйти через выход':'Выход не подтверждён')+'</span>'
       + '<div class="plate-cjk">'+(s.cn||'出口')+'</div>'
       + (s.note?'<div class="plate-n">'+s.note+'</div>':'')
       + '</div></div></div>';
  }

  if(s.data && s.data.length){
    h += '<div class="data">'+s.data.map(d=>'<span>'+d+'</span>').join('')+'</div>';
  }

  h += '<div class="acts">';
  if(s.taxiCard){
    const t = taxiById(s.taxiCard);
    h += '<button class="act dark" onclick="showTaxi(\''+s.taxiCard+'\')">'
       + 'Показать таксисту<span class="k">'+(t?t.cn.slice(0,6):'')+'</span></button>';
  }
  if(s.deskCard){
    h += '<button class="act dark" onclick="showDesk(\''+s.deskCard+'\')">'
       + 'Показать кассиру<span class="k">БИЛЕТЫ</span></button>';
  }
  if(s.metroman){
    const rn = (typeof STATION_RU!=='undefined' && STATION_RU[s.metroman]) ? STATION_RU[s.metroman] : '';
    h += '<button class="act" onclick="openMetroMan(\''+s.metroman+'\')">'
       + '<span>Станция ' + (rn ? rn+' <span class="cjk">'+s.metroman+'</span>' : s.metroman)
       + '<span style="display:block;font-weight:400;color:var(--graphite);font-size:12.5px;margin-top:2px">Скопировать иероглифы и открыть MetroMan</span></span>'
       + '<span class="k">КОПИЯ</span></button>';
  }
  if(s.amap){
    h += '<button class="act" onclick="openAmap(\''+s.amap+'\')">'
       + '<span>Открыть в Amap<span style="display:block;font-weight:400;color:var(--graphite);font-size:12.5px;margin-top:2px">Точка: <span class="cjk">'+s.amap+'</span></span></span>'
       + '<span class="k">КАРТА</span></button>';
  }
  h += '</div>';

  h += '</div></div>';
  return h;
}

function renderBlock(s){
  if(s.k==='warn') return '<div class="warn">'+s.b+'</div>';
  if(s.k==='tip')  return '<div class="tip">'+s.b+'</div>';
  if(s.k==='info' && !s.n){
    let h = '<div style="padding:15px 0;border-top:1px solid var(--hairline)">';
    if(s.h) h += '<div class="step-h">'+s.h+'</div>';
    if(s.b) h += '<div class="step-b">'+s.b+'</div>';
    if(s.data) h += '<div class="data">'+s.data.map(d=>'<span>'+d+'</span>').join('')+'</div>';
    return h+'</div>';
  }
  return renderStep(s);
}

/* ── экран дня ─────────────────────────────────────── */
function renderDay(i){
  const day = DAYS[i];
  const H = HOTELS[day.hotel];
  let h = '';

  h += '<header class="head"><div class="head-row">'
     + '<span class="eyebrow">'+day.d+' сен · '+day.wd+'</span>'
     + '<span class="eyebrow">'+day.city+'</span></div>'
     + '<h1 class="h1">'+day.title+'</h1>'
     + (day.lede?'<p class="lede">'+day.lede+'</p>':'')
     + '</header>';

  if(H){
    h += '<div class="show"><span class="eyebrow">Ночуем здесь · '+H.when+'</span>'
       + '<div class="cjk-lg">'+H.ad+'</div>'
       + '<div class="rule"></div>'
       + '<div class="latin">'+H.ru+'</div>'
       + '<span class="tel">Тел.: <a href="tel:'+H.tel.replace(/\s/g,'')+'">'+H.tel+'</a></span>'
       + (H.verify?'<div class="plate un" style="margin-top:13px"><div class="plate-in">'
         + '<div class="plate-l">!</div><div class="plate-t">'
         + '<span class="eyebrow">Сверьте с ваучером</span>'
         + '<div class="plate-n">Адрес взят из вашей брони, но иероглифическое <b>название</b> отеля я не подтвердил. Если водитель не понимает — дайте ему позвонить по номеру выше, это работает всегда.</div>'
         + '</div></div></div>':'')
       + '<div class="acts"><button class="act dark" onclick="showTaxi(\''+day.hotel+'\')">Показать таксисту<span class="k">→</span></button></div>'
       + '</div>';
  }

  day.cards.forEach(c=>{
    h += '<div class="sect-t">'+c.title+'</div>';
    (c.steps||c.body||[]).forEach(s=>{ h += renderBlock(s); });
  });

  h += '<div class="acts" style="margin-top:26px">';
  if(i>0) h += '<button class="act" onclick="go(\'day\','+(i-1)+')"><span>← '+DAYS[i-1].d+' сентября</span><span class="k">'+DAYS[i-1].city+'</span></button>';
  if(i<DAYS.length-1) h += '<button class="act" onclick="go(\'day\','+(i+1)+')"><span>'+DAYS[i+1].d+' сентября →</span><span class="k">'+DAYS[i+1].city+'</span></button>';
  h += '</div>';

  return h;
}

/* ── экран «Сейчас» ────────────────────────────────── */
function renderNow(){
  const i = todayIndex();
  const t = today();
  let h = '';
  if(t < DAYS[0].date){
    const days = Math.round((new Date(DAYS[0].date)-new Date(t))/86400000);
    h += '<header class="head"><span class="eyebrow">До поездки</span>'
       + '<h1 class="h1">Осталось '+days+' дн.</h1>'
       + '<p class="lede">Приложение уже работает офлайн. Откройте его несколько раз дома с интернетом — тогда оно точно загрузится в Китае без сети.</p></header>';
    h += '<div class="sect-t">Первый день</div>';
    return h + renderDay(0).replace(/^<header[\s\S]*?<\/header>/,'');
  }
  if(t > DAYS[DAYS.length-1].date){
    h += '<header class="head"><span class="eyebrow">Поездка завершена</span>'
       + '<h1 class="h1">С возвращением</h1>'
       + '<p class="lede">Надеюсь, приложение пригодилось. Все дни остались во вкладке «Дни».</p></header>';
    return h;
  }
  return renderDay(i);
}

/* ── список дней ───────────────────────────────────── */
function renderDays(){
  const t = today();
  let h = '<header class="head"><span class="eyebrow">Маршрут</span>'
        + '<h1 class="h1">13 дней</h1>'
        + '<p class="lede">Пекин → Чунцин → Чжанцзяцзе → Шанхай → Пекин</p></header>'
        + '<div class="tip"><b>Как читать маршруты.</b> Русскими буквами написано, <i>что это</i> и как звучит. Иероглифы в рамке — <b>ровно то, что вы увидите на табличке или в приложении</b>. Читать их не нужно: сравнивайте картинку с картинкой.</div>';
  DAYS.forEach((d,i)=>{
    const cls = d.date===t ? ' now' : (d.date<t ? ' past' : '');
    h += '<button class="day-i'+cls+'" onclick="go(\'day\','+i+')">'
       + '<div class="day-d">'+d.d+'<small>'+d.wd.toUpperCase()+'</small></div>'
       + '<div><div class="day-c">'+d.city+'</div><div class="day-t">'+d.title+'</div></div>'
       + '</button>';
  });
  return h;
}

/* ── такси ─────────────────────────────────────────── */
function renderTaxi(){
  let h = '<header class="head"><span class="eyebrow">Показать экран</span>'
        + '<h1 class="h1">Такси и кассы</h1>'
        + '<p class="lede">Нажмите — откроется на весь экран крупными иероглифами. Водителю — адрес с просьбой, кассиру — готовый заказ билетов.</p></header>'
        + '<div class="sect-t" style="margin-top:22px">Такси · показать водителю</div>';
  let g = '';
  TAXI.forEach(t=>{
    if(t.g!==g){ g=t.g; h += '<div class="sect-t">'+g+'</div>'; }
    h += '<button class="tx" onclick="showTaxi(\''+t.id+'\')">'
       + '<span class="tx-t"><span class="tx-ru">'+t.ru+'</span>'
       + '<span class="tx-cn">'+t.cn+'</span></span>'
       + '<span class="tx-ch">→</span></button>';
  });
  h += '<div class="sect-t" style="margin-top:34px">Кассы · показать кассиру</div>';
  h += '<div class="tip">Все карточки рассчитаны на <b>двоих взрослых</b>. Кассир читает просьбу и сразу пробивает нужные билеты — объяснять ничего не нужно.</div>';
  let dg = '';
  DESKS.forEach(d=>{
    if(d.g!==dg){ dg=d.g; h += '<div class="sect-t">'+dg+'</div>'; }
    h += '<button class="tx" onclick="showDesk(\''+d.id+'\')">'
       + '<span class="tx-t"><span class="tx-ru">'+d.ru+'</span>'
       + '<span class="tx-cn">'+d.cn+'</span></span>'
       + '<span class="tx-ch">→</span></button>';
  });
  h += '<div class="foot">Если водитель не понимает адрес — дайте ему позвонить в отель. Номер есть на карточке каждого отеля.</div>';
  return h;
}

/* ── фразы ─────────────────────────────────────────── */
function renderPhrases(){
  let h = '<header class="head"><span class="eyebrow">Шпаргалка</span>'
        + '<h1 class="h1">Фразы</h1>'
        + '<p class="lede">Нажмите на фразу — она откроется на весь экран, чтобы показать собеседнику.</p></header>'
        + '<div class="tip"><b>Главное правило: показывайте, а не произносите.</b> Китайский тоновый — одно слово с разной интонацией значит разное. Транскрипция это подстраховка, рабочий вариант — дать прочитать иероглифы с экрана.</div>';
  let g = '';
  PHRASES.forEach((p,i)=>{
    if(p.g!==g){ g=p.g; h += '<div class="sect-t">'+g+'</div>'; }
    h += '<button class="tx ph'+(p.key?' key':'')+'" onclick="showPhrase('+i+')">'
       + '<span class="tx-t"><span class="tx-ru" style="font-weight:400;color:var(--graphite);font-size:14px">'+p.ru+'</span>'
       + '<span class="ph-cn">'+p.cn+'</span>'
       + '<span class="ph-tr">'+p.tr+'</span></span></button>';
  });
  return h;
}
function showPhrase(i){
  const p = PHRASES[i];
  showCard({kicker:'Покажите этот экран', cn:p.cn, sub:'', tel:'', say:'', ru:p.ru+'  ·  '+p.tr});
}

/* ── инфо ──────────────────────────────────────────── */
function renderInfo(){
  let h = '<header class="head"><span class="eyebrow">Справка</span>'
        + '<h1 class="h1">Инфо</h1></header>';
  INFO.forEach(sec=>{
    h += '<div class="sect-t">'+sec.g+'</div>';
    sec.items.forEach(it=>{
      h += '<div style="padding:14px 0;border-top:1px solid var(--hairline)">'
         + '<div style="display:flex;justify-content:space-between;gap:14px;align-items:baseline">'
         + '<div class="step-h" style="font-size:15px">'+it.ru+'</div>'
         + (it.v?'<div style="font-family:var(--mono);font-size:15px;font-weight:600;white-space:nowrap">'
            + '<a href="tel:'+it.v.replace(/[^0-9+]/g,'')+'" style="color:var(--seal);text-decoration:none">'+it.v+'</a></div>':'')
         + '</div>'
         + (it.note?'<div class="step-b" style="margin-top:4px">'+it.note+'</div>':'')
         + '</div>';
    });
  });
  h += '<div class="foot">China Travel OS · сборка '+APP_BUILD+' · 18–30 сентября 2026<br>'
     + 'Приложение работает полностью офлайн. Внешних загрузок нет — ничего не зависит от того, что заблокировано в Китае.</div>';
  return h;
}


/* ═══════════════════════════════════════════════════════
   СЕЙФ ДОКУМЕНТОВ

   Файлы хранятся ТОЛЬКО в памяти этого телефона
   (IndexedDB). Они не загружаются на сервер, не попадают
   в сборку приложения и не доступны ни по какой ссылке.
   Даже если кто-то откроет адрес приложения — он увидит
   пустой сейф.
   ═══════════════════════════════════════════════════════ */

const DOC_CATS = [
  {id:"pass",  ru:"Паспорта"},
  {id:"visa",  ru:"Визы"},
  {id:"fly",   ru:"Авиабилеты"},
  {id:"train", ru:"Поезда"},
  {id:"hotel", ru:"Отели"},
  {id:"ins",   ru:"Страховки"},
  {id:"tick",  ru:"Билеты в парки"},
  {id:"etc",   ru:"Прочее"}
];
let docCat = "pass";

const DB='cto-docs', ST='files';
function idb(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB,1);
    r.onupgradeneeded = ()=>{ const d=r.result; if(!d.objectStoreNames.contains(ST)) d.createObjectStore(ST,{keyPath:'id'}); };
    r.onsuccess = ()=>res(r.result);
    r.onerror   = ()=>rej(r.error);
  });
}
function tx(mode){ return idb().then(d=>d.transaction(ST,mode).objectStore(ST)); }
async function docPut(rec){ const s=await tx('readwrite'); return new Promise((res,rej)=>{const q=s.put(rec);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);}); }
async function docAll(){ const s=await tx('readonly');  return new Promise((res,rej)=>{const q=s.getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);}); }
async function docDel(id){ const s=await tx('readwrite'); return new Promise((res,rej)=>{const q=s.delete(id);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);}); }

let DOCS = [];
async function loadDocs(){
  try{ DOCS = await docAll(); }catch(e){ DOCS = []; }
  if(view.tab==='safe') render();
}

function kb(n){ return n>1048576 ? (n/1048576).toFixed(1)+' МБ' : Math.round(n/1024)+' КБ'; }

function pickDocs(cat){
  docCat = cat;
  const el = document.getElementById('docpick');
  el.value = '';
  el.click();
}

async function onDocPick(files){
  if(!files || !files.length) return;
  let ok=0, fail=0;
  for(const f of files){
    try{
      await docPut({ id:'d_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
                     cat:docCat, name:f.name, type:f.type, size:f.size, blob:f, added:Date.now() });
      ok++;
    }catch(e){ fail++; }
  }
  await loadDocs();
  toast(fail ? ('Добавлено: '+ok+', не удалось: '+fail)
             : ('Добавлено файлов: '+ok+'. Они хранятся только в этом телефоне.'));
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
}

let dvUrl = null;
function openDoc(id){
  const d = DOCS.find(x=>x.id===id);
  if(!d){ toast('Файл не найден'); return; }
  if(dvUrl){ URL.revokeObjectURL(dvUrl); dvUrl=null; }
  dvUrl = URL.createObjectURL(d.blob);
  const body = document.getElementById('dv-body');
  document.getElementById('dv-t').textContent = d.name;
  if((d.type||'').indexOf('image')===0){
    body.innerHTML = '<img src="'+dvUrl+'" alt="" style="max-width:100%;max-height:100%;object-fit:contain">';
  }else{
    body.innerHTML = '<div style="color:#E8E6E0;text-align:center;padding:30px;font-size:15px;line-height:1.6">'
      + 'Это PDF — откроется в отдельной вкладке.<br><br>'
      + '<button class="act" style="background:#E8E6E0;color:#0E1012;border:none;justify-content:center" '
      + 'onclick="window.open(\'' + dvUrl + '\',\'_blank\')">Открыть PDF</button></div>';
  }
  document.getElementById('dv').classList.add('on');
  document.body.style.overflow='hidden';
}
function closeDv(){
  document.getElementById('dv').classList.remove('on');
  document.body.style.overflow='';
  if(dvUrl){ URL.revokeObjectURL(dvUrl); dvUrl=null; }
}
async function removeDoc(id){
  const d = DOCS.find(x=>x.id===id);
  if(!d) return;
  if(!confirm('Удалить «'+d.name+'» из сейфа?')) return;
  try{ await docDel(id); await loadDocs(); toast('Удалено'); }
  catch(e){ toast('Не удалось удалить'); }
}

function renderSafe(){
  let h = '<header class="head"><span class="eyebrow">Только на этом телефоне</span>'
        + '<h1 class="h1">Сейф</h1>'
        + '<p class="lede">Паспорта, билеты, страховки. Открываются без интернета.</p></header>';

  h += '<div class="tip"><b>Файлы никуда не отправляются.</b> Они лежат в памяти этого телефона, не попадают в сборку приложения и недоступны ни по какой ссылке. Если кто-то откроет адрес приложения на своём устройстве — сейф у него будет пустым.</div>';

  const total = DOCS.reduce((a,d)=>a+(d.size||0),0);
  if(DOCS.length){
    h += '<div class="data" style="margin-top:14px"><span>'+DOCS.length+' ФАЙЛОВ</span><span>'+kb(total)+'</span></div>';
  }

  DOC_CATS.forEach(c=>{
    const list = DOCS.filter(d=>d.cat===c.id).sort((a,b)=>a.added-b.added);
    h += '<div class="sect-t">'+c.ru+'</div>';
    list.forEach(d=>{
      const isImg = (d.type||'').indexOf('image')===0;
      h += '<div class="tx" style="cursor:default">'
         + '<button style="flex:1;min-width:0;text-align:left;display:block" onclick="openDoc(\''+d.id+'\')">'
         + '<span class="tx-ru" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+d.name+'</span>'
         + '<span class="tx-cn" style="font-family:var(--mono);font-size:11.5px">'+(isImg?'ФОТО':'PDF')+' · '+kb(d.size||0)+'</span>'
         + '</button>'
         + '<button onclick="removeDoc(\''+d.id+'\')" style="flex:none;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--mute);padding:8px 6px">УДАЛИТЬ</button>'
         + '</div>';
    });
    h += '<button class="act" onclick="pickDocs(\''+c.id+'\')">'
       + '<span>'+(list.length?'Добавить ещё':'Добавить файлы')+'</span><span class="k">+</span></button>';
  });

  h += '<div class="foot"><b>Держите оригиналы и в другом месте.</b> Браузер может очистить память при нехватке места — оставьте те же файлы в галерее телефона или в почте. Сейф это быстрый доступ, а не единственная копия.<br><br>'
     + 'Совет: сфотографируйте паспорта и страховки крупно и при хорошем свете — их придётся показывать на стойках, где английского не будет.</div>';
  return h;
}

/* ═══════════════════════════════════════════════════════
   ТРЕКЕР РАСХОДОВ

   Тоже только в памяти этого телефона (как Сейф) —
   без сервера синхронизировать между двумя телефонами
   нечем. Если считаете расходы вдвоём — пусть один
   телефон будет общим журналом.
   ═══════════════════════════════════════════════════════ */

const MDB='cto-money', MST='entries';
function midb(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(MDB,1);
    r.onupgradeneeded = ()=>{ const d=r.result; if(!d.objectStoreNames.contains(MST)) d.createObjectStore(MST,{keyPath:'id'}); };
    r.onsuccess = ()=>res(r.result);
    r.onerror   = ()=>rej(r.error);
  });
}
function mtx(mode){ return midb().then(d=>d.transaction(MST,mode).objectStore(MST)); }
async function moneyPut(rec){ const s=await mtx('readwrite'); return new Promise((res,rej)=>{const q=s.put(rec);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);}); }
async function moneyAll(){ const s=await mtx('readonly');  return new Promise((res,rej)=>{const q=s.getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);}); }
async function moneyDel(id){ const s=await mtx('readwrite'); return new Promise((res,rej)=>{const q=s.delete(id);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);}); }

let MONEY = [];
let moneyCat = EXPENSE_CATS[0].id;
let moneyCur = 'CNY';

/* ── Firebase — общий журнал на двоих ─────────────────
   initFirebaseSync вызывается из модуля в index.html,
   как только (и если) подключение к Firebase удалось.
   До этого момента FB=null, и всё работает как раньше —
   только на этом телефоне. */
let FB = null;

function initFirebaseSync(refFn, setFn, onValueFn, db){
  FB = {ref:refFn, set:setFn, db:db};
  const expensesRef = refFn(db, 'expenses');
  onValueFn(expensesRef, (snap)=>{
    const val = snap.val() || {};
    const remote = Object.values(val);
    const remoteIds = new Set(remote.map(e=>e.id));
    /* Дослать стоит только то, что НИКОГДА не подтверждалось как
       отправленное (synced:false — например, добавлено без связи).
       Если записи нет в облаке, но она уже была синхронизирована
       раньше — значит, её удалили с другого телефона, и здесь её
       воскрешать не нужно. */
    const pending = MONEY.filter(e=>!remoteIds.has(e.id) && e.synced===false);
    MONEY = remote.concat(pending);
    pending.forEach(pushToFirebase);
    if(view.tab==='money') render();
  }, ()=>{ /* нет доступа — работаем локально */ });
}

function pushToFirebase(rec){
  if(!FB) return;
  try{
    FB.set(FB.ref(FB.db, 'expenses/'+rec.id), rec);
    if(!rec.synced){ rec.synced = true; moneyPut(rec).catch(()=>{}); }
  }catch(e){}
}
function removeFromFirebase(id){
  if(!FB) return;
  try{ FB.set(FB.ref(FB.db, 'expenses/'+id), null); }catch(e){}
}

async function loadMoney(){
  try{ MONEY = await moneyAll(); }catch(e){ MONEY = []; }
  if(view.tab==='money') render();
}

function pickCat(id){ moneyCat=id; render(); }
function pickCur(c){ moneyCur=c; render(); }

function toCny(amt,cur){ return cur==='CNY' ? amt : amt/EXPENSE_RATE; }
function toRub(amt,cur){ return cur==='CNY' ? amt*EXPENSE_RATE : amt; }
function fmtN(n){ return Math.round(n).toLocaleString('ru-RU'); }
function fmtBoth(amt,cur){ return fmtN(toCny(amt,cur))+' ¥ · '+fmtN(toRub(amt,cur))+' ₽'; }

async function addExpense(){
  const amtEl = document.getElementById('m-amt');
  const noteEl = document.getElementById('m-note');
  const dateEl = document.getElementById('m-date');
  const amt = parseFloat((amtEl.value||'').replace(',','.'));
  if(!amt || amt<=0){ toast('Введите сумму больше нуля'); return; }
  const rec = {
    id: 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    date: dateEl.value || today(),
    cat: moneyCat, cur: moneyCur, amt: amt,
    note: (noteEl.value||'').trim(),
    added: Date.now(), synced: false
  };
  try{
    await moneyPut(rec);
    pushToFirebase(rec);
    await loadMoney();
    toast('Добавлено: '+fmtBoth(amt,moneyCur));
  }catch(e){ toast('Не удалось сохранить запись'); }
}

async function delExpense(id){
  if(!confirm('Удалить эту запись?')) return;
  try{ await moneyDel(id); removeFromFirebase(id); await loadMoney(); toast('Удалено'); }
  catch(e){ toast('Не удалось удалить'); }
}

function renderMoney(){
  const syncOn = !!FB;
  let h = '<header class="head"><div class="head-row">'
        + '<span class="eyebrow">Учёт расходов</span>'
        + '<span class="eyebrow" style="color:'+(syncOn?'#2F7A4F':'var(--seal)')+'">'+(syncOn?'☁ ОБЩИЙ ЖУРНАЛ':'📵 ТОЛЬКО ЗДЕСЬ')+'</span>'
        + '</div>'
        + '<h1 class="h1">Траты</h1>'
        + '<p class="lede">Вводите сумму в юанях или рублях — приложение само пересчитает по курсу '+EXPENSE_RATE+' ₽/¥.</p></header>';

  h += '<div class="show">';
  h += '<span class="eyebrow">Новая запись</span>';
  h += '<div class="chips" style="margin-top:10px">' + EXPENSE_CATS.map(c=>
    '<button class="chip'+(c.id===moneyCat?' on':'')+'" onclick="pickCat(\''+c.id+'\')">'+c.ru+'</button>'
  ).join('') + '</div>';
  h += '<div class="seg" style="margin-top:12px">'
     + '<button class="'+(moneyCur==='CNY'?'on':'')+'" onclick="pickCur(\'CNY\')">¥ юани</button>'
     + '<button class="'+(moneyCur==='RUB'?'on':'')+'" onclick="pickCur(\'RUB\')">₽ рубли</button>'
     + '</div>';
  h += '<input id="m-amt" type="number" inputmode="decimal" placeholder="Сумма" class="m-input" style="margin-top:12px">';
  h += '<input id="m-note" type="text" placeholder="Заметка — необязательно" class="m-input" style="margin-top:8px">';
  h += '<input id="m-date" type="date" value="'+today()+'" min="2026-09-17" max="2026-09-30" class="m-input" style="margin-top:8px">';
  h += '<button class="act dark" style="margin-top:12px;justify-content:center" onclick="addExpense()">Добавить запись</button>';
  h += '</div>';

  const totalCny = MONEY.reduce((a,e)=>a+toCny(e.amt,e.cur),0);
  const totalRub = totalCny*EXPENSE_RATE;
  h += '<div class="show" style="text-align:center">';
  h += '<span class="eyebrow">Потрачено всего</span>';
  h += '<div class="money-big">'+fmtN(totalCny)+' ¥</div>';
  h += '<div style="font-family:var(--mono);color:var(--graphite);font-size:14px;margin-top:2px">≈ '+fmtN(totalRub)+' ₽</div>';
  h += '<div style="font-size:12.5px;color:var(--mute);margin-top:10px">Ориентир по плану: ≈ '+fmtN(EXPENSE_BUDGET_CNY)+' ¥ на двоих</div>';
  h += '</div>';

  if(MONEY.length){
    h += '<div class="sect-t">По категориям</div>';
    EXPENSE_CATS.forEach(c=>{
      const sum = MONEY.filter(e=>e.cat===c.id).reduce((a,e)=>a+toCny(e.amt,e.cur),0);
      if(!sum) return;
      const pct = totalCny ? Math.round(sum/totalCny*100) : 0;
      h += '<div style="padding:12px 0;border-top:1px solid var(--hairline)">'
         + '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:14.5px;font-weight:550">'
         + '<span>'+c.ru+'</span><span style="font-family:var(--mono);font-size:13px;color:var(--graphite)">'+fmtN(sum)+' ¥</span></div>'
         + '<div class="bar"><i style="width:'+pct+'%"></i></div>'
         + '</div>';
    });

    h += '<div class="sect-t">Все записи</div>';
    MONEY.slice().sort((a,b)=>b.added-a.added).forEach(e=>{
      const c = EXPENSE_CATS.find(x=>x.id===e.cat);
      h += '<div class="tx" style="cursor:default">'
         + '<span class="tx-t">'
         + '<span class="tx-ru">'+(c?c.ru:'—')+(e.note?' · '+esc(e.note):'')+'</span>'
         + '<span class="tx-cn" style="font-family:var(--mono);font-size:12px">'+e.date+' · '+fmtBoth(e.amt,e.cur)+'</span>'
         + '</span>'
         + '<button onclick="delExpense(\''+e.id+'\')" style="flex:none;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--mute);padding:8px 6px">УДАЛИТЬ</button>'
         + '</div>';
    });
  } else {
    h += '<div class="tip" style="margin-top:20px">Записей пока нет — добавьте первую трату выше.</div>';
  }

  h += '<div class="foot">Записи синхронизируются между телефонами через интернет. В Китае это гугл-сервис — если долго не появляется отметка «облако», проверьте, что включён VPN. Пока связи нет, всё равно сохраняется на этом телефоне и досылается, как только связь появится.</div>';
  return h;
}

/* ── навигация ─────────────────────────────────────── */
const ICONS = {
  now:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  days:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  taxi:'<path d="M5 17h14M6 17V11l2-5h8l2 5v6"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
  phrases:'<path d="M4 5h16v11H9l-5 4z"/>',
  money:'<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 10.5h18M15.5 15h2"/>',
  safe:'<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M12 17v3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};
const TABS = [
  ['now','Сейчас'], ['days','Дни'], ['taxi','Показать'], ['phrases','Фразы'], ['money','Траты'], ['safe','Сейф'], ['info','Инфо']
];

function renderNav(){
  $('nav').innerHTML = TABS.map(([k,label])=>
    '<button class="'+(view.tab===k?'on':'')+'" onclick="go(\''+k+'\')">'
    + '<svg viewBox="0 0 24 24">'+ICONS[k]+'</svg>'+label+'</button>'
  ).join('');
}

function go(tab, i){
  if(tab==='day'){ view = {tab:'day', day:i}; }
  else { view = {tab:tab, day:null}; }
  render();
  window.scrollTo(0,0);
}

function render(){
  let h;
  switch(view.tab){
    case 'day':     h = renderDay(view.day); break;
    case 'days':    h = renderDays(); break;
    case 'taxi':    h = renderTaxi(); break;
    case 'phrases': h = renderPhrases(); break;
    case 'money':   h = renderMoney(); break;
    case 'safe':    h = renderSafe(); break;
    case 'info':    h = renderInfo(); break;
    default:        h = renderNow();
  }
  App.innerHTML = h;
  $('nav').innerHTML = TABS.map(([k,label])=>{
    const on = (view.tab===k) || (view.tab==='day' && k==='days');
    return '<button class="'+(on?'on':'')+'" onclick="go(\''+k+'\')">'
      + '<svg viewBox="0 0 24 24">'+ICONS[k]+'</svg>'+label+'</button>';
  }).join('');
}


/* ═══════════════════════════════════════════════════════
   ЗАСТАВКА
   Показывается только при холодном запуске приложения.
   Держится минимум 1.25 с, снимается тапом в любой момент.
   ═══════════════════════════════════════════════════════ */
const SPLASH_MIN = 1250;
const splashStart = Date.now();
let splashDone = false;

function hideSplash(){
  if(splashDone) return;
  splashDone = true;
  const el = document.getElementById('splash');
  if(el) el.classList.add('gone');
}

(function initSplash(){
  const art = document.getElementById('splash-art');
  if(art) art.style.backgroundImage = "url('icon-512.png')";

  // счётчик дней до поездки
  const sub = document.getElementById('splash-sub');
  if(sub && typeof DAYS !== 'undefined'){
    const t = today();
    if(t < DAYS[0].date){
      const n = Math.round((new Date(DAYS[0].date) - new Date(t)) / 86400000);
      sub.textContent = 'до поездки ' + n + ' дн.';
    } else if(t > DAYS[DAYS.length-1].date){
      sub.textContent = 'поездка завершена';
    } else {
      const d = DAYS[todayIndex()];
      sub.textContent = d.d + ' сентября · ' + d.city;
    }
  }

  // облачка пыли
  const dust = document.getElementById('dust');
  if(dust){
    let html = '';
    for(let i=0;i<7;i++){
      const size = 26 + Math.random()*54;
      html += '<i style="right:'+(-12 + Math.random()*30)+'%;'
           +  'bottom:'+(6 + Math.random()*34)+'%;'
           +  'width:'+size+'px;height:'+size+'px;'
           +  'animation-duration:'+(2.4 + Math.random()*1.8)+'s;'
           +  'animation-delay:'+(Math.random()*1.6)+'s"></i>';
    }
    dust.innerHTML = html;
  }

  const left = Math.max(0, SPLASH_MIN - (Date.now() - splashStart));
  setTimeout(hideSplash, left);
  setTimeout(hideSplash, 4000); // страховка, если что-то пойдёт не так
})();

document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeFs(); closeDv(); } });
document.getElementById('docpick').addEventListener('change', function(){ onDocPick(this.files); });
loadDocs();
loadMoney();

render();

/* ── офлайн ────────────────────────────────────────── */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    /* Строка запроса берётся из APP_BUILD — той же переменной,
       что показана внизу вкладки «Инфо». Она обязана меняться
       при каждой правке, а значит и адрес worker.js будет каждый
       раз новым для браузера — без этого один раз закэшированная
       ссылка могла навсегда «залипнуть» на старой версии. */
    navigator.serviceWorker.register('worker.js?v='+APP_BUILD).catch(()=>{});
  });
}
