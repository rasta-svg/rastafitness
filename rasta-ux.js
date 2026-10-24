/* Rasta UX hotfix: valid syntax, reliable menu controls, clearer guide status and visible visual refinement. */
(function () {
 'use strict';
 function init() {
  var root=document.getElementById('rasta-all-menus');
  var sheet=root&&root.querySelector('.rasta-all-menus-sheet');
  var grid=root&&root.querySelector('.rasta-all-menus-grid');
  if(!root||!sheet||!grid||root.dataset.uxReady==='yes')return;
  root.dataset.uxReady='yes';
  var css=[
   ':root{--rasta-ux-ease:cubic-bezier(.2,.75,.25,1);--rasta-ux-green:#174d38;--rasta-ux-gold:#d5b66b}',
   'body{background-image:radial-gradient(ellipse at 95% 0%,rgba(213,182,107,.10),transparent 35%),radial-gradient(ellipse at 0% 20%,rgba(37,105,73,.07),transparent 32%)}',
   '.view.active{animation:rastaViewIn .22s ease both}',
   '@keyframes rastaViewIn{from{opacity:.72;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}',
   '.panel,.card,.workoutcard,.foodcard{transition:box-shadow .18s ease,border-color .18s ease,transform .18s ease}',
   '.panel,.workoutcard{border-radius:18px}',
   '.panel:hover,.workoutcard:hover{box-shadow:0 12px 28px rgba(22,55,35,.08)}',
   '.btn,.mobilebar button,.sidebar .nav button,.sidebar .nav>a{transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}',
   '.btn:active,.mobilebar button:active,.sidebar .nav button:active{transform:scale(.98)}',
   '.btn:focus-visible,button:focus-visible,[role=button]:focus-visible{outline:3px solid rgba(213,182,107,.85);outline-offset:2px}',
   '.sidebar .nav-label{margin-top:9px;padding-top:13px;border-top:1px solid #ffffff20}',
   '.sidebar .nav button:hover,.sidebar .nav>a:hover{transform:translateX(-2px)}',
   '.rasta-all-menus{z-index:1200}',
   '.rasta-all-menus .rasta-all-menus-backdrop{opacity:0;transition:opacity .24s ease}',
   '.rasta-all-menus.open .rasta-all-menus-backdrop{opacity:1}',
   '.rasta-all-menus .rasta-all-menus-sheet{direction:rtl;text-align:right;overscroll-behavior:contain;box-shadow:-18px 0 60px #10261926}',
   '.rasta-all-menus .rasta-all-menus-heading{position:sticky;top:0;z-index:3;padding:8px 0 13px;background:var(--paper,#fffefa);border-bottom:1px solid var(--line);margin-bottom:12px}',
   '.rasta-all-menus .rasta-all-menus-heading b{font-size:19px;letter-spacing:-.2px}',
   '.rasta-all-menus .rasta-all-menus-heading p{margin:4px 0 0;line-height:1.8}',
   '.rasta-menu-search-wrap{position:sticky;top:70px;z-index:2;padding:8px 0 12px;background:var(--paper,#fffefa)}',
   '.rasta-menu-search{display:block;width:100%;border:1px solid #dce5d9;border-radius:13px;padding:12px 42px 12px 12px;color:var(--ink,#242c24);background:#f7f8f2;outline:none;font:inherit}',
   '.rasta-menu-search:focus{border-color:#6c9166;box-shadow:0 0 0 3px #dce9d580}',
   '.rasta-menu-search-wrap:before{content:"⌕";position:absolute;right:14px;top:12px;font-size:25px;color:#587451;pointer-events:none}',
   '.rasta-all-menus .rasta-menu-group{margin:14px 0 7px;padding:9px 10px;border-right:3px solid var(--rasta-ux-gold);border-radius:0 8px 8px 0;background:#f0f4eb;color:#385b3d;font-weight:900}',
   '.rasta-all-menus .rasta-all-menus-grid>button,.rasta-all-menus .rasta-all-menus-grid>a{min-height:56px;border-radius:14px;box-shadow:0 3px 10px rgba(25,58,37,.035);transition:transform .16s ease,border-color .16s ease,background .16s ease}',
   '.rasta-all-menus .rasta-all-menus-grid>button:hover,.rasta-all-menus .rasta-all-menus-grid>a:hover{transform:translateY(-2px);border-color:#b8cdb0;background:#f4f7ef}',
   '.rasta-all-menus .rasta-all-menus-grid>button:focus-visible,.rasta-all-menus .rasta-all-menus-grid>a:focus-visible,.rasta-all-menus-close:focus-visible{outline:3px solid #9ab98a;outline-offset:2px}',
   '.rasta-menu-no-results{padding:20px 12px;text-align:center;border:1px dashed #cbd8c5;border-radius:13px;color:#657363;line-height:2}',
   '#rasta-guide-quickstart{margin:0 0 14px;padding:16px;border:1px solid #d8e2cc;border-radius:18px;background:linear-gradient(135deg,#f7f8ef,#fffdf7);box-shadow:0 8px 24px rgba(23,77,56,.07)}',
   '#rasta-guide-quickstart h3{margin:0 0 5px;color:#174d38;font-size:17px}',
   '#rasta-guide-quickstart p{margin:0;line-height:1.9;color:#586557}',
   '.rasta-guide-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}',
   '.rasta-guide-step{padding:10px;border:1px solid #e1e7d9;border-radius:12px;background:#fff;font-size:12px;line-height:1.8}',
   '.rasta-guide-step b{display:block;color:#174d38;margin-bottom:3px}',
   '.rasta-guide-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;background:#edf3e7;color:#315b3a;font-size:12px;font-weight:800;margin-top:9px}',
   '.rasta-guide-status:before{content:"";width:7px;height:7px;border-radius:50%;background:#6b9b57}',
   '#rasta-guide-live-status{padding:10px 12px;border-radius:12px;background:#f4f5ed;line-height:1.9}',
   '@media(max-width:700px){.rasta-all-menus .rasta-all-menus-sheet{inset-inline-start:0!important;inset-inline-end:auto!important;width:min(92vw,430px)!important;max-width:430px;height:100dvh;max-height:100dvh;border-radius:0 22px 22px 0!important;padding:max(18px,env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));transform:translateX(105%);transition:transform .28s var(--rasta-ux-ease)}.rasta-all-menus.open .rasta-all-menus-sheet{transform:translateX(0)}.rasta-menu-search-wrap{top:66px}.mobilebar{gap:3px;padding-left:7px;padding-right:7px}.mobilebar button{border-radius:10px;min-height:48px}.mobilebar button.active{background:#eaf1e4}.rasta-guide-steps{grid-template-columns:1fr}.view.active{animation:none}}',
   '@media(prefers-reduced-motion:reduce){.rasta-all-menus *,.view.active,.btn,.mobilebar button{transition:none!important;animation:none!important;scroll-behavior:auto!important}}'
  ].join('');
  var style=document.getElementById('rasta-ux-refinement');
  if(!style){style=document.createElement('style');style.id='rasta-ux-refinement';document.head.appendChild(style)}
  style.textContent=css;
  var wrap=document.createElement('div');wrap.className='rasta-menu-search-wrap';
  var search=document.createElement('input');search.className='rasta-menu-search';search.type='search';search.placeholder='جست‌وجو در همه بخش‌ها…';search.setAttribute('aria-label','جست‌وجو در منوهای رستا');search.autocomplete='off';wrap.appendChild(search);grid.parentNode.insertBefore(wrap,grid);
  var empty=document.createElement('div');empty.className='rasta-menu-no-results';empty.textContent='بخشی با این عبارت پیدا نشد. نام دیگری را امتحان کن.';empty.hidden=true;grid.appendChild(empty);
  function closeMenu(){root.classList.remove('open');root.setAttribute('aria-hidden','true');document.querySelectorAll('[data-open-all-menus]').forEach(function(b){b.setAttribute('aria-expanded','false')});document.body.classList.remove('rasta-menu-open')}
  function openMenu(){root.classList.add('open');root.setAttribute('aria-hidden','false');document.querySelectorAll('[data-open-all-menus]').forEach(function(b){b.setAttribute('aria-expanded','true')});document.body.classList.add('rasta-menu-open');window.setTimeout(function(){try{search.focus({preventScroll:true})}catch(e){search.focus()}},80)}
  function filterMenu(){var q=search.value.trim().toLocaleLowerCase('fa');var count=0;var els=Array.prototype.slice.call(grid.children);els.forEach(function(el){if(el===empty)return;if(el.classList.contains('rasta-menu-group')){el.hidden=false;return}var ok=!q||(el.textContent||'').toLocaleLowerCase('fa').indexOf(q)!==-1;el.hidden=!ok;if(ok)count++});els.forEach(function(el,i){if(!el.classList.contains('rasta-menu-group'))return;var has=false;for(var j=i+1;j<els.length&&!els[j].classList.contains('rasta-menu-group');j++){if(els[j]!==empty&&!els[j].hidden)has=true}el.hidden=!has});empty.hidden=count>0}
  search.addEventListener('input',filterMenu);
  root.addEventListener('click',function(e){if(e.target.closest('[data-close-all-menus]')){e.preventDefault();closeMenu();return}if(e.target.closest('[data-view]'))closeMenu()});
  var menuObserver=new MutationObserver(function(){var isOpen=root.classList.contains('open');root.setAttribute('aria-hidden',String(!isOpen));document.querySelectorAll('[data-open-all-menus]').forEach(function(b){b.setAttribute('aria-expanded',String(isOpen))});document.body.classList.toggle('rasta-menu-open',isOpen);if(isOpen)window.setTimeout(function(){try{search.focus({preventScroll:true})}catch(e){search.focus()}},80)});menuObserver.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('open')){closeMenu();var t=document.querySelector('[data-open-all-menus]');if(t)t.focus()}});
  window.addEventListener('popstate',closeMenu);
  document.addEventListener('click',function(e){if(!e.target.closest('[data-view]'))return;window.setTimeout(function(){var active=document.querySelector('.view.active');if(active)document.querySelectorAll('.mobilebar [data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view===active.id.replace('view-',''))})},0)});
  var guide=document.getElementById('view-guide');
  if(guide&&!document.getElementById('rasta-guide-quickstart')){
   var quick=document.createElement('section');quick.id='rasta-guide-quickstart';quick.innerHTML='<h3>راهنمای سریع رَستا</h3><p>وضعیت: آموزش‌های پایه همین‌جا در دسترس‌اند. برای شروع، یکی از سه گام زیر را انجام بده.</p><div class="rasta-guide-steps"><div class="rasta-guide-step"><b>۱. انتخاب بخش</b>از «همه منوها» تمرین، تغذیه یا سابقه را باز کن.</div><div class="rasta-guide-step"><b>۲. تکمیل اطلاعات</b>فیلدهای لازم را پر کن؛ موارد اختیاری را می‌توانی رد کنی.</div><div class="rasta-guide-step"><b>۳. ثبت نتیجه</b>پس از بررسی، دکمه ذخیره یا ثبت همان صفحه را بزن.</div></div><span class="rasta-guide-status" id="rasta-guide-status-badge">آموزش پایه در دسترس</span>';guide.insertBefore(quick,guide.firstChild);
   var live=document.getElementById('rasta-guide-live-status');var badge=document.getElementById('rasta-guide-status-badge');
   if(live&&badge){var updateGuideStatus=function(){var t=(live.textContent||'').toLowerCase();if(t.indexOf('به‌روز شد')!==-1||t.indexOf('بررسی و به‌روز')!==-1){badge.textContent='راهنمای نسخه تازه شد';badge.style.background='#e7f4e7';badge.style.color='#245b36'}else if(t.indexOf('ممکن نشد')!==-1||t.indexOf('اینترنت در دسترس نیست')!==-1){badge.textContent='آموزش پایه فعال است؛ راهنمای آنلاین در دسترس نیست';badge.style.background='#fff2db';badge.style.color='#80551c'}else if(t.indexOf('دریافت')!==-1||t.indexOf('بررسی')!==-1){badge.textContent='در حال بررسی راهنمای آنلاین…'}else{badge.textContent='آموزش پایه در دسترس'}};new MutationObserver(updateGuideStatus).observe(live,{childList:true,subtree:true,characterData:true});updateGuideStatus()}
  }
  filterMenu();window.RastaMenuUX={open:openMenu,close:closeMenu,filter:filterMenu};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
