/* =========================
   app.js — «Сны Грамота Судьбы»
   Унифицированный, с фиксом фонов + ползунок «Прозрачность окон (.glass)»
   ========================= */

/* ===== Контакты (замените на свои) ===== */
const EMAIL_TO = 'example@dreams.site';
const WA_NUMBER = '79991234567';          // WhatsApp без плюса
const TG_USER   = 'YourTelegramUsername'; // Telegram без @

/* ===== Утилиты ===== */
function byId(id){ return document.getElementById(id); }
function escQuotes(s){ return (s||'').replace(/"/g,'\\"').replace(/'/g,"\\'"); }
function setYear(){ const y=byId('year'); if(y) y.textContent=new Date().getFullYear(); }

const IMG_EXT=/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i;
const VID_EXT=/(\.mp4|\.webm|\.ogg)$/i;

function basename(p){
  try{ p=p.split('?')[0].split('#')[0]; const parts=p.split('/'); return parts[parts.length-1]; }
  catch(_){ return p; }
}
function inDir(dir,file){ return dir.replace(/\/$/,'')+'/'+String(file||'').replace(/^\//,''); }
function resolveBg(x){ const f=basename(String(x||'').trim()); return f?inDir('phon',f):''; }
function resolveImg(x){ const f=basename(String(x||'').trim()); return f?inDir('Pictures',f):''; }
function resolveVideo(x){ const f=basename(String(x||'').trim()); return f?inDir('video',f):''; }

function ytToEmbed(u){
  try{
    if(!u) return '';
    let id='';
    try{
      const url=new URL(u);
      if(url.hostname.includes('youtu.be')) id=url.pathname.replace(/^\//,'');
      else if(url.hostname.includes('youtube.com')){
        id=url.searchParams.get('v')||'';
        if(!id && url.pathname.startsWith('/shorts/')) id=(url.pathname.split('/')[2]||'');
      }
    }catch(_){}
    if(!id){
      const m1=u.match(/youtu\.be\/([\w-]+)/);
      const m2=u.match(/youtube\.com\/(?:watch\?v=|shorts\/)([\w-]+)/);
      id=(m1&&m1[1])||(m2&&m2[1])||'';
    }
    return id?('https://www.youtube.com/embed/'+id):'';
  }catch(e){ return ''; }
}

/* ===== Фоны по разделам ===== */
const IDS=['home','method','author','contact','cases','booking','songs','faq'];
const bgKey    = id => 'bg-'+id;
const alphaKey = id => 'bg-alpha-'+id;

/* FIX: НЕ стираем inline-фон, если ключа в localStorage нет вовсе (stored === null).
        Также если stored === '' — оставляем inline-фон. stored === 'none' — явное отключение. */
function applySection(id){
  const el = byId('bg-' + id);
  if(!el) return;

  const stored = localStorage.getItem(bgKey(id)); // null | "" | "file" | "none"
  const alpha  = Number(localStorage.getItem(alphaKey(id)) || '28');

  if (stored === null || stored.trim() === '') {
    // не меняем backgroundImage — используется встроенный inline-фон из HTML
  } else if (stored === 'none') {
    el.style.backgroundImage = '';
  } else {
    const file = basename(stored);
    const bg   = file ? resolveBg(file) : '';
    el.style.backgroundImage = bg ? ('url("' + escQuotes(bg) + '")') : '';
  }

  el.style.opacity = String(Math.max(0, Math.min(100, alpha)) / 100);
}

function setBgFor(id,file){
  const name = basename(file||'');
  localStorage.setItem(bgKey(id), name);
  const el = byId('bg-'+id);
  if(el){
    const full = name ? resolveBg(name) : '';
    el.style.backgroundImage = full ? ('url("'+escQuotes(full)+'")') : '';
  }
}

/* ===== Навигация ===== */
function setActiveNav(){
  const path=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('nav a.nav-link, header nav a').forEach(a=>{
    a.classList.remove('active');
    const href=(a.getAttribute('href')||'').replace('./','');
    if(href===path) a.classList.add('active');
  });
}
function initNavHover(){
  document.querySelectorAll('.nav-link').forEach(a=>{
    a.addEventListener('mouseenter',()=>a.classList.add('bg-fuchsia-600/20','text-white'));
    a.addEventListener('mouseleave',()=>a.classList.remove('bg-fuchsia-600/20','text-white'));
  });
}

/* ===== Включаем общие HTML-фрагменты (contact/video модалки) ===== */
async function includeFragments(){
  const nodes=[...document.querySelectorAll('[data-include]')];
  await Promise.all(nodes.map(async n=>{
    const url = n.getAttribute('data-include'); if(!url) return;
    try{
      const r=await fetch(url,{cache:'no-cache'});
      const html=await r.text();
      n.outerHTML=html;
    }catch(e){ console.warn('include fail',url,e); }
  }));
}

/* ===== Контактная форма и модалка ===== */
function initContactForm(){
  const form=byId('contactForm'); const thanks=byId('contactThanks');
  if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(thanks){ thanks.classList.remove('hidden'); setTimeout(()=>thanks.classList.add('hidden'),3000); }
    form.reset();
  });
}
function initContactModal(){
  const modal=byId('contactModal'); if(!modal) return;
  const closeBtn=byId('closeContactModal');
  const form=byId('contactForm');
  const userName=byId('userName'); const userEmail=byId('userEmail'); const msg=byId('contactMessage');
  const btnWA=byId('btnWhatsApp'); const btnTG=byId('btnTelegram');

  if(form) form.setAttribute('action', `mailto:${EMAIL_TO}`);
  if(btnWA) btnWA.href=`https://wa.me/${WA_NUMBER}`;
  if(btnTG) btnTG.href=`https://t.me/${TG_USER}`;

  // профиль (если сохранён в booking)
  const profName=localStorage.getItem('profile_name')||'';
  const profMail=localStorage.getItem('profile_email')||'';
  if(userName && !userName.value)  userName.value  = profName;
  if(userEmail&& !userEmail.value) userEmail.value = profMail;

  document.querySelectorAll('[data-open="contact"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      modal.classList.remove('hidden'); modal.classList.add('flex');

      // авто-подстановка выбранных данных из booking
      const product=document.getElementById('product');
      const dateStr=localStorage.getItem('booking_date')||'';
      const timeStr=localStorage.getItem('booking_time')||'';
      const work   =document.getElementById('work');
      if(msg && !msg.value){
        const parts=[];
        if(product) parts.push(`Продукт: ${product.value}`);
        if(dateStr||timeStr) parts.push(`Дата/время: ${dateStr||'—'} ${timeStr||'—'}`);
        if(work && work.value) parts.push(`Описание: ${work.value}`);
        if(parts.length) msg.value = `Здравствуйте! Хочу уточнить.\n${parts.join('\n')}`;
      }
    });
  });

  function hide(){ modal.classList.add('hidden'); modal.classList.remove('flex'); }
  modal.addEventListener('click',e=>{ if(e.target===modal) hide(); });
  if(closeBtn) closeBtn.addEventListener('click', hide);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !modal.classList.contains('hidden')) hide(); });
}

/* ===== Панель настроек фоновых изображений + «Прозрачность окон» ===== */
function initSettingsPanel(){
  const open=byId('openSettings'); const panel=byId('settingsPanel');
  if(!open || !panel) return;

  // Если панели нет — вставим типовой контент
  if(panel.children.length<=1){
    panel.innerHTML=`
    <div class="flex items-start justify-between">
      <h3 class="text-lg font-semibold">Настройка (фоны + прозрачность)</h3>
      <button id="closeSettings" class="text-slate-300 hover:text-white">✕</button>
    </div>
    <div class="mt-3 space-y-3 text-sm">
      <label class="text-xs block">Раздел
        <select id="sectionSelect" class="mt-1 w-full rounded bg-slate-900/60 border border-white/10 px-2 py-1">
          <option value="home">Главная</option><option value="method">Метод</option><option value="author">Автор</option>
          <option value="contact">Общение</option><option value="cases">Кейсы</option><option value="booking">Запись</option>
          <option value="songs">Песни</option><option value="faq">FAQ</option>
        </select>
      </label>
      <div>
        <div class="text-xs mb-1">Пресеты (файлы в <code>phon/</code>)</div>
        <div id="presetGrid" class="grid grid-cols-6 gap-2">
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="stars.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/stars.jpg" alt="stars"></button>
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="mist.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/mist.jpg" alt="mist"></button>
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="moon.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/moon.jpg" alt="moon"></button>
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="violet.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/violet.jpg" alt="violet"></button>
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="sea.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/sea.jpg" alt="sea"></button>
          <button class="preset relative pt-[66%] rounded border border-white/15 overflow-hidden" data-file="constellation.jpg"><img class="absolute inset-0 w-full h-full object-cover" src="phon/constellation.jpg" alt="constellation"></button>
        </div>
      </div>
      <label class="text-xs block">Имя файла фона (в <code>phon/</code>)
        <input id="sectionBgUrl" type="text" placeholder="stars.jpg" class="mt-1 w-full rounded bg-slate-900/60 border border-white/10 px-2 py-1" />
      </label>

      <!-- Прозрачность раздела (фоновой картинки) -->
      <div class="flex items-center gap-2">
        <label class="text-xs">Прозрачность фона раздела: <span id="alphaVal" class="tabular-nums">28%</span></label>
        <input id="alphaRange" type="range" min="0" max="100" value="28" class="w-full" />
      </div>

      <!-- НОВОЕ: Прозрачность окон (.glass) -->
      <div class="flex items-center gap-2">
        <label class="text-xs">Прозрачность окон: <span id="glassAlphaVal" class="tabular-nums">6%</span></label>
        <input id="glassAlphaRange" type="range" min="0" max="100" value="6" class="w-full" />
      </div>

      <div class="flex gap-2 pt-2">
        <button id="applySectionBg" class="flex-1 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 px-3 py-2 font-medium">Применить</button>
        <button id="resetSectionBg" class="rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3 py-2">Сброс раздела</button>
      </div>

      <div class="pt-2">
        <button id="resetAllBgs" class="rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3 py-2 w-full">Сбросить все фоны (вернуть встроенные)</button>
      </div>

      <p class="text-xs text-slate-300/80">Настройки сохраняются в браузере (localStorage).</p>
    </div>`;
  }

  const close   = byId('closeSettings');
  const select  = byId('sectionSelect');
  const urlIn   = byId('sectionBgUrl');
  const alpha   = byId('alphaRange');
  const alphaVal= byId('alphaVal');
  const glassAlpha    = byId('glassAlphaRange');
  const glassAlphaVal = byId('glassAlphaVal');
  const apply   = byId('applySectionBg');
  const reset   = byId('resetSectionBg');
  const grid    = byId('presetGrid');
  const resetAll= byId('resetAllBgs');

  /* Синхронизация UI */
  function sync(){
    const id=select.value;
    const stored = localStorage.getItem(bgKey(id)); // NULL, если не задавали
    urlIn.value = stored ? basename(stored) : '';   // показываем имя, если есть
    const a = Number(localStorage.getItem(alphaKey(id)) || '28');
    alpha.value = String(a); alphaVal.textContent = a + '%';

    // Инициализация прозрачности окон (.glass) из localStorage
    const ga = localStorage.getItem('glass-alpha') || '6';
    if(glassAlpha && glassAlphaVal){
      glassAlpha.value = ga;
      glassAlphaVal.textContent = ga + '%';
      updateGlassOpacity(ga);
    }
  }

  open.addEventListener('click',()=>{ panel.classList.toggle('hidden'); sync(); });
  if(close)  close.addEventListener('click',()=>panel.classList.add('hidden'));
  if(select) select.addEventListener('change',sync);
  if(alpha)  alpha.addEventListener('input',function(){ alphaVal.textContent=this.value+'%'; });

  if(apply)  apply.addEventListener('click',()=>{
    const id=select.value;
    const fn=basename(urlIn.value.trim());
    localStorage.setItem(bgKey(id), fn);           // при установке ключ появляется
    localStorage.setItem(alphaKey(id), alpha.value);
    applySection(id);
  });

  if(reset)  reset.addEventListener('click',()=>{
    const id=select.value;
    localStorage.removeItem(bgKey(id));            // ключ исчезает => inline-стиль НЕ трогаем
    localStorage.removeItem(alphaKey(id));
    urlIn.value=''; alpha.value='28'; alphaVal.textContent='28%';
    applySection(id);                              // применит альфу 28% и не тронет backgroundImage
  });

  if(resetAll) resetAll.addEventListener('click',()=>{
    IDS.forEach(id=>{
      localStorage.removeItem(bgKey(id));
      localStorage.removeItem(alphaKey(id));
      applySection(id);
    });
    alert('Все фоновые настройки сброшены — используются встроенные фоны страниц.');
  });

  if(grid){
    grid.addEventListener('click',(e)=>{
      const p=e.target.closest('.preset'); if(!p) return;
      const f=p.getAttribute('data-file')||'';
      if(f) urlIn.value = basename(f);
    });
  }

  /* Обработка ползунка «Прозрачность окон» (.glass) */
  if(glassAlpha && glassAlphaVal){
    // при открытии уже выставили из sync(); продублируем слушатель
    glassAlpha.addEventListener('input', function(){
      glassAlphaVal.textContent = this.value + '%';
      updateGlassOpacity(this.value);
      localStorage.setItem('glass-alpha', this.value);
    });
  }
}

/* НОВОЕ: применение прозрачности для .glass */
function updateGlassOpacity(val){
  const opacity = Math.max(0, Math.min(100, Number(val||0))) / 100;
  document.querySelectorAll('.glass').forEach(function(el){
    // можно менять цвет/blur по вкусу; оставляю белую «дымку», как было
    el.style.background     = 'rgba(255,255,255,'+opacity+')';
    el.style.backdropFilter = 'blur(6px)';
  });
}
function updateGlassFromStorage(){
  const ga = localStorage.getItem('glass-alpha');
  if(ga !== null) updateGlassOpacity(ga);
}

/* ===== Тулбары (фон/картинка/видео) и замена фото автора ===== */
function initToolbars(){
  document.addEventListener('click',(ev)=>{
    const btn = ev.target.closest && ev.target.closest('button[data-action]');
    if(!btn) return;
    const action=btn.getAttribute('data-action');
    const sec=btn.getAttribute('data-sec');
    if(!action) return;

    if(action==='bg-set'){ const file=prompt('Имя файла фоновой картинки (в phon/), напр.: stars.jpg'); if(file!==null){ setBgFor(sec||'', file.trim()); } }
    else if(action==='bg-clear'){ setBgFor(sec||'', ''); }
    else if(action==='insert-img'){ if(sec) insertImg(sec); }
    else if(action==='insert-video'){ if(sec) insertVideo(sec); }
    else if(action==='author-img-1'){ replaceAuthorImage(1); }
    else if(action==='author-img-2'){ replaceAuthorImage(2); }
    else if(action==='author-img-3'){ replaceAuthorImage(3); }
  });
}

function promptImage(){ return prompt('Имя файла изображения (в каталоге Pictures/), напр.: cover.png') || ''; }
function promptVideo(){ return prompt('Имя файла видео (в каталоге video/) или YouTube-ссылка, напр.: clip.mp4 или https://youtu.be/...') || ''; }

function insertImg(secId){
  const ans = promptImage(); if(!ans) return; const name = basename(ans);
  if(!IMG_EXT.test(name)){ alert('Поддерживаемые картинки: .png .jpg .jpeg .webp .gif'); return; }
  const url = resolveImg(name);
  const sec = byId(secId); if(!sec) return;
  const img=document.createElement('img'); img.src=url; img.alt='Изображение';
  img.className='mt-4 rounded-xl border border-white/10 max-w-full';
  sec.appendChild(img);
}

function insertVideo(secId){
  const u = promptVideo(); if(!u) return; const sec=byId(secId); if(!sec) return;
  const yt = ytToEmbed(u);
  if(yt){
    const ifr=document.createElement('iframe');
    ifr.src=yt; ifr.className='mt-4 w-full aspect-video rounded-xl border border-white/10';
    ifr.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    ifr.allowFullscreen=true; sec.appendChild(ifr); return;
  }
  const name = basename(u);
  if(!VID_EXT.test(name)){ alert('Видео: .mp4 .webm .ogg — либо YouTube ссылка'); return; }
  const src = resolveVideo(name);
  const v=document.createElement('video'); v.src=src; v.controls=true;
  v.className='mt-4 w-full rounded-xl border border-white/10';
  sec.appendChild(v);
}

function replaceAuthorImage(index){
  const id = 'author-img-'+index;
  const target = byId(id);
  if(!target){ alert('Элемент '+id+' не найден'); return; }
  const ans = promptImage(); if(!ans) return;
  const name = basename(ans);
  if(!IMG_EXT.test(name)){ alert('Поддерживаемые картинки: .png .jpg .jpeg .webp .gif'); return; }
  target.src = resolveImg(name);
}

/* ===== Видео-модалки (общая связка) ===== */
function bindVideoModal(modalId, videoId, closeId){
  const modal=byId(modalId); const video=byId(videoId); const close=byId(closeId);
  if(!modal || !video) return {open:()=>{}, close:()=>{}};
  function open(src){
    video.src=src; modal.classList.remove('hidden'); modal.classList.add('flex');
    video.currentTime=0; video.play().catch(()=>{});
  }
  function hide(){
    video.pause(); video.removeAttribute('src'); video.load();
    modal.classList.add('hidden'); modal.classList.remove('flex');
  }
  modal.addEventListener('click',e=>{ if(e.target===modal) hide(); });
  if(close) close.addEventListener('click', hide);
  video.addEventListener('ended', hide);
  return {open:open, close:hide};
}

/* Главная: hero (data-hero-src или hero.mp4) */
function initHeroVideo(){
  const title=byId('heroTitle');
  const hero = bindVideoModal('videoModalHero','heroVideo','closeVideoHero');
  if(!title) return;
  title.addEventListener('click', ()=>{
    const explicit = title.getAttribute('data-hero-src'); // напр. data-hero-src="hero.mp4"
    const src = resolveVideo(explicit||'hero.mp4');
    hero.open(src);
  });
}

/* Метод: кнопки с data-play-method="*.mp4" внутри #methodVideoList */
function initMethodVideos(){
  const list = document.getElementById('methodVideoList');
  const modal = bindVideoModal('videoModalMethod','methodVideo','closeVideoMethod');
  if(!list) return;
  list.addEventListener('click',(e)=>{
    const btn = e.target.closest('[data-play-method]'); if(!btn) return;
    const file = btn.getAttribute('data-play-method'); if(!file) return;
    modal.open(resolveVideo(file));
  });
}

/* Песни: кнопки data-play-file="*.mp4" + поддержка ссылок <a data-play-file> */
function initSongs(){
  const modal = bindVideoModal('videoModalSongs','songsVideo','closeVideoSongs');
  document.addEventListener('click',(e)=>{
    const btn = e.target.closest('button[data-play-file], a[data-play-file]');
    if(!btn) return;
    e.preventDefault();
    const file = btn.getAttribute('data-play-file');
    if(file) modal.open(resolveVideo(file));
  });
}

/* ===== Booking: заглушка (ваша логика уже есть на странице) ===== */
function initBooking(){
  // Оставлено пустым, чтобы не мешать вашей кастомной логике бронирования.
}

/* ===== Точка входа ===== */
document.addEventListener('DOMContentLoaded', async ()=>{
  await includeFragments();       // подгружаем contact-modal + три видео-модалки

  // После include элементы модалок уже в DOM — можно инициализировать остальное
  IDS.forEach(applySection);      // применяем фоны с учётом FIX
  updateGlassFromStorage();       // применяем сохранённую прозрачность .glass

  setYear();
  setActiveNav(); initNavHover();
  initSettingsPanel(); initToolbars();
  initContactForm(); initContactModal();
  initHeroVideo();   // index.html
  initMethodVideos();// method.html
  initSongs();       // songs.html
  initBooking();     // booking.html (если нужно)
});
