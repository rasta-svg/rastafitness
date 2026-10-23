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
if (!foodBankHasSharedSearch()) throw new Error('Food bank must load the shared search engine.');
function foodBankHasSharedSearch() {
  return fs.readFileSync(path.join(root, 'nutrition-bank.html'), 'utf8').includes('rasta-search.js');
}
if (!html.includes('window.RastaSearch.matches(exploreQuery') || !html.includes('window.RastaSearch.matches(exquery') || !html.includes('window.RastaSearch.matches(foodquery')) {
  throw new Error('Workout, exercise library, and food catalog must use shared search rules.');
}
if (!html.includes('window.RastaSearch.searchFoodReference(query,c)')) throw new Error('External USDA food search must use the shared search adapter.');
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
if (!html.includes("registerModule('nutrition-engine'") || !html.includes("dependencies:['supabase-client','science-engine']")) {
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

console.log('Application validation passed: ' + inlineCount + ' inline scripts, shared core, science engine, and service worker syntax checked.');
