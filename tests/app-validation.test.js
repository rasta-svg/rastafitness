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
for (const [file, marker] of [['admin.html', "url('./assets/rasta-icon.png?v=20261023')"], ['download.html', "url('./assets/rasta-icon.png?v=20261023')"]]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(marker) || !source.includes('assets/rasta-icon.png?v=20261023')) throw new Error('Requested Rasta logo is not wired into ' + file);
}
if (!html.includes('rasta-icon.png?v=20261023') || !fs.readFileSync(path.join(root, 'manifest.json'), 'utf8').includes('rasta-icon.png?v=20261023')) throw new Error('Main app/PWA icon cache keys are not aligned.');
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
if (!admin.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script>')) {
  throw new Error('Admin refresh timer must run in an inline script, not inside an external script tag.');
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

console.log('Application validation passed: ' + inlineCount + ' inline scripts, shared core, science engine, and service worker syntax checked.');
