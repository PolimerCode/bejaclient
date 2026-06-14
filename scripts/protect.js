const { spawnSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');
const electronPath = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

// Step 1: Compile main + preload to V8 bytecode via Electron runtime
console.log('\n[protect] Compiling main process to bytecode...');
const electronArgs = process.platform === 'linux' ? ['--no-sandbox'] : [];
const result = spawnSync(
  electronPath,
  [...electronArgs, path.join(__dirname, 'compile-bytecode-electron.js')],
  {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, ELECTRON_DISABLE_GPU: '1', ELECTRON_NO_ASAR: '1' },
  }
);
if (result.status !== 0) {
  console.error('[protect] Bytecode compilation failed');
  process.exit(1);
}

// Step 2: Obfuscate renderer JS (skip vendor bundles — open source, no benefit)
console.log('\n[protect] Obfuscating renderer...');

function findJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsFiles(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

const SKIP_PATTERN = /^(vendor|vue-vendor|three)-/;
const distAssets = path.join(root, 'dist', 'assets');
const jsFiles = findJsFiles(distAssets).filter(f => !SKIP_PATTERN.test(path.basename(f)));

for (const file of jsFiles) {
  const code = fs.readFileSync(file, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.3,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
  });
  fs.writeFileSync(file, obfuscated.getObfuscatedCode());
  console.log('[obfuscator]', path.basename(file));
}

console.log('\n[protect] Done. Ready for electron-builder.');
