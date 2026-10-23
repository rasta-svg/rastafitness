/* Rasta Core: small shared coordination layer; feature rules remain in their own modules. */
(function(root){
'use strict';
const VERSION='1.0.0';
const SUPABASE=Object.freeze({url:'https://ptmokqppwjjxhakjpxum.supabase.co',publishableKey:'sb_publishable_3zcZSgGImm9GeK2TmngGcg_hQDYNVjT'});
const modules=new Map(),listeners=new Map(),events=[],MAX_EVENTS=100;
const validStates=new Set(['starting','ready','degraded','unavailable']);
function text(v,n){return String(v==null?'':v).replace(/[\r\n\t]+/g,' ').slice(0,n)}
function snapshot(v){return Object.freeze({id:v.id,kind:v.kind,version:v.version,status:v.status,source:v.source,dependencies:v.dependencies.slice(),registeredAt:v.registeredAt,updatedAt:v.updatedAt})}
function record(level,code,meta){meta=meta||{};const e=Object.freeze({at:new Date().toISOString(),level,code:text(code||'unspecified',80),module:text(meta.module||'',80)||undefined,errorType:text(meta.errorType||'',80)||undefined});events.push(e);if(events.length>MAX_EVENTS)events.splice(0,events.length-MAX_EVENTS);return e}
function registerModule(id,opts){if(!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(String(id||'')))throw new TypeError('RastaCore module id is invalid');opts=opts||{};const now=new Date().toISOString(),old=modules.get(id);const v={id,kind:text(opts.kind||'feature',40),version:text(opts.version||'unspecified',40),status:'ready',source:text(opts.source||'',120)||undefined,dependencies:Array.isArray(opts.dependencies)?opts.dependencies.map(x=>text(x,80)).filter(Boolean):[],registeredAt:old?old.registeredAt:now,updatedAt:now};modules.set(id,v);record('info',old?'module_refreshed':'module_registered',{module:id});return snapshot(v)}
function setModuleStatus(id,status,code){if(!validStates.has(status))throw new TypeError('RastaCore module status is invalid');const v=modules.get(id);if(!v)throw new Error('RastaCore module is not registered');v.status=status;v.updatedAt=new Date().toISOString();record(status==='ready'?'info':'warn',code||'module_status_changed',{module:id});return snapshot(v)}
function listModules(){return Array.from(modules.values(),snapshot).sort((a,b)=>a.id.localeCompare(b.id))}
function health(){const all=listModules();return Object.freeze({status:all.some(x=>x.status==='degraded'||x.status==='unavailable')?'degraded':'ready',version:VERSION,moduleCount:all.length,modules:all,eventCount:events.length})}
function on(name,fn){if(typeof fn!=='function')throw new TypeError('RastaCore listener must be a function');const k=text(name,100);if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);return function(){const g=listeners.get(k);if(!g)return;g.delete(fn);if(!g.size)listeners.delete(k)}}
function emit(name,payload){const g=listeners.get(text(name,100));if(!g)return 0;let n=0;Array.from(g).forEach(fn=>{try{fn(payload);n++}catch(err){record('warn','event_listener_failed',{errorType:err&&err.name||'Error'})}});return n}
function reportError(code,error,moduleId){const type=error&&typeof error==='object'&&error.name?error.name:typeof error;if(moduleId&&modules.has(moduleId)){const m=modules.get(moduleId);m.status='degraded';m.updatedAt=new Date().toISOString()}const e=record('error',code||'runtime_error',{module:moduleId,errorType:type});emit('diagnostic',e);return e}
function recentEvents(){return events.slice()}
const path=root.location&&root.location.pathname?root.location.pathname:'',file=path.split('/').filter(Boolean).pop()||'runtime';
const pageMap={'index.html':'app-shell','nutrition-bank.html':'food-bank','recipe-detail.html':'recipe-detail','admin.html':'admin-console','download.html':'download-page'};
const pageId=pageMap[file]||'page.'+file.replace(/[^a-z0-9._-]/gi,'-');
registerModule(pageId,{kind:'page',version:VERSION,source:file});
root.RastaCore=Object.freeze({version:VERSION,config:Object.freeze({supabase:SUPABASE}),registerModule,setModuleStatus,listModules,health,on,emit,reportError,recentEvents});
if(typeof root.addEventListener==='function'){root.addEventListener('error',e=>reportError('window_error',e&&e.error,pageId));root.addEventListener('unhandledrejection',e=>reportError('unhandled_rejection',e&&e.reason,pageId))}
})(typeof window!=='undefined'?window:globalThis);
