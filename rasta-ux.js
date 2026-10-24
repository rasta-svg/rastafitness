/* Rasta UX refinement: one searchable, accessible menu surface. */
(function () {
 'use strict';
 function init() {
  const root=document.getElementById('rasta-all-menus'),sheet=root&&root.querySelector('.rasta-all-menus-sheet'),grid=root&&root.querySelector('.rasta-all-menus-grid');
  if(!root||!sheet||!grid||root.dataset.uxReady==='yes')return;
  root.dataset.uxReady='yes';
  const style=document.createElement('style');style.id='rasta-ux-refinement';
  style.textContent=\`
   :root{--rasta-ux-ease:cubic-bezier(.2,.75,.25,1)}
   .sidebar .nav-label{margin-top:9px;padding-top:13px;border-top:1px solid #ffffff16}
   .sidebar .nav button,.sidebar .nav>a{transition:background .18s ease,transform .18s ease}
   .sidebar .nav button:hover,.sidebar .nav>a:hover{transform:translateX(-2px)}
   .rasta-all-menus{z-index:1200}
   .rasta-all-menus .rasta-all-menus-backdrop{opacity:0;transition:opacity .24s ease}
   .rasta-all-menus.open .rasta-all-menus-backdrop{opacity:1}
   .rasta-all-menus .rasta-all-menus-sheet{direction:rtl;text-align:right;overscroll-behavior:contain;box-shadow:-18px 0 60px #10261926}
   .rasta-all-menus .rasta-all-menus-heading{position:sticky;top:0;z-index:2;padding:8px 0 13px;background:inherit;border-bottom:1px solid var(--line);margin-bottom:12px}
   .rasta-all-menus .rasta-all-menus-heading b{font-size:19px;letter-spacing:-.2px}
   .rasta-all-menus .rasta-all-menus-heading p{margin:4px 0 0;line-height:1.8}
   .rasta-menu-search-wrap{position:sticky;top:72px;z-index:2;padding:8px 0 12px;background:var(--paper,#fffefa)}
   .rasta-menu-search{display:block;width:100%;border:1px solid #dce5d9;border-radius:13px;padding:12px 42px 12px 12px;color:var(--ink,#242c24);background:#f7f8f2;outline:none}
   .rasta-menu-search:focus{border-color:#6c9166;box-shadow:0 0 0 3px #dce9d580}
   .rasta-menu-search-wrap:before{content:'⌕';position:absolute;right:14px;top:12px;font-size:25px;color:#587451;pointer-events:none}
   .rasta-all-menus .rasta-menu-group{margin:14px 0 7px;padding:8px 10px;border-right:3px solid #88a879;border-radius:0 8px 8px 0;background:#f0f4eb;color:#385b3d;font-weight:900}
   .rasta-all-menus .rasta-all-menus-grid>button,.rasta-all-menus .rasta-all-menus-grid>a{min-height:54px;border-radius:13px;transition:transform .16s ease,border-color .16s ease,background .16s ease}
   .rasta-all-menus .rasta-all-menus-grid>button:hover,.rasta-all-menus .rasta-all-menus-grid>a:hover{transform:translateY(-1px);border-color:#b8cdb0;background:#f4f7ef}
   .rasta-all-menus .rasta-all-menus-grid>button:focus-visible,.rasta-all-menus .rasta-all-menus-grid>a:focus-visible,.rasta-all-menus-close:focus-visible{outline:3px solid #9ab98a;outline-offset:2px}
   .rasta-menu-no-results{padding:20px 12px;text-align:center;border:1px dashed #cbd8c5;border-radius:13px;color:#657363;line-height:2}
   @media(max-width:700px){.rasta-all-menus .rasta-all-menus-sheet{inset-inline-start:0!important;inset-inline-end:auto!important;width:min(92vw,430px)!important;max-width:430px;height:100dvh;max-height:100dvh;border-radius:0 22px 22px 0!important;padding:max(18px,env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));transform:translateX(105%);transition:transform .28s var(--rasta-ux-ease)}.rasta-all-menus.open .rasta-all-menus-sheet{transform:translateX(0)}.rasta-menu-search-wrap{top:66px}.mobilebar{gap:3px;padding-left:7px;padding-right:7px}.mobilebar button{border-radius:10px;min-height:48px}.mobilebar button.active{background:#eaf1e4}}
   @media(prefers-reduced-motion:reduce){.rasta-all-menus *,.sidebar .nav button{transition:none!important;scroll-behavior:auto!important}}
  \`;
  document.head.appendChild(style);
  const wrap=document.createElement('div');wrap.className='rasta-menu-search-wrap';
  const search=document.createElement('input');search.className='rasta-menu-search';search.type='search';search.placeholder='جست‌وجو در همه بخش‌ها…';search.setAttribute('aria-label','جست‌وجو در منوهای رستا');search.autocomplete='off';wrap.appendChild(search);grid.parentNode.insertBefore(wrap,grid);
  const empty=document.createElement('div');empty.className='rasta-menu-no-results';empty.textContent='بخشی با این عبارت پیدا نشد. نام دیگری را امتحان کن.';empty.hidden=true;grid.appendChild(empty);
  function closeMenu(){root.classList.remove('open');root.setAttribute('aria-hidden','true');document.querySelectorAll('[data-open-all-menus]').forEach(b=>b.setAttribute('aria-expanded','false'));document.body.classList.remove('rasta-menu-open')}
  function openMenu(){root.classList.add('open');root.setAttribute('aria-hidden','false');document.querySelectorAll('[data-open-all-menus]').forEach(b=>b.setAttribute('aria-expanded','true'));document.body.classList.add('rasta-menu-open');setTimeout(()=>search.focus({preventScroll:true}),80)}
  function filterMenu(){const q=search.value.trim().toLocaleLowerCase('fa');let count=0;const els=[...grid.children];els.forEach(el=>{if(el===empty)return;if(el.classList.contains('rasta-menu-group')){el.hidden=false;return}const ok=!q||(el.textContent||'').toLocaleLowerCase('fa').includes(q);el.hidden=!ok;if(ok)count++});els.forEach((el,i)=>{if(!el.classList.contains('rasta-menu-group'))return;let has=false;for(let j=i+1;j<els.length&&!els[j].classList.contains('rasta-menu-group');j++){if(els[j]!==empty&&!els[j].hidden)has=true}el.hidden=!has});empty.hidden=count>0}
  search.addEventListener('input',filterMenu);
  root.addEventListener('click',e=>{if(e.target.closest('[data-close-all-menus]')){e.preventDefault();closeMenu();return}if(e.target.closest('[data-view]'))closeMenu()});
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open-all-menus]');if(!trigger)return;e.preventDefault();if(root.classList.contains('open'))closeMenu();else openMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open')){closeMenu();const t=document.querySelector('[data-open-all-menus]');if(t)t.focus({preventScroll:true})}});
  window.addEventListener('popstate',closeMenu);
  document.addEventListener('click',e=>{if(!e.target.closest('[data-view]'))return;setTimeout(()=>{const active=document.querySelector('.view.active');if(active)document.querySelectorAll('.mobilebar [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===active.id.replace('view-','')))},0)});
  filterMenu();window.RastaMenuUX={open:openMenu,close:closeMenu,filter:filterMenu};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();