#!/usr/bin/env node
'use strict'
/**
 * Generates resources/capes/beja-default.png
 * 512x256 Minecraft cape texture (8x standard scale).
 * Black background, BC logo (IMG_2401 3.png) inverted to white on both faces.
 * Run: node scripts/generate-cape.js
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── PNG decoder (no external deps) ────────────────────────────────────────────
function decodePNG(buf) {
  const sig = [137,80,78,71,13,10,26,10]
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a png')

  let off = 8, width, height, colorType
  const idatParts = []

  while (off < buf.length) {
    const len  = buf.readUInt32BE(off); off += 4
    const type = buf.toString('ascii', off, off + 4); off += 4
    const data = buf.subarray(off, off + len); off += len + 4

    if      (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9] }
    else if (type === 'IDAT') { idatParts.push(data) }
    else if (type === 'IEND') { break }
  }

  const ch   = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1
  const raw  = zlib.inflateSync(Buffer.concat(idatParts))
  const rgba = Buffer.alloc(width * height * 4, 0)
  const prev = Buffer.alloc(width * ch, 0)

  let ri = 0
  for (let y = 0; y < height; y++) {
    const ft  = raw[ri++]
    const row = Buffer.from(raw.subarray(ri, ri + width * ch)); ri += width * ch
    const cur = Buffer.alloc(width * ch)

    for (let i = 0; i < width * ch; i++) {
      const a  = i >= ch ? cur[i - ch] : 0
      const b  = prev[i]
      const c  = i >= ch ? prev[i - ch] : 0
      let   v  = row[i]
      if      (ft === 1) v = (v + a) & 0xFF
      else if (ft === 2) v = (v + b) & 0xFF
      else if (ft === 3) v = (v + Math.floor((a + b) / 2)) & 0xFF
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF
      }
      cur[i] = v; prev[i] = v
    }

    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4
      if      (ch === 4) { rgba[pi]=cur[x*4]; rgba[pi+1]=cur[x*4+1]; rgba[pi+2]=cur[x*4+2]; rgba[pi+3]=cur[x*4+3] }
      else if (ch === 3) { rgba[pi]=cur[x*3]; rgba[pi+1]=cur[x*3+1]; rgba[pi+2]=cur[x*3+2]; rgba[pi+3]=255 }
      else               { rgba[pi]=rgba[pi+1]=rgba[pi+2]=cur[x]; rgba[pi+3]=255 }
    }
  }
  return { width, height, pixels: rgba }
}

// ── Bilinear sample ────────────────────────────────────────────────────────────
function sample(pix, w, h, u, v) {
  const fx = Math.max(0, Math.min(w-1, u*(w-1))), fy = Math.max(0, Math.min(h-1, v*(h-1)))
  const x0 = Math.floor(fx), x1 = Math.min(x0+1,w-1)
  const y0 = Math.floor(fy), y1 = Math.min(y0+1,h-1)
  const tx = fx-x0, ty = fy-y0
  const g = (px,py) => { const i=(py*w+px)*4; return [pix[i],pix[i+1],pix[i+2],pix[i+3]] }
  const [p00,p10,p01,p11] = [g(x0,y0),g(x1,y0),g(x0,y1),g(x1,y1)]
  return [0,1,2,3].map(c => Math.round((1-tx)*(1-ty)*p00[c]+tx*(1-ty)*p10[c]+(1-tx)*ty*p01[c]+tx*ty*p11[c]))
}

// ── Scale source → white where opaque+dark (logo strokes), skip everything else
// Source layout: outer margin=transparent, white background=opaque bright,
// BC outline strokes=opaque dark (~11,10,11), inner holes=transparent.
// We want: dark opaque strokes → white on cape. All else → skip (black cape shows).
function processLogo(src, logoSize) {
  const out = Buffer.alloc(logoSize * logoSize * 4, 0)
  for (let ly = 0; ly < logoSize; ly++) {
    for (let lx = 0; lx < logoSize; lx++) {
      const [r,g,b,a] = sample(src.pixels, src.width, src.height, lx/(logoSize-1), ly/(logoSize-1))
      if (a < 128) continue // transparent (outer margin or inner holes) → skip
      const brightness = (0.299*r + 0.587*g + 0.114*b) / 255
      if (brightness > 0.4) continue // bright (white background) → skip
      // dark opaque = logo stroke → white on cape
      const intensity = Math.round((1 - brightness) * 255)
      const i = (ly*logoSize+lx)*4
      out[i]=intensity; out[i+1]=intensity; out[i+2]=intensity; out[i+3]=intensity
    }
  }
  return out
}

// ── Composite logo onto cape buffer ───────────────────────────────────────────
function blit(capeBuf, capeW, logoBuf, logoSize, dx, dy) {
  for (let ly = 0; ly < logoSize; ly++) {
    for (let lx = 0; lx < logoSize; lx++) {
      const li = (ly*logoSize+lx)*4
      const a  = logoBuf[li+3] / 255
      if (a === 0) continue
      const ci = ((dy+ly)*capeW+(dx+lx))*4
      capeBuf[ci]   = Math.round(logoBuf[li]   * a)
      capeBuf[ci+1] = Math.round(logoBuf[li+1] * a)
      capeBuf[ci+2] = Math.round(logoBuf[li+2] * a)
      capeBuf[ci+3] = 255
    }
  }
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function crc32(data) {
  const t = new Uint32Array(256)
  for (let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[i]=c}
  let crc=0xFFFFFFFF
  for (const b of data) crc=t[(crc^b)&0xFF]^(crc>>>8)
  return (crc^0xFFFFFFFF)>>>0
}
function chunk(type, payload) {
  const tb=Buffer.from(type,'ascii'), lb=Buffer.alloc(4), cb=Buffer.alloc(4)
  lb.writeUInt32BE(payload.length); cb.writeUInt32BE(crc32(Buffer.concat([tb,payload])))
  return Buffer.concat([lb,tb,payload,cb])
}
function encodePNG(W, H, buf) {
  const ihdr=Buffer.alloc(13)
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6
  const rows=[]
  for(let y=0;y<H;y++){rows.push(Buffer.alloc(1,0));rows.push(buf.subarray(y*W*4,(y+1)*W*4))}
  const idat=zlib.deflateSync(Buffer.concat(rows),{level:9})
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))])
}

// ── Main ──────────────────────────────────────────────────────────────────────
const srcPath = path.join(__dirname, '..', '..', 'Pictures', 'IMG_2401 3.png')
if (!fs.existsSync(srcPath)) {
  console.error('Source logo not found at:', srcPath)
  process.exit(1)
}

const src     = decodePNG(fs.readFileSync(srcPath))
const W = 512, H = 256
const capeBuf = Buffer.alloc(W * H * 4, 0) // all black, alpha=0
// fill opaque black
for (let i = 3; i < capeBuf.length; i += 4) capeBuf[i] = 255

// 512x256 = 8× standard. Face coords (same as 64x32 × 8):
// Front: x=8,  y=8, w=80, h=128
// Back:  x=96, y=8, w=80, h=128
const faceW = 80, faceH = 128, pad = 6
const logoSize = Math.min(faceW, faceH) - pad * 2  // 68
const offX = Math.floor((faceW - logoSize) / 2)
const offY = Math.floor((faceH - logoSize) / 2)

const logo = processLogo(src, logoSize)
blit(capeBuf, W, logo, logoSize, 8  + offX, 8 + offY)  // front face
blit(capeBuf, W, logo, logoSize, 96 + offX, 8 + offY)  // back face

const outDir  = path.join(__dirname, '../resources/capes')
const outPath = path.join(outDir, 'beja-default.png')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, encodePNG(W, H, capeBuf))
console.log('Cape written to:', outPath)
