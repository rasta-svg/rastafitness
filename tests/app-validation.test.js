'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptTag = /<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi;
let match;
let inlineCount = 0;
while ((match = scriptTag.exec(html)) !== null) {
  const attrs = match[1] || '';
  const source = match[2] || '';
  if (/\\bsrc\\s*=/.test(attrs) || !source.trim()) continue;
  inlineCount++;
  try {
    // Compile only: validate syntax without running browser code or touching user data.
    new Function(source);
  } catch (error) {
    const line = html.slice(0, match.index).split('\\n').length;
    throw new Error('Inline script syntax error near index.html line ' + line + ': ' + error.message);
  }
}
if (inlineCount === 0) throw new Error('No inline JavaScript blocks were validated.');
const engine = fs.readFileSync(path.join(root, 'rasta-science-engine.js'), 'utf8');
new Function(engine);
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
new Function(serviceWorker);
for (const required of ['rasta-science-engine.js', 'version.json']) {
  if (!html.includes(required) && required !== 'version.json') {
    throw new Error('Application is missing expected asset reference: ' + required);
  }
}
console.log('Application validation passed: ' + inlineCount + ' inline scripts, science engine, and service worker syntax checked.');
