/* Runs every *.test.js in this folder, one after another, and exits non-zero if any fail. */
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  process.stdout.write(`\n=== ${f}\n`);
  try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' }).split('\n').filter(l => /^FAIL|passed$/.test(l)).join('\n') + '\n'); }
  catch (e) { failed++; process.stdout.write((e.stdout || '') + (e.stderr || '')); }
}
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll suites passed'); process.exit(failed ? 1 : 0);
