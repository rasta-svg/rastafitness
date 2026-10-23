/* Rasta Fitness offline support.
 * Offline use requires opening the app online at least once so the shell and auth library can be cached.
 * User-specific data stays in localStorage; authenticated APIs are never cached.
 */
const CACHE_PREFIX='rasta-fitness-';
const CACHE_VERSION='v9';
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const BASE_URL=new URL('./',self.registration.scope);
const CORE_URLS=[
 new URL('./',BASE_URL).href,
 new URL('./index.html',BASE_URL).href,
 new URL('./rasta-core.js',BASE_URL).href,
 new URL('./rasta-search.js',BASE_URL).href,
 new URL('./rasta-science-engine.js',BASE_URL).href,
 new URL('./manifest.json',BASE_URL).href,
 new URL('./version.json',BASE_URL).href,
 new URL('./assets/rasta-icon.png?v=20261023',BASE_URL).href,
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];
async function cacheOne(cache,url){
 try{
  const request=new Request(url,{cache:'reload'});
  const response=await fetch(request);
  if(response.ok||response.type==='opaque')await cache.put(request,response.clone());
 }catch(_){}
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await Promise.all(CORE_URLS.map(url=>cacheOne(cache,url)));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});
async function networkFirst(request){
 const cache=await caches.open(CACHE_NAME);
 try{
  const response=await fetch(request);
  if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
  return response;
 }catch(_){
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  const root=await cache.match(BASE_URL.href,{ignoreSearch:true});
  if(root)return root;
  const index=await cache.match(new URL('./index.html',BASE_URL).href,{ignoreSearch:true});
  if(index)return index;
  return new Response('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>رستا آفلاین</title><body style="font-family:Tahoma,sans-serif;padding:24px;line-height:2"><h2>رستا در حالت آفلاین</h2><p>برای استفاده بدون اینترنت، ابتدا برنامه را یک بار با اینترنت باز کن تا فایل‌های اصلی ذخیره شوند؛ سپس دوباره وارد برنامه شو.</p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
 }
}
async function cacheFirst(request){
 const cache=await caches.open(CACHE_NAME);
 const cached=await cache.match(request);
 if(cached)return cached;
 try{
  const response=await fetch(request);
  if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone()).catch(()=>{});
  return response;
 }catch(_){return new Response('',{status:504,statusText:'Offline resource unavailable'});}
}
async function staleWhileRevalidate(request){
 const cache=await caches.open(CACHE_NAME);
 const cached=await cache.match(request);
 const refresh=fetch(request).then(response=>{
  if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone()).catch(()=>{});
  return response;
 }).catch(()=>null);
 return cached||await refresh||new Response('',{status:504,statusText:'Offline resource unavailable'});
}
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(request.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(networkFirst(request));return;}
 if(url.origin===self.location.origin&&url.pathname.endsWith('/version.json')){event.respondWith(networkFirst(request));return;}
 if(url.origin===self.location.origin){
  // Same-origin app shell/assets can be served offline; API writes and reads are not cached.
  if(url.pathname.includes('/rest/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/functions/v1/'))return;
  event.respondWith(staleWhileRevalidate(request));return;
 }
 if(url.hostname==='cdn.jsdelivr.net'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
  event.respondWith(cacheFirst(request));return;
 }
});
