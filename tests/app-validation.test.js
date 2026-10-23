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
console.log('Application validation passed: ' + inlineCount + ' inline scripts, shared core, science engine, and service worker syntax checked.');
