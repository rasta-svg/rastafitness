'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptTag = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
let match;
let inlineCount = 0;
while ((match = scriptTag.exec(html)) !== null) {
  const attrs = match[1] || '';
  const source = match[2] || '';
  if (/\bsrc\s*=/.test(attrs) || !source.trim()) continue;
  inlineCount++;
  try {
    // Compile only: validate syntax without running browser code or touching user data.
    new vm.Script(source);
  } catch (error) {
    const line = html.slice(0, match.index).split('\n').length;
    throw new Error('Inline script syntax error near index.html line ' + line + ': ' + error.message);
  }
}
if (inlineCount === 0) throw new Error('No inline JavaScript blocks were validated.');
const engine = fs.readFileSync(path.join(root, 'rasta-science-engine.js'), 'utf8');
new vm.Script(engine);
const core = fs.readFileSync(path.join(root, 'rasta-core.js'), 'utf8');
new vm.Script(core);
const ux = fs.readFileSync(path.join(root, 'rasta-ux.js'), 'utf8');
new vm.Script(ux);
if (!/rasta-ux\.js\?v=20261024-fix\d+/.test(html)) throw new Error('UX hotfix must bust stale browser/service-worker cache entries.');
if (!ux.includes('rasta-guide-quickstart') || !ux.includes('rasta-menu-no-results')) throw new Error('UX layer must provide a clear guide and searchable menu feedback.');
const searchSource = fs.readFileSync(path.join(root, 'rasta-search.js'), 'utf8');
new vm.Script(searchSource);
const searchContext = { RastaCore: { registerModule(id, options) { this.lastRegistration = { id, options }; } } };
vm.createContext(searchContext);
new vm.Script(searchSource).runInContext(searchContext);
const search = searchContext.RastaSearch;
if (!search || search.normalize('ي ك ۱۲٣') !== 'ی ک 123') throw new Error('Shared search must normalize Arabic/Persian letters and digits.');
if (!search.matches('کورمه سبزی', 'قورمه‌سبزی خانگی')) throw new Error('Shared search must tolerate common Persian typing variants.');
const ranked = search.rank([{name:'عدسی'}, {name:'قورمه سبزی'}], 'قورمه سبزی', item => item.name);
if (ranked[0].name !== 'قورمه سبزی') throw new Error('Shared search must rank stronger matches first.');
if (searchContext.RastaCore.lastRegistration.id !== 'search-engine') throw new Error('Shared search engine must register with Rasta Core.');
if (!html.includes('rasta-search.js')) throw new Error('Main app must load the shared search engine.');
if (!html.includes("id=\"rasta-engine-health-panel\"") || !html.includes("RastaCore.health()")) throw new Error('Settings must expose central engine dependency health.');
for (const [file, marker] of [['admin.html', "url('./assets/rasta-icon.png?v=20261024')"], ['download.html', "url('./assets/rasta-icon.png?v=20261024')"]]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(marker) || !source.includes('assets/rasta-icon.png?v=20261024')) throw new Error('Requested Rasta logo is not wired into ' + file);
}
if (!html.includes('rasta-icon.png?v=20261024') || !fs.readFileSync(path.join(root, 'manifest.json'), 'utf8').includes('rasta-icon.png?v=20261024')) throw new Error('Main app/PWA icon cache keys are not aligned.');
if (!foodBankHasSharedSearch()) throw new Error('Food bank must load the shared search engine.');
function foodBankHasSharedSearch() {
  return fs.readFileSync(path.join(root, 'nutrition-bank.html'), 'utf8').includes('rasta-search.js');
}
if (!html.includes('window.RastaSearch.matches(exploreQuery') || !html.includes('window.RastaSearch.matches(exquery') || !html.includes('window.RastaSearch.matches(foodquery') || !html.includes('window.RastaSearch.matches(rastaPremiumQuery')) {
  throw new Error('Workout, exercise library, and food catalog must use shared search rules.');
}
if (!html.includes('window.RastaSearch.searchFoodReference(query,c)')) throw new Error('External USDA food search must use the shared search adapter.');
for (const moduleId of ['exercise-library-search','workout-discovery-search','food-catalog-search','premium-catalog-search']) {
  if (!html.includes("registerModule('" + moduleId + "'")) throw new Error('Search consumer is missing from central module health: ' + moduleId);
}
if (!html.includes('window.RastaSearch.rank(arr,exquery') || !html.includes('window.RastaSearch.rank(arr,foodquery') || !html.includes('window.RastaSearch.rank(arr,exploreQuery') || !html.includes('window.RastaSearch.rank(arr,rastaPremiumQuery') || !html.includes('window.RastaSearch.rank(found,$('+'\'modalfoodsearch\''+').value')) throw new Error('Every local search area must use the shared relevance ranking.');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/build-android-apk.yml'), 'utf8');
if (!workflow.includes('cp rasta-search.js www/rasta-search.js') || !workflow.includes('"rasta-search.js"')) throw new Error('Android APK must package the shared search engine and rebuild when it changes.');
const adminPage = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
if (!adminPage.includes('src="./rasta-search.js"') || !adminPage.includes('window.RastaSearch.rank(users,q')) throw new Error('Admin user search must use the shared ranked search engine.');
if (!html.includes("registerModule('meal-food-search'") || !html.includes("registerModule('nutrition-reference-search'") || !adminPage.includes("registerModule('admin-user-search'")) throw new Error('Search consumers across meal selection, reference food lookup and admin must register with central health.');
if (!fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("new URL('./rasta-search.js',BASE_URL).href")) throw new Error('Shared search engine must be cached for offline app shell.');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
new vm.Script(serviceWorker);
for (const required of ['rasta-science-engine.js', 'version.json']) {
  if (!html.includes(required) && required !== 'version.json') {
    throw new Error('Application is missing expected asset reference: ' + required);
  }
}
for (const page of ['index.html', 'nutrition-bank.html', 'recipe-detail.html', 'admin.html']) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');
  if (!source.includes('rasta-core.js')) throw new Error('Shared core is not referenced by ' + page);
  if (!source.includes('RastaCore.config.supabase')) throw new Error('Page does not use the central Supabase configuration: ' + page);
  if (/const (?:API|SUPABASE_URL)='https:\/\/ptmokqppwjjxhakjpxum\.supabase\.co'/.test(source)) {
    throw new Error('Supabase URL is still duplicated in ' + page);
  }
}
if (!html.includes("registerModule('nutrition-engine'") || !html.includes("dependencies:['supabase-client','science-engine','search-engine']")) {
  throw new Error('Nutrition engine must declare its central module dependencies.');
}
const foodBank = fs.readFileSync(path.join(root, 'nutrition-bank.html'), 'utf8');
if (!foodBank.includes("{id:'eggs',label:'تخم‌مرغ و غذاهای تخم‌مرغی'}") || !foodBank.includes("{id:'offal',label:'دل، جگر و احشاء'}")) throw new Error('Food bank must provide distinct egg and offal categories.');
if (!foodBank.includes("if(id==='eggs')return eggFood") || !foodBank.includes("if(id==='offal')return offalFood") || !foodBank.includes('&&!eggFood&&!offalFood')) throw new Error('Egg foods and offal must not be classified as meat.');
if (!foodBank.includes("registerModule('food-bank-data'") || !foodBank.includes("setModuleStatus('food-bank-data','ready'") || !foodBank.includes("setModuleStatus('food-bank-data','degraded'")) {
  throw new Error('Food bank must register with central health and report success/failure.');
}
const recipeDetail = fs.readFileSync(path.join(root, 'recipe-detail.html'), 'utf8');
if (!recipeDetail.includes("registerModule('recipe-detail-data'") || !recipeDetail.includes("reportError('recipe_detail_load_failed'")) {
  throw new Error('Recipe detail must register with central health and report runtime failures.');
}

for (const page of ['nutrition-bank.html', 'recipe-detail.html', 'admin.html']) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');
  const tags = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let script;
  let checked = 0;
  while ((script = tags.exec(source)) !== null) {
    if (/\bsrc\s*=/.test(script[1] || '') || !(script[2] || '').trim()) continue;
    try {
      new vm.Script(script[2]);
      checked++;
    } catch (error) {
      const line = source.slice(0, script.index).split('\n').length;
      throw new Error('Inline script syntax error near ' + page + ' line ' + line + ': ' + error.message);
    }
  }
  if (!checked) throw new Error('No inline scripts were validated in ' + page);
}
const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
if (!admin.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"') || !admin.includes('<script src="./rasta-core.js">') || !admin.includes('<script src="./rasta-search.js">') || !/<script>[^]*?__rastaAdminRefreshTimer\s*=\s*setInterval/.test(admin)) {
  throw new Error('Admin refresh timer must run in an inline script after the shared core and search engine are loaded.');
}
if (!foodBank.includes("dependencies:['food-bank']")) {
  throw new Error('Food bank data service must depend on the page module id registered by Rasta Core.');
}
if (!foodBank.includes("registerModule('food-bank-search'") || !foodBank.includes("dependencies:['search-engine']")) throw new Error('Food bank search must be registered as a central search consumer.');

// Runtime integration smoke tests: execute the real shared engines together in an isolated VM.
// No network, DOM, localStorage, or user data is available to this context.
const runtime = {
  location: { pathname: '/index.html' },
  addEventListener() {}
};
runtime.window = runtime;
vm.createContext(runtime);
new vm.Script(core, { filename: 'rasta-core.js' }).runInContext(runtime);
new vm.Script(searchSource, { filename: 'rasta-search.js' }).runInContext(runtime);
new vm.Script(engine, { filename: 'rasta-science-engine.js' }).runInContext(runtime);
if (!runtime.RastaCore || !runtime.RastaSearch || !runtime.RastaScienceEngine) {
  throw new Error('Shared core, search, and science engines must initialize together at runtime.');
}
const initialHealth = runtime.RastaCore.health();
for (const requiredModule of ['app-shell', 'search-engine', 'science-engine']) {
  if (!initialHealth.modules.some(module => module.id === requiredModule && module.status === 'ready')) {
    throw new Error('Runtime engine health is missing a ready module: ' + requiredModule);
  }
}
runtime.RastaCore.registerModule('integration-smoke-consumer', {
  kind: 'test', version: '1', dependencies: ['search-engine', 'science-engine']
});
if (runtime.RastaCore.health().status !== 'ready') {
  throw new Error('Healthy search/science dependencies should produce a ready central health state.');
}
const runtimeSearch = runtime.RastaSearch.rank([{ name: 'عدسی' }, { name: 'قورمه سبزی' }], 'قورمه سبزی', item => item.name);
if (runtimeSearch[0]?.name !== 'قورمه سبزی') throw new Error('Runtime shared search ranking failed.');
const stopOnPain = runtime.RastaScienceEngine.nextLoad({ weight: 20, repsCompleted: 12, repsTarget: 12, setsCompleted: 3, setsTarget: 3, pain: true });
if (stopOnPain.action !== 'stop') throw new Error('Science engine must stop load progression when pain is reported.');
const poorSleep = runtime.RastaScienceEngine.recoveryAdvice({ sleepHours: 4, soreness: 'low', energy: 'normal' });
if (poorSleep.status !== 'reduce') throw new Error('Science engine recovery guidance must reduce intensity after very short sleep.');
const prescription = runtime.RastaScienceEngine.prescription(
  { name: 'اسکوات وزن بدن', muscle: 'پا', type: 'قدرتی', level: 'مبتدی', equipment: 'بدون وسیله', sets: 3, reps: '10–12' },
  { level: 'مبتدی', goal: 'سلامت عمومی', intensity: 'متوسط', restTime: '60–90', warmup: 8, cooldown: 5 }
);
if (!Number.isFinite(prescription.sets) || !prescription.reps || !Number.isFinite(prescription.restSeconds)) {
  throw new Error('Science engine must return a usable training prescription.');
}
// Every shipped HTML surface must point to the one canonical logo asset; reject stale cache keys.
for (const file of ['index.html', 'admin.html', 'download.html', 'nutrition-bank.html', 'recipe-detail.html']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/rasta-icon\.png\?v=65fa264/.test(source)) throw new Error('Stale logo cache key remains in ' + file);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
if (!Array.isArray(manifest.icons) || !manifest.icons.some(icon => String(icon.src).includes('rasta-icon.png'))) {
  throw new Error('PWA manifest must point to the canonical Rasta icon asset.');
}

if (!html.includes('ورزش و تغذیه‌ی حرفه‌ای‌ها') || html.includes('ورزش و رژیم پریمیوم')) {
  throw new Error('All-menus navigation and page title must use the approved professional-fitness label consistently.');
}
if (!html.includes("const RASTA_APP_VERSION='2.0.6';")) throw new Error('App version constant must match the current release.');
console.log('Application validation passed: ' + inlineCount + ' inline scripts, shared core, science engine, and service worker syntax checked.');

const adminPageForPricing = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
if (!html.includes('data-plan-request="custom_nutrition"') || !html.includes('consume_custom_nutrition_purchase')) {
  throw new Error('Custom nutrition generation must require a separate paid purchase and consume one paid use.');
}
if (!adminPageForPricing.includes('custom-nutrition-price-form') || !adminPageForPricing.includes('set_custom_nutrition_price')) {
  throw new Error('Admin must expose a separate editable price for custom nutrition plans.');
}
const manualPaymentsFunction = fs.readFileSync(path.join(root, 'supabase/functions/rasta-manual-payments/index.ts'), 'utf8');
if (!manualPaymentsFunction.includes('custom_nutrition_price_toman') || !manualPaymentsFunction.includes('set_custom_nutrition_price')) {
  throw new Error('Manual payment service must support the independent custom nutrition price.');
}

/* Regression checks for the central navigation router and all-menus dispatch. */
if (!html.includes('id="view-training"') || !html.includes('id="view-nutrition"')) {
  throw new Error('Training and nutrition must remain separate app views.');
}
if (!html.includes("if(v==='programs')v='training'") || !html.includes("training:'تمرین و برنامه‌های من'") || !html.includes("nutrition:'برنامه غذایی ایرانی'")) {
  throw new Error('Training/program aliases and nutrition route labels must resolve to their own views.');
}
if (html.includes("if(typeof window.goto==='function')window.goto(view)") || html.includes("new CustomEvent('rasta:navigate'")) {
  throw new Error('All-menus must not intercept navigation through window.goto or an unhandled custom event.');
}
if (!html.includes("const item=e.target.closest('button[data-view],button[data-goto],a[data-view],a[data-goto]')") || !html.includes("try{goto(view)}catch(err)")) {
  throw new Error('All menu links and buttons must use the central lexical goto router.');
}

/* Menu-to-view mapping: each label must target the section it describes. */
for (const route of ['today','training','explore','nutrition','history','profile','plans','premium-fitness','guide','contact','download','changelog']) {
  if (!html.includes('id="view-' + route + '"')) throw new Error('Menu route has no matching view: ' + route);
}
if (!html.includes('data-view="training"><span>🏋️</span>برنامه تمرینی من</button>')) {
  throw new Error('Training menu must point to the training planner, not the movement discovery view.');
}
if (!html.includes('data-view="explore"><span>🔎</span>کشف حرکات و کتابخانه تمرین</button>')) {
  throw new Error('Movement discovery needs its own menu entry pointing to view-explore.');
}
if (!html.includes('data-view="nutrition"><span>🥗</span>برنامه غذایی و رژیم‌ساز هوشمند</button>')) {
  throw new Error('Nutrition menu must point to view-nutrition.');
}

/* Back/forward must restore the requested route instead of forcing the home view. */
if (!html.includes("const route=event.state&&typeof event.state.rastaView==='string'?event.state.rastaView:'today'") || !html.includes("if(route!==current)goto(route,true)")) {
  throw new Error('Browser back/forward must restore the route recorded in history.');
}
if (html.includes("if(current!=='today'){goto('today',true);window.history.pushState({rastaView:'today'}")) {
  throw new Error('Popstate must not force every route back to Today.');
}


const coachFunction = fs.readFileSync(path.join(root, 'supabase/functions/rasta-nutrition-coach/index.ts'), 'utf8');
const consultationMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261025150000_nutrition_consultation_paid_plan.sql'), 'utf8');
if (!html.includes('id="rasta-ai-coach-form"') || !html.includes("functions.invoke('rasta-nutrition-coach'")) {
  throw new Error('Advanced nutrition consultation UI must call the real nutrition coach Edge Function.');
}
if (!coachFunction.includes('nutrition_consultation_purchase_required') || !coachFunction.includes('.eq("plan_id", "nutrition_consultation")') || !coachFunction.includes('OPENAI_API_KEY')) {
  throw new Error('Nutrition coach must enforce paid access server-side and keep the AI key in server secrets.');
}
if (!manualPaymentsFunction.includes('set_nutrition_consultation_price') || !manualPaymentsFunction.includes('nutrition_consultation_price_toman') || !manualPaymentsFunction.includes('"nutrition_consultation"')) {
  throw new Error('Manual payment service must support consultation purchase and independent admin pricing.');
}
if (!consultationMigration.includes("'nutrition_consultation'") || !consultationMigration.includes("'none'")) {
  throw new Error('Advanced consultation must have a separate one-time plan in the additive migration.');
}


const announcementFunction = fs.readFileSync(path.join(root, 'supabase/functions/rasta-admin-users/index.ts'), 'utf8');
const announcementMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261025170000_admin_home_announcement.sql'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
if (!html.includes('id="rasta-admin-announcement"') || !html.includes("from('app_announcements')")) {
  throw new Error('Home page must render the current admin announcement from the database.');
}
if (!adminHtml.includes('id="announcement-form"') || !announcementFunction.includes('requestBody.action === "save_announcement"') || !announcementFunction.includes('requestBody.action === "get_announcement"')) {
  throw new Error('Admin panel must be able to manage the global home announcement.');
}
if (!announcementMigration.includes('CREATE TABLE IF NOT EXISTS public.app_announcements') || !announcementMigration.includes('Public can read current active announcement')) {
  throw new Error('Global announcements require a table with active-only public read policy.');
}
const allMenusStart = html.indexOf('<div id="rasta-all-menus"');
const allMenusEnd = html.indexOf('<div class="modalback"', allMenusStart);
if (allMenusStart < 0 || allMenusEnd < 0) throw new Error('All menus popup must exist.');
const allMenusHtml = html.slice(allMenusStart, allMenusEnd);
const allMenuViews = [...allMenusHtml.matchAll(/data-view="([^"]+)"/g)].map(match => match[1]);
if (new Set(allMenuViews).size !== allMenuViews.length) {
  throw new Error('All menus popup must not list the same destination more than once.');
}


const jalaliAdmin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const announcementWriteMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261026100000_grant_service_role_app_announcements.sql'), 'utf8');
if (!announcementWriteMigration.includes('TO service_role') || !jalaliAdmin.includes('function parseJalaliDate') || !jalaliAdmin.includes('fa-IR-u-ca-persian') || !jalaliAdmin.includes('۱۴۰۵/۰۷/۰۴ ۱۴:۳۰')) {
  throw new Error('Admin announcement writes need service-role grants and Jalali date inputs/formatting.');
}
if (!jalaliAdmin.includes('const parsedGrantExpiry=parseJalaliDate(jalaliExpiry,false)') || !jalaliAdmin.includes('expires_at:parsedExpiry?parsedExpiry.date.toISOString():null')) {
  throw new Error('Admin expiry dates must be converted from Jalali input before sending to the server.');
}


const serviceWorkerForJalali = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!serviceWorkerForJalali.includes("const CACHE_VERSION='v14'")) throw new Error('Service-worker cache must be bumped to ship Jalali dates and admin fixes.');
if (!serviceWorkerForJalali.includes("const CACHE_VERSION='v13'")) throw new Error('A new cache version must force clients to receive the updated admin styles and Persian calendar code.');
if (html.includes("toLocaleDateString('fa-IR')") || html.includes("toLocaleString('fa-IR',{dateStyle")) throw new Error('Visible application dates must explicitly use the Persian calendar.');
