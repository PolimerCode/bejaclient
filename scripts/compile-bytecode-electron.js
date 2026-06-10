// Run with Electron binary (not Node) — must match the bundled V8 version.
process.env.ELECTRON_DISABLE_GPU = '1';
const { app } = require('electron');

app.whenReady().then(() => {
  const bytenode = require('bytenode');
  const path = require('path');
  const fs = require('fs');

  const root = path.resolve(__dirname, '..');
  const files = [
    path.join(root, 'dist-electron', 'main', 'index.js'),
    path.join(root, 'dist-electron', 'preload', 'preload.js'),
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error('[bytenode] Missing:', file);
      process.exit(1);
    }
    const jscFile = file.replace(/\.js$/, '.jsc');
    bytenode.compileFile({ filename: file, output: jscFile });
    const stub = `require('bytenode');\nrequire('./${path.basename(jscFile)}');`;
    fs.writeFileSync(file, stub);
    console.log('[bytenode] compiled', path.basename(file));
  }

  app.quit();
});
