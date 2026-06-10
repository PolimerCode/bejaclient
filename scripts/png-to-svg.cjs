const potrace = require('potrace')
const path = require('path')
const fs = require('fs')

const input = path.join(__dirname, '../src/assets/splash-logo.png')
const output = path.join(__dirname, '../src/assets/splash-logo.svg')

potrace.trace(input, {
  threshold: 128,
  turdSize: 10,
  optTolerance: 0.4,
  color: '#F5A623',
  background: 'none',
}, (err, svg) => {
  if (err) { console.error(err); process.exit(1) }
  fs.writeFileSync(output, svg)
  console.log('Written:', output)
  console.log('Size:', fs.statSync(output).size, 'bytes')
})
